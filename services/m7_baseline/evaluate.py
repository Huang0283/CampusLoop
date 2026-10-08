"""Fixed historical diagnostic evaluation, never sealed human ground truth."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from scripts.intelligence_phase2.metrics import evaluate
from .engine import ROOT, ServiceError, rank
from .review_archive import load_review_archive


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def lines(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def evaluate_fixed(review_archive=None):
    data = ROOT / "data/m7-phase2/derived"
    manifest = read(data / "manifest.json")
    for relative, expected in manifest["derivedHashes"].items():
        if hashlib.sha256((data / relative).read_bytes()).hexdigest() != expected:
            raise ServiceError(503, "DATASET_HASH_MISMATCH")
    products = lines(data / "products.jsonl")
    requests = lines(data / "requests.jsonl")
    labels = lines(data / "labels.draft.jsonl")
    review = dict(status="STRUCTURED_RECORDS_PENDING", labelSource="PENDING_HUMAN_REVIEW",
                  labelVersion=manifest["labelVersion"], humanReviewedPairs=0,
                  testSetSealed=False, archiveManifestSha256=None)
    if review_archive is not None:
        labels, review = load_review_archive(review_archive)
    dictionary = read(ROOT / "data/m7-phase2/raw/dictionary.json")
    if hashlib.sha256((ROOT / "data/m7-phase2/raw/dictionary.json").read_bytes()).hexdigest() != manifest["sourceHashes"]["dictionary.json"]:
        raise ServiceError(503, "DICTIONARY_HASH_MISMATCH")
    exclusions = {row["requestId"]: row["reason"] for row in read(data / "exclusions.json")}
    envelope = dict(schemaVersion="intelligence-ranking-eval-v1", datasetVersion=manifest["datasetVersion"],
                    labelVersion=review["labelVersion"], snapshotVersion="m7-historical-asof-20260926",
                    splitVersion="m7-catalog-split-v1", labelSource=review["labelSource"],
                    candidateScope="COMPLETE_CATALOG_POOL", kValues=[1, 5, 10], requests=[],
                    runs=[dict(algorithmVersion="m7-keyword-v0+match-v0", rankings={})])
    per_query = []
    for request in requests:
        judgments = []
        for label in labels:
            if label["requestId"] != request["requestId"]:
                continue
            judgments.append(dict(productId=label["productId"], label=label["label"],
                                  failedConstraints=[c["code"] for c in label["constraints"] if c["outcome"] == "fail"],
                                  unknownConstraints=[c["code"] for c in label["constraints"] if c["outcome"] == "unknown"]))
        envelope["requests"].append(dict(requestId=request["requestId"], task=request["task"], labels=judgments,
                                         excludedReason=exclusions.get(request["requestId"])))
        pool = [p for p in products if p["catalogId"] == request["catalogId"]]
        error = None
        try:
            result = rank(pool, request, dictionary)
        except ServiceError as exc:
            if exc.code != "WANTED_INACTIVE":
                raise
            result, error = {"items": []}, exc.code
        envelope["runs"][0]["rankings"][request["requestId"]] = [item["productId"] for item in result["items"]]
        per_query.append(dict(requestId=request["requestId"], task=request["task"], catalogId=request["catalogId"],
                              status="ERROR" if error else "OK", errorCode=error, result=result))
    metrics, envelopes = {}, {}
    for split in ("all", "dev", "test_candidate"):
        document = copy.deepcopy(envelope)
        if split != "all":
            ids = set(read(data / f"splits/{split}.json")["requestIds"])
            document["requests"] = [r for r in document["requests"] if r["requestId"] in ids]
            document["runs"][0]["rankings"] = {k: v for k, v in document["runs"][0]["rankings"].items() if k in ids}
        document["splitVersion"] += ":" + split
        metrics[split] = evaluate(document)
        envelopes[split] = document
    return dict(status="DIAGNOSTIC_ONLY", humanReviewedPairs=review["humanReviewedPairs"],
                labelSource=review["labelSource"], labelReview=review,
                perQuery=per_query, metrics=metrics, envelopes=envelopes,
                scope="six-product complete catalog pools; historical synthetic snapshots; not live full-corpus recall")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--review-archive", type=Path)
    args = parser.parse_args()
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        parser.error("output directory must be empty")
    result = evaluate_fixed(review_archive=args.review_archive)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    def write(name, value):
        (args.output_dir / name).write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
    write("per-query.json", result["perQuery"])
    for split in result["metrics"]:
        write(f"metrics-{split}.json", result["metrics"][split])
        write(f"evaluation-input-{split}.json", result["envelopes"][split])
    write("evaluation-status.json", {k: v for k, v in result.items() if k not in {"perQuery", "metrics", "envelopes"}})
    print(json.dumps({"status": result["status"], "requestCount": len(result["perQuery"]),
                      "humanReviewedPairs": result["humanReviewedPairs"], "labelSource": result["labelSource"]}))


if __name__ == "__main__":
    main()
