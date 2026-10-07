"""Ranking metric skeleton: explicit common labels, never inferred ground truth."""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
from statistics import mean


class EvaluationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise EvaluationError(message)


def average(values):
    return mean(values) if values else None


def evaluate(document):
    require(isinstance(document, dict), "evaluation must be an object")
    fields = {"schemaVersion", "datasetVersion", "labelVersion", "snapshotVersion",
              "splitVersion", "labelSource", "candidateScope", "kValues", "requests", "runs"}
    require(set(document) == fields, "evaluation fields mismatch")
    require(document["schemaVersion"] == "intelligence-ranking-eval-v1", "schema version mismatch")
    for name in ("datasetVersion", "labelVersion", "snapshotVersion", "splitVersion"):
        require(isinstance(document[name], str) and bool(document[name].strip()), f"{name} required")
    # Phase 2 accepts only diagnostic labels. Human-reviewed performance requires
    # a separate, sealed label adapter and review records in Phase 3/4.
    require(document["labelSource"] in {"SYNTHETIC_FORMULA_FIXTURE", "PENDING_HUMAN_REVIEW"},
            "Phase 2 calculator accepts diagnostic labels only")
    require(document["candidateScope"] in {"COMPLETE_CATALOG_POOL", "FULL_CORPUS"}, "candidateScope required")
    ks = document["kValues"]
    require(isinstance(ks, list) and ks and all(type(k) is int and k > 0 for k in ks)
            and len(ks) == len(set(ks)), "kValues must be unique positive integers")
    requests = document["requests"]
    runs = document["runs"]
    require(isinstance(requests, list) and requests, "empty request dataset")
    require(isinstance(runs, list) and runs, "no ranking runs")
    by_id = {}
    for request in requests:
        require(isinstance(request, dict) and set(request) == {
            "requestId", "task", "labels", "excludedReason"}, "request fields mismatch")
        rid = request["requestId"]
        require(isinstance(rid, str) and rid and rid not in by_id, "duplicate/invalid requestId")
        require(request["task"] in {"search", "matching"}, "invalid task")
        require(request["excludedReason"] is None or
                (isinstance(request["excludedReason"], str) and request["excludedReason"].strip()),
                "invalid exclusion reason")
        labels = request["labels"]
        require(isinstance(labels, list) and labels, f"{rid}: empty labels")
        products = {}
        for label in labels:
            require(isinstance(label, dict) and set(label) == {
                "productId", "label", "failedConstraints", "unknownConstraints"}, "label fields mismatch")
            pid = label["productId"]
            require(isinstance(pid, str) and pid and pid not in products, "duplicate/invalid productId")
            grade = label["label"]
            require(type(grade) is int and grade in {0, 1, 2} or grade == "U", "invalid label")
            for name in ("failedConstraints", "unknownConstraints"):
                codes = label[name]
                require(isinstance(codes, list) and all(isinstance(c, str) and c for c in codes)
                        and len(codes) == len(set(codes)), "invalid constraint codes")
            require(not label["failedConstraints"] or grade == 0,
                    "hard-constraint failure must have label zero")
            require(not label["unknownConstraints"] or label["failedConstraints"] or grade == "U",
                    "unknown eligibility must remain U")
            products[pid] = label
        by_id[rid] = (request, products)
    run_names = set()
    reports = []
    for run in runs:
        require(isinstance(run, dict) and set(run) == {"algorithmVersion", "rankings"}, "run fields mismatch")
        version = run["algorithmVersion"]
        require(isinstance(version, str) and version and version not in run_names, "duplicate/invalid algorithmVersion")
        run_names.add(version)
        rankings = run["rankings"]
        require(isinstance(rankings, dict) and set(rankings) == set(by_id),
                "every run must cover the same complete request set")
        rows = []
        for rid, (request, products) in sorted(by_id.items()):
            returned = rankings[rid]
            require(isinstance(returned, list) and all(isinstance(p, str) for p in returned), "invalid ranking")
            require(set(returned) <= set(products), f"{rid}: returned product has no label/constraint judgment")
            ranked = list(dict.fromkeys(returned))
            reason = request["excludedReason"]
            if any(p["label"] == "U" for p in products.values()):
                reason = reason or "UNRESOLVED_U_ENTIRE_REQUEST"
            violations = Counter(c for pid in ranked for c in products[pid]["failedConstraints"])
            row = {"requestId": rid, "task": request["task"], "excludedReason": reason,
                   "returnedProductIds": ranked, "duplicatesRemoved": len(returned) - len(ranked),
                   "returnedCount": len(ranked),
                   "hardViolationCount": sum(bool(products[p]["failedConstraints"]) for p in ranked),
                   "hardViolationByConstraint": dict(sorted(violations.items())),
                   "unknownEligibilityCount": sum(bool(products[p]["unknownConstraints"]) for p in ranked),
                   "metrics": {}}
            # Audit all returned items, including excluded requests; do not hide
            # correctness failures by excluding a relevance benchmark request.
            if reason is None:
                for threshold in (2, 1):
                    positive = {pid for pid, p in products.items() if type(p["label"]) is int
                                and p["label"] >= threshold}
                    for k in ks:
                        top = ranked[:k]
                        hits = len(set(top) & positive)
                        first = next((i for i, pid in enumerate(top, 1) if pid in positive), None)
                        row["metrics"][f"label>={threshold}@{k}"] = {
                            "positiveCount": len(positive),
                            "precision": hits / k if positive else None,
                            "recall": hits / len(positive) if positive else None,
                            "reciprocalRank": (1 / first if first else 0.0) if positive else None,
                            "noAnswerEmpty": not ranked if not positive else None,
                            "falseRecommendations": len(ranked) if not positive else None,
                            "positiveReturnedEmpty": not ranked if positive else None}
            rows.append(row)
        summaries = {}
        for task in sorted({r["task"] for r in rows}):
            subset = [r for r in rows if r["task"] == task]
            comparable = [r for r in subset if r["excludedReason"] is None]
            count = sum(r["returnedCount"] for r in subset)
            bad = sum(r["hardViolationCount"] for r in subset)
            summary = {"requestCount": len(subset), "excludedRequestCount": len(subset) - len(comparable),
                       "returnedCount": count, "hardViolationCount": bad,
                       "hardViolationRate": bad / count if count else None, "metrics": {}}
            for threshold in (2, 1):
                for k in ks:
                    key = f"label>={threshold}@{k}"
                    values = [r["metrics"][key] for r in comparable]
                    positives = [v for v in values if v["positiveCount"] > 0]
                    empty = [v for v in values if v["positiveCount"] == 0]
                    summary["metrics"][key] = {
                        "positiveRequestCount": len(positives), "noAnswerRequestCount": len(empty),
                        "precision": average([v["precision"] for v in positives]),
                        "recall": average([v["recall"] for v in positives]),
                        "mrr": average([v["reciprocalRank"] for v in positives]),
                        "positiveEmptyRate": average([int(v["positiveReturnedEmpty"]) for v in positives]),
                        "noAnswerEmptyAccuracy": average([int(v["noAnswerEmpty"]) for v in empty]),
                        "falseRecommendationCount": sum(v["falseRecommendations"] for v in empty)}
            summaries[task] = summary
        reports.append({"algorithmVersion": version, "byTask": summaries, "perRequest": rows})
    return {"status": "DIAGNOSTIC_ONLY", "modelEffectEvaluated": False,
            "metricVersion": "ranking-metrics-v1", "recallScope": document["candidateScope"],
            "metadata": {k: document[k] for k in fields - {"requests", "runs"}}, "runs": reports}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = evaluate(json.loads(args.input.read_text(encoding="utf-8")))
        output = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
        if args.output:
            require(not args.output.exists(), "output already exists; preserve previous evidence")
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output, encoding="utf-8", newline="\n")
        else:
            print(output, end="")
        return 0
    except (EvaluationError, OSError, ValueError, TypeError) as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
