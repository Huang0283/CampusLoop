"""Feature-gated price candidate router with immediate Phase 3 rollback."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from copy import deepcopy
from typing import Callable

from services.m8_baseline.engine import price_advice as baseline_price_advice

ROUTER_VERSION = "m8-price-phase4-router-v1"
CANDIDATE_VERSION = "m8-price-candidate-v1"
FEATURE_VERSION = "m8-price-features-v1"


def _baseline(payload: dict, reason: str, candidate_requested: bool, data: dict | None = None) -> dict:
    return {
        "routerVersion": ROUTER_VERSION,
        "selectedEngine": "PHASE3_RULE_BASELINE",
        "candidateRequested": candidate_requested,
        "fallbackApplied": candidate_requested,
        "fallbackReason": reason,
        "data": baseline_price_advice(payload) if data is None else data,
    }


def _valid_candidate(value: object) -> tuple[bool, str]:
    if value is None:
        return False, "CANDIDATE_NO_RESULT"
    if not isinstance(value, dict):
        return False, "CANDIDATE_INVALID_RESULT"
    if value.get("modelVersion") != CANDIDATE_VERSION or value.get("featureVersion") != FEATURE_VERSION:
        return False, "CANDIDATE_VERSION_MISMATCH"
    if value.get("confidence") not in {"MEDIUM", "HIGH"}:
        return False, "CANDIDATE_LOW_CONFIDENCE"
    if set(value) != {"status", "modelVersion", "featureVersion", "confidence", "recommendedFen", "intervalFen", "factors"}:
        return False, "CANDIDATE_INVALID_RESULT"
    interval = value.get("intervalFen")
    factors = value.get("factors")
    recommended = value.get("recommendedFen")
    if (
        not isinstance(interval, dict)
        or not isinstance(interval.get("lower"), int)
        or isinstance(interval.get("lower"), bool)
        or not isinstance(interval.get("upper"), int)
        or isinstance(interval.get("upper"), bool)
        or not 0 < interval["lower"] <= interval["upper"]
        or not isinstance(recommended, int)
        or isinstance(recommended, bool)
        or not interval["lower"] <= recommended <= interval["upper"]
        or not isinstance(factors, list)
        or not factors
        or any(
            not isinstance(item, dict)
            or set(item) != {"code", "explanation"}
            or not isinstance(item.get("code"), str)
            or not item["code"]
            or not isinstance(item.get("explanation"), str)
            or not item["explanation"]
            for item in factors
        )
    ):
        return False, "CANDIDATE_INVALID_RESULT"
    return True, ""


def route_price(
    payload: dict,
    readiness: dict,
    *,
    candidate_enabled: bool = False,
    candidate: Callable[[dict], dict | None] | None = None,
    timeout_ms: int = 300,
) -> dict:
    """Use a candidate only after an approved gate; every failure restores Phase 3."""
    if not candidate_enabled:
        return _baseline(payload, "CANDIDATE_DISABLED", False)
    if readiness.get("decision") != "GO_FOR_CANDIDATE_TRAINING" or readiness.get("candidateServingAllowed") is not True:
        return _baseline(payload, "DATA_OR_APPROVAL_GATE_NO_GO", True)
    # Validate once with the frozen Phase 3 contract and retain an immutable fallback.
    baseline_data = baseline_price_advice(payload)
    if candidate is None:
        return _baseline(payload, "CANDIDATE_MODEL_MISSING", True, baseline_data)
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="m8-price-candidate")
    future = executor.submit(candidate, deepcopy(payload))
    try:
        value = future.result(timeout=max(timeout_ms, 1) / 1000)
    except FutureTimeout:
        future.cancel()
        return _baseline(payload, "CANDIDATE_TIMEOUT", True, baseline_data)
    except Exception:
        return _baseline(payload, "CANDIDATE_ERROR", True, baseline_data)
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
    valid, reason = _valid_candidate(value)
    if not valid:
        return _baseline(payload, reason, True, baseline_data)
    return {
        "routerVersion": ROUTER_VERSION,
        "selectedEngine": "PHASE4_PRICE_CANDIDATE",
        "candidateRequested": True,
        "fallbackApplied": False,
        "fallbackReason": None,
        "data": value,
    }
