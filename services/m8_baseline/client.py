"""Trusted-backend adapter with bounded timeout and safe degradation."""
from __future__ import annotations

import json
import socket
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, ProxyHandler
from urllib.parse import urlsplit
from .engine import ServiceError


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
    parsed = urlsplit(url)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.path not in {"", "/"} or parsed.query or parsed.fragment or parsed.username or len(token) < 32:
        raise ServiceError(422, "VALIDATION_ERROR")
    route = {"price": "price-advice", "trust": "trust-summary", "risk": "risk-clues"}[task]
    body = json.dumps({"schemaVersion": "m8-baseline-rpc-v1", "payload": payload}, allow_nan=False).encode("utf-8")
    request = Request(url.rstrip("/") + "/v1/" + route, data=body, method="POST",
                      headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    try:
        with build_opener(ProxyHandler({})).open(request, timeout=timeout) as response:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                return fallback(task, "INVALID_SERVICE_RESPONSE")
            result = json.loads(raw.decode("utf-8"))
            if result.get("schemaVersion") != "m8-baseline-rpc-v1" or not isinstance(result.get("data"), dict):
                return fallback(task, "INVALID_SERVICE_RESPONSE")
            return result["data"]
    except HTTPError as exc:
        if exc.code not in {503, 504}:
            with exc:
                raise ServiceError(exc.code, "BASELINE_INPUT_REJECTED") from None
        return fallback(task, "SERVICE_UNAVAILABLE")
    except (URLError, TimeoutError, socket.timeout, ConnectionError, OSError):
        return fallback(task, "SERVICE_TIMEOUT_OR_UNAVAILABLE")
    except (ValueError, KeyError, TypeError):
        return fallback(task, "INVALID_SERVICE_RESPONSE")
