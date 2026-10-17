"""Same inputs/labels/metrics for both runs; never promotes an unsealed dataset."""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
import math
import platform
import subprocess
import sys
import time
from pathlib import Path
from services.m7_baseline.engine import ROOT, ServiceError, rank as baseline_rank
from services.m7_baseline.evaluate import evaluate_fixed, lines, read
from scripts.intelligence_phase2.metrics import evaluate
from .hybrid import rank
from .index import VectorIndex
from .model import Encoder, canonical, config, document_text, fingerprint


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def git(*args):
    result = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def percentile(values, fraction):
    return sorted(values)[max(0, math.ceil(len(values) * fraction) - 1)] if values else None


def peak_rss_mib():
    if sys.platform == "win32":
        import ctypes
        from ctypes import wintypes
        class Counters(ctypes.Structure):
            _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD)] + [
                (name, ctypes.c_size_t) for name in ("PeakWorkingSetSize", "WorkingSetSize", "QuotaPeakPagedPoolUsage",
                "QuotaPagedPoolUsage", "QuotaPeakNonPagedPoolUsage", "QuotaNonPagedPoolUsage", "PagefileUsage", "PeakPagefileUsage")]
        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        ctypes.windll.kernel32.GetCurrentProcess.restype = wintypes.HANDLE
        ctypes.windll.psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        ctypes.windll.psapi.GetProcessMemoryInfo.restype = wintypes.BOOL
        if ctypes.windll.psapi.GetProcessMemoryInfo(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
            return counters.PeakWorkingSetSize / 1024 ** 2
    return None


def run(model_dir, output, review_archive=None):
    if output.exists() and any(output.iterdir()):
        raise ValueError("output directory must be empty")
    output.mkdir(parents=True, exist_ok=True)
    fixed = evaluate_fixed(review_archive)
    data = ROOT / "data/m7-phase2/derived"
    products = sorted(lines(data / "products.jsonl"), key=lambda p: int(p["productId"]))
    requests = lines(data / "requests.jsonl")
    dictionary = read(ROOT / "data/m7-phase2/raw/dictionary.json")
    encoder = Encoder(model_dir, dictionary)
    started = time.perf_counter()
    texts = [document_text(p, dictionary) for p in products]
    vectors = encoder.encode(texts)
    first_digest = fingerprint(vectors)
    repeated = encoder.encode(texts)
    repeated_digest = fingerprint(repeated)
    if first_digest != repeated_digest:
        raise RuntimeError("ENCODING_NOT_REPEATABLE")
    load_and_encode_ms = (time.perf_counter() - started) * 1000
    index = VectorIndex(output / "candidate.sqlite", identity=encoder.identity)
    second = VectorIndex(":memory:", identity=encoder.identity)
    try:
        index.rebuild(products, vectors)
        second.rebuild(products, repeated)
        index_digest = index.logical_digest()
        if index_digest != second.logical_digest():
            raise RuntimeError("INDEX_NOT_REPEATABLE")
        per_query, timing, rankings, failures = [], [], {}, []
        for request in requests:
            pool = [p for p in products if p["catalogId"] == request["catalogId"]]
            outcomes = {}
            for name, function in [("baseline", baseline_rank), ("candidate", rank)]:
                clock = time.perf_counter()
                try:
                    kwargs = {} if name == "baseline" else dict(encoder=encoder, index=index, experimental=True)
                    result = function(pool, request, dictionary, **kwargs)
                    outcomes[name] = dict(status="OK", errorCode=None, result=result)
                except ServiceError as exc:
                    if exc.code != "WANTED_INACTIVE":
                        raise
                    outcomes[name] = dict(status="ERROR", errorCode=exc.code, result={"items": []})
                timing.append(dict(requestId=request["requestId"], task=request["task"], algorithm=name,
                                   elapsedMs=(time.perf_counter() - clock) * 1000))
            row = dict(requestId=request["requestId"], **outcomes)
            per_query.append(row)
            rankings[request["requestId"]] = [r["productId"] for r in outcomes["candidate"]["result"]["items"]]
            old = fixed["envelopes"]["all"]["runs"][0]["rankings"][request["requestId"]]
            if old != [r["productId"] for r in outcomes["baseline"]["result"]["items"]]:
                raise RuntimeError("BASELINE_DRIFT")
        for split, envelope in fixed["envelopes"].items():
            document = copy.deepcopy(envelope)
            ids = document["runs"][0]["rankings"]
            document["runs"].append(dict(algorithmVersion=config()["ranking"]["version"],
                                         rankings={rid: rankings[rid] for rid in ids}))
            report = evaluate(document)
            write(output / f"evaluation-input-{split}.json", document)
            write(output / f"metrics-{split}.json", report)
            for row in report["runs"][1]["perRequest"]:
                categories = []
                if row["excludedReason"]:
                    categories.append(row["excludedReason"])
                metric = row["metrics"].get("label>=2@10")
                if metric:
                    if metric["positiveReturnedEmpty"]:
                        categories.append("POSITIVE_NO_RESULT")
                    elif metric["positiveCount"] and metric["reciprocalRank"] < 1:
                        categories.append("POSITIVE_NOT_FIRST")
                    if metric["falseRecommendations"]:
                        categories.append("NO_ANSWER_FALSE_RECOMMENDATIONS")
                if row["hardViolationCount"]:
                    categories.append("HARD_CONSTRAINT_VIOLATION")
                failures.append(dict(split=split, requestId=row["requestId"], categories=categories))
        query_map = {row["requestId"]: row for row in per_query}
        for row in failures:
            outcome = query_map[row["requestId"]]["candidate"]
            if outcome["errorCode"]:
                row["categories"].append(outcome["errorCode"])
            fallback = outcome["result"].get("metadata", {}).get("fallbackReason")
            if fallback:
                row["categories"].append("FALLBACK:" + fallback)
        summary = {}
        for task in ("search", "matching"):
            summary[task] = {}
            for name in ("baseline", "candidate"):
                values = [r["elapsedMs"] for r in timing if r["task"] == task and r["algorithm"] == name]
                summary[task][name] = dict(count=len(values), p95Ms=percentile(values, .95), p99Ms=percentile(values, .99))
        write(output / "per-query.json", per_query)
        write(output / "failure-analysis.json", failures)
        memory = peak_rss_mib()
        write(output / "timings.json", dict(measurement="single process; warmed encoder; one request pass; includes validation and ranking; no concurrency/SLA claim",
                                             modelLoadAndTwoCorpusEncodingsMs=load_and_encode_ms, rows=timing, summary=summary,
                                             peakProcessWorkingSetMiB=memory,
                                             modelArtifactMiB=sum(p.stat().st_size for p in Path(model_dir).iterdir() if p.is_file()) / 1024 ** 2,
                                             indexMiB=(output / "candidate.sqlite").stat().st_size / 1024 ** 2))
        gates = read(ROOT / "contracts/intelligence-phase2/model-gates.candidate.json")
        metric = read(output / "metrics-test_candidate.json")
        comparisons = {}
        for task, capability in (("search", "semantic-search"), ("matching", "supply-demand-matching")):
            threshold = next(g["thresholds"] for g in gates["capabilities"] if g["capability"] == capability)
            before = metric["runs"][0]["byTask"][task]["metrics"]["label>=2@10"]
            after = metric["runs"][1]["byTask"][task]["metrics"]["label>=2@10"]
            improvement = after["mrr"] / before["mrr"] - 1 if before["mrr"] else None
            comparisons[task] = dict(candidateThresholdsOnly=True, baselineMrrAt10=before["mrr"], candidateMrrAt10=after["mrr"],
                                     relativeMrrImprovement=improvement, requiredRelativeMrrImprovement=threshold["relativeMrrImprovementMin"],
                                     mrrImprovementPass=improvement is not None and improvement >= threshold["relativeMrrImprovementMin"],
                                     recallAt10=after["recall"], requiredRecallAt10=threshold["recallAt10Min"])
            if task == "search":
                precision = metric["runs"][1]["byTask"][task]["metrics"]["label>=2@5"]["precision"]
                comparisons[task].update(precisionAt5=precision, requiredPrecisionAt5=threshold["precisionAt5Min"],
                                         precisionPass=precision >= threshold["precisionAt5Min"] if precision is not None else False)
        status = dict(status="DIAGNOSTIC_ONLY", formalDecision="NO_GO", modelInferenceExecuted=True,
                      labelReview=fixed["labelReview"], datasetVersion=read(data / "manifest.json")["datasetVersion"],
                      frozenEvaluationCompleted=False,
                      candidateThresholdComparison=comparisons,
                      candidateFallbackCount=sum(bool(row["candidate"]["result"].get("metadata", {}).get("degraded")) for row in per_query),
                      blockers=["evaluation dataset not sealed", "structured review archive pending" if review_archive is None else "review archive not formally sealed",
                                "12 test_candidate requests below required 100; slices below 30", "environment and thresholds not signed", "M10/M1 approval pending",
                                "strict-label candidate MRR relative improvement below 10%; search precision@5 below candidate 0.70"],
                      parametersTunedOnTestLabels=False, ranking=config()["ranking"], encoderIdentity=encoder.identity,
                      productCount=len(products), requestCount=len(requests), embeddingDimension=512,
                      encodingRepeatedExactly=True, vectorsSha256=first_digest, repeatedVectorsSha256=repeated_digest,
                      indexLogicalDigest=index_digest, indexRebuildRepeatedExactly=True,
                      codeCommit=git("rev-parse", "HEAD"), workingTreeDirty=bool(git("status", "--porcelain", "--untracked-files=no")),
                      trackedChangesOnly=True, checkedAtUtc=datetime.now(timezone.utc).isoformat(),
                      environment=dict(python=platform.python_version(), os=platform.platform(), machine=platform.machine()),
                      command=["python", "-m", "services.m7_semantic.evaluate", "--model-dir", "<pinned-local-model>", "--output-dir", "<empty-directory>"],
                      sourceHashes={p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                                    for directory in ("services/m7_semantic", "services/m7_baseline", "data/m7-phase2", "schemas/m7-phase2", "scripts/intelligence_phase2", "docs/evidence/phase-4/intelligence")
                                    for p in sorted((ROOT / directory).rglob("*")) if p.is_file() and "__pycache__" not in p.parts and "evidence" not in p.relative_to(ROOT / directory).parts})
        write(output / "evaluation-status.json", status)
        return status
    finally:
        index.close()
        second.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--review-archive", type=Path)
    args = parser.parse_args()
    result = run(args.model_dir, args.output_dir, args.review_archive)
    print(json.dumps({k: result[k] for k in ("status", "formalDecision", "requestCount", "encodingRepeatedExactly", "indexRebuildRepeatedExactly")}))


if __name__ == "__main__":
    main()
