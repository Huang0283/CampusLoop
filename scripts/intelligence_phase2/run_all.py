"""Read-only joint checks: technical PASS never implies model GO."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parents[2]
STEPS = [
    ("m7-data-tests", ["-m", "unittest", "discover", "-s", "scripts/m7_phase2", "-p", "test_pipeline.py", "-v"]),
    ("m7-contract-tests", ["-m", "unittest", "discover", "-s", "scripts/m7_phase2", "-p", "test_contracts.py", "-v"]),
    ("m7-examples", ["scripts/m7_phase2/contract_check.py"]),
    ("m7-rebuild", ["scripts/m7_phase2/pipeline.py", "verify"]),
    ("m8-data-tests", ["-m", "unittest", "discover", "-s", "scripts/m8_phase2", "-p", "test_pipeline.py", "-v"]),
    ("m8-contract-tests", ["-m", "unittest", "discover", "-s", "scripts/m8_phase2", "-p", "test_contracts.py", "-v"]),
    ("m8-examples", ["scripts/m8_phase2/contract_check.py"]),
    ("m8-readonly-rebuild", ["scripts/intelligence_phase2/asset_check.py"]),
    ("joint-tests", ["-m", "unittest", "discover", "-s", "scripts/intelligence_phase2", "-p", "test_joint.py", "-v"]),
    ("ranking-formula", ["scripts/intelligence_phase2/metrics.py", "--input",
                         "contracts/intelligence-phase2/ranking-formula-fixture.json"]),
    ("model-gate-registration", ["scripts/intelligence_phase2/gate_check.py"]),
]


def asset_hashes():
    paths = []
    for path in ("data/m7-phase2", "data/m8-phase2", "schemas/m7-phase2", "schemas/m8-phase2",
                 "contracts/m7-phase2", "contracts/m8-phase2", "contracts/intelligence-phase2",
                 "scripts/m7_phase2", "scripts/m8_phase2", "scripts/intelligence_phase2"):
        paths.extend(p for p in (ROOT / path).rglob("*") if p.is_file()
                     and "__pycache__" not in p.parts and p.suffix != ".pyc")
    paths.append(ROOT / ".gitattributes")
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(paths)}


def git_value(arguments):
    result = subprocess.run(["git", *arguments], cwd=ROOT, text=True, capture_output=True)
    return result.stdout.strip() if result.returncode == 0 else None


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def clean_log(value):
    for path, replacement in ((str(ROOT), "<repo>"), (sys.base_prefix, "<python>"),
                              (str(Path.home()), "<user>")):
        value = value.replace(path, replacement).replace(path.replace("\\", "/"), replacement)
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--step-timeout-seconds", type=int, default=60)
    args = parser.parse_args()
    if args.step_timeout_seconds <= 0:
        parser.error("step timeout must be positive")
    if args.output_dir and args.output_dir.exists() and any(args.output_dir.iterdir()):
        parser.error("output directory must be empty; preserve previous evidence")
    started = time.monotonic()
    before = asset_hashes()
    record = {
        "runVersion": "intelligence-joint-run-v1.1",
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "codeCommit": git_value(["rev-parse", "HEAD"]),
        "workingTreeDirty": bool(git_value(["status", "--porcelain"])),
        "sourceHashes": before,
        "environment": {"os": platform.system(), "osRelease": platform.release(),
                        "python": platform.python_version(), "machine": platform.machine(),
                        "cpuLogicalCount": os.cpu_count()},
        "command": ["python", "scripts/intelligence_phase2/run_all.py",
                    "--step-timeout-seconds", str(args.step_timeout_seconds)],
        "status": "PASS", "results": [],
    }
    if args.output_dir:
        try:
            recorded_dir = args.output_dir.resolve().relative_to(ROOT).as_posix()
        except ValueError:
            recorded_dir = "<external-output-directory>"
        record["command"].extend(["--output-dir", recorded_dir])
    environment = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1")
    for name, arguments in STEPS:
        begin = time.monotonic()
        result = {"name": name, "command": ["python", *arguments]}
        try:
            completed = subprocess.run([sys.executable, *arguments], cwd=ROOT, env=environment,
                                       encoding="utf-8", capture_output=True,
                                       timeout=args.step_timeout_seconds)
            result.update(exitCode=completed.returncode, stdout=clean_log(completed.stdout),
                          stderr=clean_log(completed.stderr))
        except (subprocess.TimeoutExpired, OSError, UnicodeError) as exc:
            result.update(exitCode=2, stdout="", stderr=clean_log(str(exc)))
        result["durationSeconds"] = round(time.monotonic() - begin, 3)
        record["results"].append(result)
        expected_codes = [0, 3] if name == "model-gate-registration" else [0]
        result["acceptedExitCodes"] = expected_codes
        if result["exitCode"] not in expected_codes:
            record["status"] = "FAIL"
            break
        if name == "model-gate-registration":
            record["gateRegistration"] = json.loads(result["stdout"])
    record["assetsUnchanged"] = before == asset_hashes()
    if not record["assetsUnchanged"]:
        record["status"] = "FAIL"
    try:
        summary = read("data/m7-phase2/derived/summary.json")
        m7 = read("data/m7-phase2/derived/manifest.json")
        m8 = read("data/m8-phase2/derived/manifest.json")
        record["dataReadiness"] = {
        "m7": {"datasetVersion": m7["datasetVersion"], "seed": m7["seed"],
               "humanReviewedPairs": summary["humanReviewedPairs"],
               "pendingHumanReviewPairs": summary["pendingHumanReviewPairs"],
               "modelEffect": "NOT_EVALUATED", "serviceRankings": "NOT_AVAILABLE_IN_PHASE2"},
        "m8": {"datasetVersion": m8["datasetVersion"], "eligibleL3Count": m8["eligibleL3Count"],
               "ruleMetrics": read("data/m8-phase2/derived/metrics.json"),
               "modelEffect": "NOT_EVALUATED"},
        }
    except (OSError, ValueError, TypeError, KeyError) as exc:
        record["status"] = "FAIL"
        record["readinessError"] = clean_log(str(exc))
    record["acceptance"] = "AUTHOR_TECHNICAL_CHECK_ONLY; M10 independent acceptance pending"
    record["endedAt"] = datetime.now(timezone.utc).isoformat()
    record["durationSeconds"] = round(time.monotonic() - started, 3)
    if args.output_dir:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        for result in record["results"]:
            for stream in ("stdout", "stderr"):
                (args.output_dir / f"{result['name']}.{stream}.txt").write_text(
                    result[stream], encoding="utf-8", newline="\n")
        (args.output_dir / "run-record.json").write_text(
            json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
            encoding="utf-8", newline="\n")
    print(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if record["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
