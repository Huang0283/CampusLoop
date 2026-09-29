"""Run the Phase 2 intelligence data, contract, and negative-input checks."""
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
COMMANDS = [
    [sys.executable, "-m", "unittest", "discover", "-s", "scripts/m7_phase2", "-p", "test_pipeline.py", "-v"],
    [sys.executable, "-m", "unittest", "discover", "-s", "scripts/m7_phase2", "-p", "test_contracts.py", "-v"],
    [sys.executable, "scripts/m7_phase2/contract_check.py"],
    [sys.executable, "scripts/m7_phase2/pipeline.py", "verify"],
    [sys.executable, "-m", "unittest", "discover", "-s", "scripts/m8_phase2", "-p", "test_pipeline.py", "-v"],
    [sys.executable, "-m", "unittest", "discover", "-s", "scripts/m8_phase2", "-p", "test_contracts.py", "-v"],
    [sys.executable, "scripts/m8_phase2/contract_check.py"],
    [sys.executable, "scripts/m8_phase2/pipeline.py", "verify"],
]


def main():
    started = time.time()
    results = []
    for command in COMMANDS:
        begin = time.time()
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        result = {
            "command": command,
            "exitCode": completed.returncode,
            "durationSeconds": round(time.time() - begin, 3),
            "stdoutTail": completed.stdout[-2000:],
            "stderrTail": completed.stderr[-2000:],
        }
        results.append(result)
        if completed.returncode != 0:
            print(json.dumps({"status": "FAIL", "results": results}, ensure_ascii=False, indent=2))
            return 2
    print(json.dumps({"status": "PASS", "durationSeconds": round(time.time() - started, 3), "results": results}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
