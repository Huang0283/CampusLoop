"""Deploy both private RPC processes and exercise recovery with synthetic facts."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import queue
import secrets
import socket
import subprocess
import sys
import threading
import time
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

from services.m7_baseline.client import call_baseline
from services.m7_baseline.engine import ROOT, ServiceError, rank
from services.m8_baseline.client import call as call_m8
from services.m8_baseline.engine import evaluate as m8_evaluate
from services.m8_phase4.readiness import inspect
from services.m8_phase4.router import route_price


def deploy_check(output):
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    token = secrets.token_hex(32)
    environment = dict(os.environ, M7_SERVICE_TOKEN=token, M8_SERVICE_TOKEN=token,
                       PYTHONIOENCODING="utf-8", PYTHONDONTWRITEBYTECODE="1")
    processes = []
    cases = []

    def start(module, arguments):
        process = subprocess.Popen([sys.executable, "-m", module, *map(str, arguments)], cwd=ROOT,
            env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8",
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        processes.append(process)
        return process

    def m7_start():
        process = start("services.m7_baseline", ["--database", output / "snapshots.sqlite", "--port", "0"])
        ready = queue.Queue()
        threading.Thread(target=lambda: ready.put(process.stdout.readline()), daemon=True).start()
        line = ready.get(timeout=15)
        if not line.strip():
            raise RuntimeError("M7 did not announce readiness")
        return process, "http://127.0.0.1:" + str(json.loads(line)["port"])

    def post(url, path, body, auth=True):
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["Authorization"] = "Bearer " + token
        try:
            response = build_opener(ProxyHandler({})).open(Request(url+path, json.dumps(body).encode("utf-8"), headers=headers), timeout=3)
        except HTTPError as exc:
            response = exc
        with response:
            return response.status, json.load(response)

    def stop(process):
        process.terminate()
        _, logs = process.communicate(timeout=10)
        if token in logs:
            raise AssertionError("credential appeared in service log")
        return logs

    logs = []
    try:
        first, m7_url = m7_start()
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        m8 = start("services.m8_baseline", ["--port", port])
        m8_url = f"http://127.0.0.1:{port}"
        for attempt in range(100):
            if m8.poll() is not None:
                raise RuntimeError("M8 exited before readiness")
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=.1):
                    break
            except OSError:
                time.sleep(.05)
        else:
            raise RuntimeError("M8 readiness timed out")
        payload = json.loads(subprocess.check_output([sys.executable, "-m", "services.m7_baseline.example_request"], cwd=ROOT, env=environment, encoding="utf-8"))
        expected = rank(payload["products"], payload["request"], payload["dictionary"])
        actual = call_baseline(m7_url, payload, token)
        assert actual == expected
        cases.append(dict(name="m7-real-rpc-normal", status="PASS", algorithm=actual["metadata"]["algorithmVersion"]))
        code, error = post(m7_url, "/v1/rank", payload, auth=False)
        assert code == 401
        cases.append(dict(name="m7-unauthenticated-rejected", status="PASS", httpStatus=code))
        payload["options"] = {"mode": "semantic"}
        disabled = call_baseline(m7_url, payload, token)
        assert disabled["items"] == expected["items"] and disabled["metadata"]["fallbackReason"] == "MODEL_DISABLED"
        cases.append(dict(name="m7-candidate-disabled-keeps-baseline", status="PASS", metadata=disabled["metadata"]))
        payload["options"] = {"size": 1}
        code, page = post(m7_url, "/v1/page", payload)
        assert code == 200 and page["data"]["nextScanPosition"]
        logs.append(stop(first))
        first, m7_url = m7_start()
        payload["options"].update(snapshotVersion=page["data"]["snapshotVersion"], scanPosition=page["data"]["nextScanPosition"])
        code, next_page = post(m7_url, "/v1/page", payload)
        assert code == 200 and next_page["data"]["items"][0]["productId"] != page["data"]["items"][0]["productId"]
        cases.append(dict(name="m7-explicit-sqlite-restart-preserves-page", status="PASS", snapshotVersion=page["data"]["snapshotVersion"]))
        payload["options"] = {}
        logs.append(stop(first))
        recovered = call_baseline(m7_url, payload, token, timeout=.2)
        assert recovered["items"] == expected["items"] and recovered["metadata"]["degraded"]
        cases.append(dict(name="m7-service-stopped-recovers-baseline", status="PASS", fallbackReason=recovered["metadata"]["fallbackReason"]))
        samples = {
            "price": {"category": "digital", "condition": "good", "originalPriceFen": 600000,
                      "purchaseAgeMonths": 18, "accessoryState": "complete", "defectTags": []},
            "trust": {"events": []},
            "risk": {"failedPaymentCount24h": None, "listingCount1h": 12, "distinctCounterpartyCount24h": 0,
                     "sameDeviceAccountCount7d": None, "reportCount7d": 0},
        }
        for task, sample in samples.items():
            value = call_m8(m8_url, task, sample, token)
            assert value == m8_evaluate(task, sample)
            if task == "risk":
                assert value["enforcementExecuted"] is False
            cases.append(dict(name="m8-real-rpc-"+task, status="PASS", algorithm=value["algorithmVersion"]))
        readiness = inspect()
        requested = route_price(samples["price"], readiness, candidate_enabled=True)
        off = route_price(samples["price"], readiness, candidate_enabled=False)
        assert readiness["decision"] == "NO_GO" and requested["selectedEngine"] == off["selectedEngine"] == "PHASE3_RULE_BASELINE"
        assert requested["data"] == off["data"]
        cases.append(dict(name="m8-no-go-and-switch-off-identical-baseline", status="PASS", fallbackReason=requested["fallbackReason"]))
        logs.append(stop(m8))
        for task, sample in samples.items():
            value = call_m8(m8_url, task, sample, token, timeout=.2)
            assert value["status"] == "UNAVAILABLE" and value["degraded"]
            cases.append(dict(name="m8-service-stopped-"+task, status="PASS", fallback=value["fallback"]))
        record = dict(status="PASS", executedAt=datetime.now(timezone.utc).isoformat(),
            sourceCommit=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            acceptance="AUTHOR_LOCAL_DEPLOYMENT_CHECK; NOT RELEASE_ENVIRONMENT OR HUMAN SIGNATURE",
            runtime="two real loopback CLI processes; explicit temporary SQLite path; no database/business API mock",
            notes="Persistent-page restart applies to standalone M7 --database, not backend/scripts/serve.py temporary snapshot lifetime.",
            cases=cases, credential="ephemeral random environment token; not archived", logsRedacted=True)
        (output / "smoke.json").write_text(json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2)+"\n", encoding="utf-8", newline="\n")
        (output / "service-logs.txt").write_text("\n".join(logs), encoding="utf-8", newline="\n")
        return record
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
                process.communicate(timeout=10)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        parser.error("output directory must be empty")
    result = deploy_check(args.output_dir)
    print(json.dumps(dict(status=result["status"], caseCount=len(result["cases"]))))


if __name__ == "__main__":
    main()
