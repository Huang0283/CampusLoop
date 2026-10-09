"""Trusted-backend adapter with bounded timeout and safe degradation."""
from __future__ import annotations

import json
import socket
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def fallback(task: str, reason: str) -> dict:
    common = {"status": "UNAVAILABLE", "degraded": True, "degradationReason": reason}
    if task == "price":
        return {**common, "fallback": "MANUAL_PRICE_ENTRY", "intervalFen": {"lower": None, "upper": None}}
    if task == "trust":
        return {**common, "fallback": "FACT_COUNT_OR_UNAVAILABLE"}
    if task == "risk":
        return {**common, "fallback": "STORE_REPORT_FOR_MANUAL_QUEUE", "enforcementExecuted": False}
    raise ValueError("unknown task")


def call(url: str, task: str, payload: dict, token: str, timeout: float = 0.5) -> dict:
    route = {"price": "price-advice", "trust": "trust-summary", "risk": "risk-clues"}[task]
    body = json.dumps({"schemaVersion": "m8-baseline-rpc-v1", "payload": payload}, allow_nan=False).encode("utf-8")
    request = Request(url.rstrip("/") + "/v1/" + route, data=body, method="POST",
                      headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))["data"]
    except HTTPError as exc:
        if exc.code not in {503, 504}:
            raise
        return fallback(task, "SERVICE_UNAVAILABLE")
    except (URLError, TimeoutError, socket.timeout, ConnectionError, OSError):
        return fallback(task, "SERVICE_TIMEOUT_OR_UNAVAILABLE")
