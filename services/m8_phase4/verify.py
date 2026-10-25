"""Run M8 Phase 4 tests and produce reproducible evidence plus dev latency."""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from .evaluate import write
from .readiness import ROOT, inspect
from .router import route_price


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _percentile(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int((len(ordered) - 1) * percentile))]


def _benchmark(readiness: dict) -> dict:
    payload = {
        "category": "digital", "condition": "good", "originalPriceFen": 600000,
        "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": [],
    }
    samples = []
    for _ in range(200):
        start = time.perf_counter_ns()
        result = route_price(payload, readiness, candidate_enabled=True)
        samples.append((time.perf_counter_ns() - start) / 1_000_000)
        if result["selectedEngine"] != "PHASE3_RULE_BASELINE":
            raise AssertionError("NO_GO route did not fall back")
    return {
        "status": "DEV_DIAGNOSTIC_NOT_SLA_EVIDENCE",
        "route": "NO_GO_TO_PHASE3_RULE_BASELINE",
        "iterations": len(samples),
        "p50Ms": round(_percentile(samples, 0.50), 3),
        "p95Ms": round(_percentile(samples, 0.95), 3),
        "p99Ms": round(_percentile(samples, 0.99), 3),
        "environment": {"python": platform.python_version(), "platform": platform.platform()},
        "note": "Candidate latency is not measurable because training is forbidden; M10 must repeat in the frozen environment.",
    }


def verify(output_dir: Path, source_commit: str) -> dict:
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError("output directory must be empty; use a new acceptance directory")
    output_dir.mkdir(parents=True, exist_ok=True)
    suites = {}
    for name, directory in (
        ("phase2", "scripts/m8_phase2"),
        ("phase3", "services/m8_baseline/tests"),
        ("phase4", "services/m8_phase4/tests"),
    ):
        command = [sys.executable, "-m", "unittest", "discover", "-s", directory, "-p", "test_*.py", "-v"]
        test = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        log = test.stdout + test.stderr
        filename = name + "-tests.txt"
        (output_dir / filename).write_text(log, encoding="utf-8", newline="\n")
        count = re.search(r"Ran (\d+) tests?", log)
        suites[name] = {
            "command": command[1:], "returnCode": test.returncode,
            "testCount": int(count.group(1)) if count else 0,
            "status": "PASS" if test.returncode == 0 and count and int(count.group(1)) > 0 else "FAIL",
            "log": filename, "logHash": _sha(output_dir / filename),
        }
    failed = [name for name, result in suites.items() if result["status"] != "PASS"]
    if failed:
        (output_dir / "failed-run.json").write_text(
            json.dumps({"sourceCommit": source_commit, "suites": suites, "failed": failed}, indent=2) + "\n",
            encoding="utf-8", newline="\n",
        )
        raise RuntimeError("M8 regression failed: " + ", ".join(failed) + "; inspect the saved logs")
    with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
        first_path, second_path = Path(first), Path(second)
        write(first_path)
        write(second_path)
        names = ["readiness.json", "price-comparison.json", "trust-risk-evaluation.json"]
        deterministic = all(_sha(first_path / name) == _sha(second_path / name) for name in names)
        if not deterministic:
            raise AssertionError("evidence is not deterministic")
        for name in names:
            shutil.copyfile(first_path / name, output_dir / name)
    readiness = inspect()
    latency = _benchmark(readiness)
    (output_dir / "latency-dev.json").write_text(
        json.dumps(latency, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    source_paths = sorted({
        path for directory in ("services/m8_baseline", "services/m8_phase4", "scripts/m8_phase2")
        for path in (ROOT / directory).rglob("*.py")
    } | set((ROOT / "contracts/m8-phase4").glob("*.json"))
      | set((ROOT / "schemas/m8-phase4").glob("*.json"))
      | {ROOT / "data/m8-phase4/authorization-status.json"})
    run_record = {
        "verificationVersion": "m8-phase4-verification-v2",
        "sourceCommit": source_commit,
        "decision": readiness["decision"],
        "deterministic": deterministic,
        "seed": None,
        "dependencies": "Python standard library only",
        "parameters": {"candidateEnabled": True, "candidateTimeoutMs": 300},
        "environment": {"python": platform.python_version(), "platform": platform.platform()},
        "testsReturnCode": 0,
        "suites": suites,
        "sourceHashes": {path.relative_to(ROOT).as_posix(): _sha(path) for path in source_paths},
        "outputHashes": {name: _sha(output_dir / name) for name in (
            "readiness.json", "price-comparison.json", "trust-risk-evaluation.json", "latency-dev.json",
            "phase2-tests.txt", "phase3-tests.txt", "phase4-tests.txt"
        )},
    }
    (output_dir / "run-record.json").write_text(
        json.dumps(run_record, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    return run_record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--source-commit", required=True)
    args = parser.parse_args()
    print(json.dumps(verify(args.output_dir, args.source_commit), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
