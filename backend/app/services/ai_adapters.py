"""M6 business boundary: bounded RPC, validated results, explicit safe fallback."""

import math
from http.client import HTTPException

from app.core.config import get_settings
from app.core.errors import BusinessError

RPC_TIMEOUT_SECONDS = 1.5


def rank_payload(payload):
    from services.m7_baseline.client import call_baseline
    from services.m7_baseline.engine import ServiceError, rank

    # Validate business inputs even when the remote service is down. A transport
    # failure must never bypass hard constraints or disguise a user input error.
    try:
        baseline = rank(
            payload["products"], payload["request"], payload["dictionary"], **payload["options"]
        )
    except ServiceError as exc:
        raise BusinessError(
            exc.status, exc.code, "Baseline input could not be processed."
        ) from None
    settings = get_settings()
    reason = "SERVICE_DISABLED"
    if settings.baseline_services_enabled and len(settings.baseline_rpc_token) >= 32:
        try:
            result = call_baseline(
                settings.m7_service_url,
                payload,
                settings.baseline_rpc_token,
                timeout=RPC_TIMEOUT_SECONDS,
            )
            if valid_rank(result, baseline):
                return result
            reason = "INVALID_SERVICE_RESPONSE"
        except ServiceError as exc:
            if exc.status < 500:
                raise BusinessError(exc.status, exc.code, "Baseline input rejected.") from None
            reason = "SERVICE_UNAVAILABLE"
        except TimeoutError:
            reason = "SERVICE_TIMEOUT"
        except (OSError, HTTPException):
            reason = "SERVICE_UNAVAILABLE"
        except (ValueError, KeyError, TypeError, AttributeError):
            reason = "INVALID_SERVICE_RESPONSE"
    baseline["metadata"].update(degraded=True, fallbackReason=reason)
    return baseline


def valid_rank(result, baseline):
    """Accept only the checked-in M7 keyword/rule contract and eligible identities."""
    if not isinstance(result, dict) or not isinstance(result.get("items"), list):
        return False
    metadata = result.get("metadata")
    if not isinstance(metadata, dict) or any(
        metadata.get(key) != baseline["metadata"][key]
        for key in (
            "schemaVersion",
            "algorithmVersion",
            "dictionaryVersion",
            "dictionaryHash",
            "mode",
        )
    ):
        return False
    if type(metadata.get("degraded")) is not bool or not (
        metadata.get("fallbackReason") is None or isinstance(metadata.get("fallbackReason"), str)
    ):
        return False
    eligible = {item["productId"]: item for item in baseline["items"]}
    seen = set()
    for item in result["items"]:
        if not isinstance(item, dict) or not isinstance(item.get("productId"), str):
            return False
        identity = item["productId"]
        if identity in seen or identity not in eligible:
            return False
        seen.add(identity)
        if type(item.get("productVersion")) is not int or (
            item["productVersion"] != eligible[identity]["productVersion"]
        ):
            return False
        if "relevanceScore" not in item:
            return False
        score = item.get("relevanceScore")
        if score is not None and (
            type(score) not in (int, float) or not math.isfinite(score) or not 0 <= score <= 1
        ):
            return False
        # Rule explanations are also part of the frozen contract, not free text
        # supplied by a model. Future semantic versions require M7 confirmation.
        if any(
            item.get(key) != eligible[identity][key] for key in ("reasons", "explanationDetails")
        ):
            return False
    return True


def price_payload(payload):
    from services.m8_baseline.client import call, fallback
    from services.m8_baseline.engine import ServiceError, price_advice

    try:
        price_advice(payload)  # Frozen M8 input validation, independent of availability.
    except ServiceError as exc:
        raise BusinessError(exc.status, exc.code, "Price input could not be processed.") from None
    settings = get_settings()
    if not settings.baseline_services_enabled or len(settings.baseline_rpc_token) < 32:
        return fallback("price", "SERVICE_DISABLED")
    try:
        result = call(
            settings.m8_service_url,
            "price",
            payload,
            settings.baseline_rpc_token,
            timeout=RPC_TIMEOUT_SECONDS,
        )
        if valid_price(result):
            return result
        return fallback("price", "INVALID_SERVICE_RESPONSE")
    except ServiceError as exc:
        if exc.status < 500:
            raise BusinessError(exc.status, exc.code, "Price input rejected.") from None
        return fallback("price", "SERVICE_UNAVAILABLE")
    except TimeoutError:
        return fallback("price", "SERVICE_TIMEOUT")
    except (OSError, HTTPException):
        return fallback("price", "SERVICE_UNAVAILABLE")
    except (ValueError, KeyError, TypeError, AttributeError):
        return fallback("price", "INVALID_SERVICE_RESPONSE")


def valid_price(result):
    if not isinstance(result, dict) or not isinstance(result.get("intervalFen"), dict):
        return False
    interval = result["intervalFen"]
    if not {"lower", "upper"} <= interval.keys():
        return False
    factors = result.get("factors", [])
    if not isinstance(factors, list) or any(
        not isinstance(f, dict) or not isinstance(f.get("explanation"), str) for f in factors
    ):
        return False
    # Only the frozen rule service is admitted. Every current M8 price response
    # is degraded; an unavailable/low-confidence result must not claim otherwise.
    if result.get("degraded") is not True:
        return False
    if (
        not isinstance(result.get("degradationReason"), str)
        or not result["degradationReason"].strip()
    ):
        return False
    if type(result.get("sampleSize", 0)) is not int or result.get("sampleSize", 0) < 0:
        return False
    if "disclaimer" in result and not isinstance(result["disclaimer"], str):
        return False
    version = result.get("algorithmVersion")
    if "algorithmVersion" in result and version != "m8-price-rule-v1":
        return False
    lower, upper = interval.get("lower"), interval.get("upper")
    if result.get("status") == "UNAVAILABLE":
        return lower is None and upper is None
    if version != "m8-price-rule-v1":
        return False
    if result.get("status") == "INSUFFICIENT_DATA":
        return lower is None and upper is None
    return (
        result.get("status") == "LOW_CONFIDENCE"
        and type(lower) is int
        and type(upper) is int
        and 0 <= lower <= upper <= 9_999_999_999
    )
