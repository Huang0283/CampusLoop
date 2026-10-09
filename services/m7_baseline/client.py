"""Backend-side rank adapter; the caller must supply authorized business facts."""
from datetime import datetime, timezone
import json
from http.client import HTTPException
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, ProxyHandler
from .engine import ServiceError, rank
from .http_service import unique_object, invalid_constant


def call_baseline(url, payload, token, *, timeout=1.5):
    parsed = urlsplit(url)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.path not in {"", "/"} or parsed.query or parsed.fragment or parsed.username:
        raise ServiceError(422, "VALIDATION_ERROR")
    if not isinstance(token, str) or len(token) < 32 or isinstance(timeout, bool) or not isinstance(timeout, (int, float)) or not 0 < timeout <= 10:
        raise ServiceError(422, "VALIDATION_ERROR")
    required = {"schemaVersion", "products", "request", "dictionary"}
    if not isinstance(payload, dict) or not required <= set(payload) or not set(payload) <= required | {"options"} or payload["schemaVersion"] != "m7-baseline-rpc-v1":
        raise ServiceError(422, "VALIDATION_ERROR")
    options = payload.get("options", {})
    if not isinstance(options, dict) or not set(options) <= {"mode", "sort"}:
        raise ServiceError(422, "VALIDATION_ERROR")
    body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
    request = Request(url.rstrip("/") + "/v1/rank", data=body,
                      headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    reason = None
    try:
        with build_opener(ProxyHandler({})).open(request, timeout=timeout) as response:
            result = json.loads(response.read(8 * 1024 * 1024), object_pairs_hook=unique_object, parse_constant=invalid_constant)
            if result.get("schemaVersion") != "m7-baseline-rpc-v1" or "data" not in result:
                raise ServiceError(503, "INVALID_SERVICE_RESPONSE")
            return result["data"]
    except HTTPError as error:
        with error:
            if error.code not in {503, 504}:
                try:
                    code = json.loads(error.read())["error"]["code"]
                except (ValueError, KeyError, TypeError):
                    code = "REMOTE_ERROR"
                raise ServiceError(error.code, code) from None
        reason = "SERVICE_TIMEOUT" if error.code == 504 else "SERVICE_UNAVAILABLE"
    except (TimeoutError, socket.timeout):
        reason = "SERVICE_TIMEOUT"
    except URLError as error:
        reason = "SERVICE_TIMEOUT" if isinstance(error.reason, TimeoutError) else "SERVICE_UNAVAILABLE"
    except (OSError, HTTPException):
        reason = "SERVICE_UNAVAILABLE"
    result = rank(payload["products"], payload["request"], payload["dictionary"], **options)
    context = payload["request"]["context"]
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(context["asOf"].replace("Z", "+00:00"))).total_seconds()
    if not 0 <= age <= 60:
        raise ServiceError(409, "STALE_INPUT")
    wanted = payload["request"]["wanted"]
    if wanted and datetime.fromisoformat(wanted["expiresAt"].replace("Z", "+00:00")) <= datetime.now(timezone.utc):
        raise ServiceError(409, "WANTED_INACTIVE")
    result["metadata"].update(degraded=True, fallbackReason=reason)
    return result
