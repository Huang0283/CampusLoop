"""Record M8 adapter compatibility against a dedicated integration-test database."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
from urllib.parse import urlsplit


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--source-commit", required=True)
    args = parser.parse_args()
    database = urlsplit(os.environ.get("DATABASE_URL", ""))
    redis = urlsplit(os.environ.get("REDIS_URL", ""))
    if (database.hostname != "campusloop-ops-db" or database.path != "/campusloop_ops"
            or redis.hostname != "campusloop-ops-redis" or redis.path != "/15"):
        raise SystemExit("Dedicated operations-test database and Redis DB15 required")
    output = args.output_dir.resolve()
    if output.exists() and any(output.iterdir()):
        raise SystemExit("Use an empty evidence directory")
    output.mkdir(parents=True, exist_ok=True)
    command = [sys.executable, "-m", "pytest", "tests/test_live_intelligence.py", "-ra",
               "-o", "cache_dir=/tmp/campusloop-m8-compat-pytest"]
    result = subprocess.run(command, cwd=args.repo_root / "backend", capture_output=True,
                            text=True, encoding="utf-8", errors="replace", timeout=180)
    log = result.stdout + result.stderr
    (output / "backend-intelligence-tests.txt").write_text(log, encoding="utf-8", newline="\n")
    count = re.search(r"(\d+) passed", log)
    passed = int(count.group(1)) if count else 0
    status = "PASS" if result.returncode == 0 and passed == 2 and " skipped" not in log else "FAIL"
    record = {
        "sourceCommit": args.source_commit, "testedAtUtc": datetime.now(timezone.utc).isoformat(),
        "environment": {"python": platform.python_version(), "platform": platform.platform()},
        "command": command[1:], "returnCode": result.returncode, "passed": passed, "status": status,
        "log": "backend-intelligence-tests.txt",
        "sha256": hashlib.sha256((output / "backend-intelligence-tests.txt").read_bytes()).hexdigest(),
    }
    (output / "run-record.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8", newline="\n")
    print("Backend intelligence compatibility: " + status, flush=True)
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
