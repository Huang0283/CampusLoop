from datetime import datetime, timezone
import json
import os
from pathlib import Path
import queue
import argparse
import secrets
import subprocess
import sys
import tempfile
import threading
from urllib.error import HTTPError
from urllib.request import Request, build_opener, ProxyHandler

parser = argparse.ArgumentParser()
parser.add_argument('--checkout', type=Path, required=True)
parser.add_argument('--python', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
REPO = args.checkout.resolve()
sys.path.insert(0, str(REPO))
from services.m7_baseline.client import call_baseline
from services.m7_baseline.engine import ServiceError

runtime = args.python.resolve()
environment = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1", M7_SERVICE_TOKEN=secrets.token_hex(32))
record = dict(startedAt=datetime.now(timezone.utc).isoformat(), status="PASS", sourceCommit=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip(),
              workingTreeDirty=bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=REPO, text=True).strip()),
              environment={"python": sys.version.split()[0], "platform": sys.platform},
              command=["python", "-m", "services.m7_baseline", "--database", "<temporary-m7-sqlite>", "--port", "0"],
              credential="ephemeral random environment variable; never persisted", cases=[])
with tempfile.TemporaryDirectory() as temp:
    process = subprocess.Popen([str(runtime), "-m", "services.m7_baseline", "--database", str(Path(temp) / "baseline.sqlite"), "--port", "0"],
                               cwd=REPO, env=environment, encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        ready_queue = queue.Queue()
        threading.Thread(target=lambda: ready_queue.put(process.stdout.readline()), daemon=True).start()
        ready = json.loads(ready_queue.get(timeout=10))
        url = "http://127.0.0.1:" + str(ready["port"])
        payload = json.loads(subprocess.check_output([str(runtime), "-m", "services.m7_baseline.example_request"], cwd=REPO, env=environment, encoding="utf-8"))
        def post(body, *, path="/v1/rank", auth=True):
            headers = {"Content-Type": "application/json"}
            if auth:
                headers["Authorization"] = "Bearer " + environment["M7_SERVICE_TOKEN"]
            try:
                response = build_opener(ProxyHandler({})).open(Request(url + path, data=json.dumps(body).encode("utf-8"), headers=headers), timeout=3)
            except HTTPError as error:
                response = error
            with response:
                return response.status, json.loads(response.read())
        status, result = post(payload, auth=False)
        assert status == 401 and result["error"]["code"] == "UNAUTHORIZED"
        record["cases"].append(dict(case="missing-service-auth", status=status, error=result["error"]["code"]))
        payload["options"] = {"mode": "semantic"}
        status, result = post(payload)
        assert status == 200 and result["data"]["metadata"]["fallbackReason"] == "MODEL_DISABLED"
        record["cases"].append(dict(case="computed-search-semantic-disabled", status=status, result=result["data"]))
        payload["options"] = {"size": 1}
        status, first = post(payload, path="/v1/page")
        assert status == 200 and first["data"]["items"][0]["productId"] == "101"
        payload["options"].update(snapshotVersion=first["data"]["snapshotVersion"], scanPosition=first["data"]["nextScanPosition"])
        status, second = post(payload, path="/v1/page")
        assert status == 200 and second["data"]["items"][0]["productId"] != "101"
        record["cases"].append(dict(case="two-persisted-pages", status=status, first=first["data"], second=second["data"]))
        bad = dict(payload, unknownField=True)
        status, result = post(bad)
        assert status == 422
        record["cases"].append(dict(case="unknown-input-field", status=status, error=result["error"]["code"]))
        payload["options"] = {}
        try:
            call_baseline(url, payload, "wrong-service-token-32-characters", timeout=1)
            raise AssertionError("401 must not invoke local fallback")
        except ServiceError as error:
            assert error.status == 401
            record["cases"].append(dict(case="client-auth-error-no-fallback", status=error.status, error=error.code))
        process.terminate()
        out, logs = process.communicate(timeout=5)
        degraded = call_baseline(url, payload, environment["M7_SERVICE_TOKEN"], timeout=0.3)
        assert degraded["metadata"]["degraded"] and degraded["items"]
        record["cases"].append(dict(case="service-stopped-local-filtered-fallback", result=degraded))
        assert environment["M7_SERVICE_TOKEN"] not in logs and payload["request"]["queryText"] not in logs
        record["logsRedacted"] = True
        record["serverLog"] = logs
    finally:
        if process.poll() is None:
            process.terminate()
            process.communicate(timeout=5)
record["endedAt"] = datetime.now(timezone.utc).isoformat()
args.output.write_text(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": record["status"], "cases": len(record["cases"]), "logsRedacted": record["logsRedacted"], "sourceCommit": record["sourceCommit"]}))
