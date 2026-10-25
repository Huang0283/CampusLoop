"""Run M6 checks and retain raw evidence; require-integration rejects skips/xfails.

Run with the backend environment's Python, from any directory.
Never starts infrastructure, resets a database, or invents release approval.
"""

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs/evidence/phase-5/backend-platform/evidence"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-integration", action="store_true")
    args = parser.parse_args()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    checks = [
        ("ruff", [sys.executable, "-m", "ruff", "check", "."], ROOT / "backend"),
        (
            "format",
            [sys.executable, "-m", "ruff", "format", "--check", "."],
            ROOT / "backend",
        ),
        (
            "backend",
            [
                sys.executable,
                "-m",
                "pytest",
                "-ra",
                "--junitxml=" + str(EVIDENCE / "m6-backend-tests.xml"),
            ],
            ROOT / "backend",
        ),
        ("contract", [sys.executable, "scripts/m6_phase2/check_contract.py"], ROOT),
        (
            "m7",
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                "services/m7_baseline/tests",
                "-v",
            ],
            ROOT,
        ),
        (
            "m8",
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                "services/m8_baseline/tests",
                "-v",
            ],
            ROOT,
        ),
    ]
    results = []
    for name, command, cwd in checks:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        (EVIDENCE / f"m6-{name}.log").write_text(
            completed.stdout + completed.stderr, encoding="utf-8"
        )
        results.append(
            {
                "check": name,
                "command": command,
                "cwd": str(cwd),
                "exitCode": completed.returncode,
            }
        )
        print(f"{name}: exit={completed.returncode}", flush=True)
    report = ET.parse(EVIDENCE / "m6-backend-tests.xml").getroot()
    skipped = len(report.findall(".//testcase/skipped"))
    summary = {
        "python": sys.version.split()[0],
        "checks": results,
        "pytestSkippedIncludingXfail": skipped,
        "integrationAccepted": skipped == 0
        and all(r["exitCode"] == 0 for r in results),
        "note": "Unit/schema success does not replace DB tests or independent reviewer signoff.",
    }
    (EVIDENCE / "m6-check-summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    if any(r["exitCode"] != 0 for r in results):
        return 1
    if args.require_integration and skipped:
        print(
            f"NOT ACCEPTED: {skipped} skipped/xfail cases; provide test services and integrate upstream."
        )
        return 2
    print(f"Local checks complete; skipped/xfail={skipped}; see evidence logs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
