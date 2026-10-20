"""Validate the frozen RPC output before exposing it to business callers."""
from __future__ import annotations

import math

from .engine import ALGORITHM_VERSIONS


def _integer(value, minimum=0):
    return isinstance(value, int) and not isinstance(value, bool) and value >= minimum


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _factors(value):
    return isinstance(value, list) and bool(value) and all(
        isinstance(item, dict) and _text(item.get("code")) and _text(item.get("effect"))
        for item in value
    )


def valid_response(task: str, value: object) -> bool:
    """Reject empty, partial, wrong-version, unsafe or structurally invalid results."""
    if not isinstance(value, dict) or value.get("algorithmVersion") != ALGORITHM_VERSIONS[task]:
        return False
    if task == "price":
        if set(value) != {
            "status", "intervalFen", "confidence", "factors", "sampleSize",
            "algorithmVersion", "disclaimer", "degraded", "degradationReason",
        }:
            return False
        interval = value["intervalFen"]
        if not isinstance(interval, dict) or set(interval) != {"lower", "upper"}:
            return False
        if not (
            _integer(value["sampleSize"]) and value["degraded"] is True
            and _text(value["disclaimer"]) and _text(value["degradationReason"])
            and _factors(value["factors"])
            and all(set(item) == {"code", "effect", "explanation"} and _text(item["explanation"])
                    for item in value["factors"])
        ):
            return False
        if value["status"] == "INSUFFICIENT_DATA":
            return value["confidence"] == "INSUFFICIENT" and all(v is None for v in interval.values())
        return (
            value["status"] == "LOW_CONFIDENCE" and value["confidence"] == "LOW"
            and _integer(interval["lower"], 1) and _integer(interval["upper"], 1)
            and interval["lower"] <= interval["upper"]
        )
    if task == "trust":
        if set(value) != {
            "status", "score", "validEventCount", "ignoredEventCount",
            "smoothing", "factors", "algorithmVersion",
        }:
            return False
        score, smoothing = value["score"], value["smoothing"]
        if not (
            isinstance(score, (int, float)) and not isinstance(score, bool)
            and 1 <= score <= 5 and math.isfinite(score)
            and _integer(value["validEventCount"]) and _integer(value["ignoredEventCount"])
            and smoothing == {"priorScore": 3.5, "priorWeight": 5}
            and _factors(value["factors"])
            and all(set(item) <= {"code", "effect", "count"}
                    and ("count" not in item or _integer(item["count"])) for item in value["factors"])
        ):
            return False
        if value["validEventCount"] == 0:
            return value["status"] == "NEW_USER_NEUTRAL" and score == 3.5
        return value["status"] == "AVAILABLE"
    if task == "risk":
        if set(value) != {
            "status", "missingInputs", "clues", "manualReviewRecommended", "recommendedAction",
            "enforcementExecuted", "algorithmVersion", "disclaimer",
        }:
            return False
        missing, clues = value["missingInputs"], value["clues"]
        allowed = {
            "failedPaymentCount24h", "listingCount1h", "distinctCounterpartyCount24h",
            "sameDeviceAccountCount7d", "reportCount7d",
        }
        if not (
            isinstance(missing, list) and all(isinstance(item, str) and item in allowed for item in missing)
            and len(missing) == len(set(missing)) and isinstance(clues, list)
            and value["enforcementExecuted"] is False and _text(value["disclaimer"])
            and all(isinstance(item, dict)
                    and set(item) == {"code", "field", "observed", "threshold", "explanation"}
                    and _text(item["code"]) and _text(item["field"]) and item["field"] in allowed
                    and _integer(item["observed"]) and _integer(item["threshold"], 1)
                    and item["observed"] >= item["threshold"] and _text(item["explanation"])
                    for item in clues)
        ):
            return False
        expected_status = "CLUES_FOUND" if clues else "INSUFFICIENT_DATA" if missing else "NO_RULE_CLUES"
        return (
            value["status"] == expected_status
            and value["manualReviewRecommended"] is bool(clues)
            and value["recommendedAction"] == ("MANUAL_REVIEW" if clues else "NONE")
        )
    return False
