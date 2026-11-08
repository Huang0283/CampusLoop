"""Diagnostic RPC fault probes. FAIL observations remain release blockers."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import platform
import sys
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "services/m7_baseline/tests"))
from services.m7_baseline.client import call_baseline  # noqa: E402
from services.m7_baseline.engine import rank, ServiceError  # noqa: E402
from services.m8_baseline.client import call  # noqa: E402
from test_engine import RankingTests  # noqa: E402

TOKEN = "quality-only-synthetic-rpc-token-000000000000"


@contextmanager
def stub(body: bytes, delay=0):
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            time.sleep(delay)
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    fixture = RankingTests()
    fixture.setUp()
    fixture.request["context"]["asOf"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = dict(schemaVersion="m7-baseline-rpc-v1", products=[fixture.product], request=fixture.request, dictionary=fixture.dictionary)
    rows = []

    def observe(capability, scenario, action, accepted):
        try:
            result = action()
            okay = accepted(result)
            actual = "safe-fallback" if isinstance(result, dict) and (result.get("degraded") or result.get("metadata", {}).get("degraded")) else "response-returned"
        except Exception as exc:
            okay = scenario == "stale-input" and isinstance(exc, ServiceError) and exc.code == "STALE_INPUT"
            actual = type(exc).__name__ + (":" + exc.code if isinstance(exc, ServiceError) else "")
        rows.append(dict(capability=capability, scenario=scenario, status="PASS" if okay else "FAIL", actual=actual))

    normal = rank(payload["products"], payload["request"], payload["dictionary"])
    with stub(json.dumps(dict(schemaVersion="m7-baseline-rpc-v1", data=normal)).encode()) as url:
        observe("M7 ranking", "normal", lambda: call_baseline(url, payload, TOKEN), lambda value: value == normal)
    with stub(b"{}", delay=0.3) as url:
        observe("M7 ranking", "timeout", lambda: call_baseline(url, payload, TOKEN, timeout=0.05), lambda value: value["metadata"]["degraded"] and value["metadata"]["fallbackReason"] == "SERVICE_TIMEOUT" and value["items"][0]["productId"] == "101")
    with stub(b"{}") as closed:
        pass
    observe("M7 ranking", "off", lambda: call_baseline(closed, payload, TOKEN, timeout=0.1), lambda value: value["metadata"]["degraded"] and value["items"][0]["productId"] == "101")
    with stub(b'{"schemaVersion":"m7-baseline-rpc-v1","data":{}}') as url:
        observe("M7 ranking", "bad-shape", lambda: call_baseline(url, payload, TOKEN), lambda value: value.get("metadata", {}).get("degraded") is True)
    with stub(b"not-json") as url:
        observe("M7 ranking", "bad-json", lambda: call_baseline(url, payload, TOKEN), lambda value: value.get("metadata", {}).get("degraded") is True)
    payload["request"]["context"]["asOf"] = (datetime.now(timezone.utc) - timedelta(seconds=120)).strftime("%Y-%m-%dT%H:%M:%SZ")
    observe("M7 ranking", "stale-input", lambda: call_baseline(closed, payload, TOKEN, timeout=0.1), lambda _value: False)

    for task in ("price", "trust", "risk"):
        with stub(b"{}", delay=0.3) as url:
            observe("M8 " + task, "timeout", lambda: call(url, task, {}, TOKEN, timeout=0.05), lambda value: value.get("status") == "UNAVAILABLE" and value.get("degraded") is True and not value.get("enforcementExecuted", False))
        observe("M8 " + task, "off", lambda: call(closed, task, {}, TOKEN, timeout=0.1), lambda value: value.get("status") == "UNAVAILABLE" and value.get("degraded") is True)
        with stub(b'{"schemaVersion":"m8-baseline-rpc-v1","data":{}}') as url:
            observe("M8 " + task, "bad-shape", lambda: call(url, task, {}, TOKEN), lambda value: value.get("status") == "UNAVAILABLE" and value.get("degraded") is True)
        with stub(b"not-json") as url:
            observe("M8 " + task, "bad-json", lambda: call(url, task, {}, TOKEN), lambda value: value.get("status") == "UNAVAILABLE" and value.get("degraded") is True)
    try:
        commit = subprocess.check_output(["git", "-C", str(ROOT), "rev-parse", "HEAD"], text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "UNAVAILABLE; verify source hashes in accompanying report"
    import hashlib
    hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ("services/m7_baseline/client.py", "services/m8_baseline/client.py")}
    record = dict(purpose="diagnostic-only; failures block freeze", codeCommit=commit, sourceHashes=hashes, environment=dict(python=platform.python_version(), os=platform.system()), observations=rows, passCount=sum(row["status"] == "PASS" for row in rows), failCount=sum(row["status"] == "FAIL" for row in rows))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(record))
    return 2 if record["failCount"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
