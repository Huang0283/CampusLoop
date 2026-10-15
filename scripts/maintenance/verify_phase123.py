"""Repeat the Phase 1-3 runtime checks against a dedicated disposable test DB."""
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
from urllib.parse import urlsplit
from urllib.request import build_opener, ProxyHandler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--source-commit", required=True)
    args = parser.parse_args()
    root, output = args.repo_root.resolve(), args.output_dir.resolve()
    database = urlsplit(os.environ.get("DATABASE_URL", ""))
    redis = urlsplit(os.environ.get("REDIS_URL", ""))
    # The rollback and integration tests are never allowed on a demo/user DB.
    if (database.hostname != "campusloop-ops-db" or database.path != "/campusloop_ops"
            or redis.hostname != "campusloop-ops-redis" or redis.path != "/15"):
        raise SystemExit("Dedicated campusloop-ops-db/campusloop_ops and Redis DB 15 required")
    if output.exists() and any(output.iterdir()):
        raise SystemExit("Use an empty evidence directory")
    output.mkdir(parents=True, exist_ok=True)
    results = []
    failed = False

    def run(name, command, cwd):
        nonlocal failed
        result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        filename = name + ".txt"
        path = output / filename
        path.write_text(result.stdout + result.stderr, encoding="utf-8", newline="\n")
        results.append({"name": name, "command": command, "cwd": str(cwd), "returnCode": result.returncode,
                        "status": "PASS" if result.returncode == 0 else "FAIL", "log": filename,
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        print(name + ": " + results[-1]["status"], flush=True)
        failed |= result.returncode != 0
        return result.returncode == 0

    backend = root / "backend"
    commands = [
        ("backend-format", [sys.executable, "-m", "ruff", "format", "--check", "."]),
        ("backend-lint", [sys.executable, "-m", "ruff", "check", "."]),
        ("migration-upgrade", [sys.executable, "-m", "alembic", "upgrade", "head"]),
        ("migration-rollback", [sys.executable, "-m", "alembic", "downgrade", "base"]),
        ("migration-reupgrade", [sys.executable, "-m", "alembic", "upgrade", "head"]),
        ("seed-idempotency", [sys.executable, "scripts/seed.py", "--check"]),
        ("backend-tests", [sys.executable, "-m", "pytest", "-ra", "-o", "cache_dir=/tmp/campusloop-ops-pytest"]),
    ]
    for name, command in commands:
        if not run(name, command, backend):
            break
    if not failed:
        for name, directory in (
            ("m7-phase2", "scripts/m7_phase2"), ("m8-phase2", "scripts/m8_phase2"),
            ("ai-phase2-joint", "scripts/intelligence_phase2"),
            ("m7-phase3", "services/m7_baseline/tests"), ("m8-phase3", "services/m8_baseline/tests"),
        ):
            run(name, [sys.executable, "-m", "unittest", "discover", "-s", directory, "-v"], root)
    runtime_observations = []
    if not failed:
        runtime_log = output / "runtime-server.txt"
        with runtime_log.open("w", encoding="utf-8") as log:
            runtime_env = {**os.environ, "BASELINE_SERVICES_ENABLED": "true"}
            server = subprocess.Popen([sys.executable, "scripts/serve.py"], cwd=backend, env=runtime_env, stdout=log, stderr=log)
            try:
                opener = build_opener(ProxyHandler({}))
                deadline = time.monotonic() + 30
                ready = False
                while time.monotonic() < deadline:
                    try:
                        with opener.open("http://127.0.0.1:8000/ready", timeout=1) as response:
                            ready = response.status == 200 and json.loads(response.read())["data"]["status"] == "ok"
                        if ready:
                            break
                    except (OSError, ValueError):
                        pass
                    time.sleep(0.5)
                if not ready:
                    raise RuntimeError("Runtime did not become ready")
                for path in ("/health", "/ready", "/products", "/wanted", "/search?query=book", "/docs", "/openapi.json"):
                    with opener.open("http://127.0.0.1:8000" + path, timeout=5) as response:
                        runtime_observations.append({"path": path, "status": response.status})
                        if response.status != 200:
                            raise RuntimeError("Smoke request failed")
                print("live-startup-and-public-routes: PASS", flush=True)
            except Exception as error:
                failed = True
                runtime_observations.append({"status": "FAIL", "errorType": type(error).__name__})
            finally:
                server.terminate()
                server.wait(timeout=10)
    record = {"sourceCommit": args.source_commit, "testedAtUtc": datetime.now(timezone.utc).isoformat(),
              "environment": {"python": platform.python_version(), "platform": platform.platform()},
              "isolation": "fresh dedicated PostgreSQL + Redis15 + MinIO; existing demos untouched",
              "checks": results, "runtimeSmoke": runtime_observations, "status": "FAIL" if failed else "PASS"}
    (output / "run-record.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8", newline="\n")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
