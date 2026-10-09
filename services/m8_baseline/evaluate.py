"""Run fixed Phase 3 cases and write deterministic rule-only evidence."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .engine import evaluate

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / "contracts/m8-phase3/fixed-cases.json"


def _contains(actual, expected):
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(key in actual and _contains(actual[key], value) for key, value in expected.items())
    if isinstance(expected, list):
        return actual == expected
    return actual == expected


def run(cases_path=CASES):
    cases = json.loads(Path(cases_path).read_text(encoding="utf-8"))
    results = []
    for case in cases["cases"]:
        output = evaluate(case["task"], case["input"])
        passed = _contains(output, case["expected"])
        results.append({"caseId": case["caseId"], "task": case["task"], "passed": passed, "output": output})
    task_counts = {}
    for task in ("price", "trust", "risk"):
        selected = [item for item in results if item["task"] == task]
        task_counts[task] = {"caseCount": len(selected), "passed": sum(item["passed"] for item in selected)}
    return {
        "evaluationVersion": "m8-rule-baseline-eval-v1",
        "datasetVersion": cases["datasetVersion"],
        "evaluationType": "RULE_ONLY_VALIDATION",
        "labeledPredictionMetrics": "NOT_EVALUATED",
        "reason": "Fixed cases validate rule behavior and boundaries; no eligible L3 completed-transaction labels exist.",
        "summary": {"caseCount": len(results), "passed": sum(item["passed"] for item in results), "byTask": task_counts},
        "results": results,
    }


def write(output: Path):
    result = run()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
    if result["summary"]["passed"] != result["summary"]["caseCount"]:
        raise SystemExit(1)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(write(args.output)["summary"], ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
