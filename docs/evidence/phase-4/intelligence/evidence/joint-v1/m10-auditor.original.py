"""Recalculate submitted ranking metrics and archive independent diagnostic evidence."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
from statistics import mean


def strict_check(document, reported):
    """Independent formula check, without calling the author's calculator."""
    labels = {row["requestId"]: row for row in document["requests"]}
    for run, report in zip(document["runs"], reported["runs"], strict=True):
        for task in ("search", "matching"):
            values = []
            for rid, row in labels.items():
                if row["task"] != task or row["excludedReason"] or any(item["label"] == "U" for item in row["labels"]):
                    continue
                positive = {item["productId"] for item in row["labels"] if item["label"] == 2}
                if not positive:
                    continue
                ordered = list(dict.fromkeys(run["rankings"][rid]))
                relevant = [index + 1 for index, item in enumerate(ordered[:10]) if item in positive]
                values.append((1 / min(relevant) if relevant else 0, len(positive.intersection(ordered[:10])) / len(positive), len(positive.intersection(ordered[:5])) / 5))
            if values:
                expected = report["byTask"][task]["metrics"]
                actual = (mean(row[0] for row in values), mean(row[1] for row in values), mean(row[2] for row in values))
                saved = (expected["label>=2@10"]["mrr"], expected["label>=2@10"]["recall"], expected["label>=2@5"]["precision"])
                if any(abs(left - right) > 1e-12 for left, right in zip(actual, saved, strict=True)):
                    raise ValueError("independent strict formula mismatch: " + task)


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--first", type=Path, required=True)
    parser.add_argument("--repeat", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    candidate = args.candidate.resolve()
    head = subprocess.check_output(["git", "-C", str(candidate), "rev-parse", "HEAD"], text=True).strip()
    status = read(args.first / "evaluation-status.json")
    repeated = read(args.repeat / "evaluation-status.json")
    if head != status["codeCommit"] or head != repeated["codeCommit"]:
        raise ValueError("candidate identity mismatch")
    for relative, digest in status["sourceHashes"].items():
        if hashlib.sha256((candidate / relative).read_bytes()).hexdigest() != digest:
            raise ValueError("source drift: " + relative)
    spec = importlib.util.spec_from_file_location("ranking_metrics", candidate / "scripts/intelligence_phase2/metrics.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    outputs = {}
    checks = {}
    for split in ("all", "dev", "test_candidate"):
        input_name = f"evaluation-input-{split}.json"
        metrics_name = f"metrics-{split}.json"
        original = read(args.first / input_name)
        calculated = module.evaluate(original)
        if calculated != read(args.first / metrics_name):
            raise ValueError("metric mismatch: " + split)
        strict_check(original, calculated)
        outputs[input_name] = original
        outputs[metrics_name] = calculated
        checks[split] = {"metricsRecalculated": True, "independentStrictFormulasChecked": True, "requestCount": len(original["requests"])}
    for name in ("per-query.json", "failure-analysis.json"):
        outputs[name] = read(args.first / name)
    for name, value in outputs.items():
        if value != read(args.repeat / name):
            raise ValueError("repeat mismatch: " + name)
    for field in ("encoderIdentity", "indexLogicalDigest", "vectorsSha256", "formalDecision"):
        if status[field] != repeated[field]:
            raise ValueError("stable identity mismatch: " + field)
    outputs["evaluation-status.json"] = status
    outputs["timings.json"] = read(args.first / "timings.json")
    args.output.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for name, value in outputs.items():
        content = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n"
        (args.output / name).write_text(content, encoding="utf-8", newline="\n")
        hashes[name] = hashlib.sha256(content.encode("utf-8")).hexdigest()
    record = {"verification": "PASS", "candidateCommit": head, "independentExecution": "Codex on M10 request; not a human signature", "metrics": checks, "deterministicRankingRepeated": True, "sourceHashesVerified": True, "formalDecision": status["formalDecision"], "freezeApproved": False, "archiveHashes": hashes}
    (args.output / "independent-check.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(record, ensure_ascii=False))


if __name__ == "__main__":
    main()
