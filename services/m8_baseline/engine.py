"""Deterministic M8 advisory rules. No function performs business writes."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from scripts.m8_phase2.pipeline import advise as phase2_price_advice

ALGORITHM_VERSIONS = {
    "price": "m8-price-rule-v1",
    "trust": "m8-trust-rule-v1",
    "risk": "m8-risk-clue-rule-v1",
}
PRICE_DISCLAIMER = "规则区间仅供发布者参考，不保证成交；请结合实际成色与市场情况自主定价。"
VALID_EVENT_TYPES = {"SALE", "PURCHASE", "REVIEW"}


def _price_factor_description(code: str) -> str:
    if code.startswith("CONDITION_"):
        return "商品成色影响价格区间"
    if code.startswith("AGE_"):
        return "购买年限影响折旧；未知年限按中性处理"
    if code == "DEFECT_OR_ACCESSORY_PENALTY":
        return "缺陷或配件不完整使建议区间下调"
    if code == "ORIGINAL_PRICE_MISSING":
        return "缺少经批准的原价锚点，无法生成区间"
    return "规则因素"


class ServiceError(ValueError):
    def __init__(self, status: int, code: str):
        super().__init__(code)
        self.status = status
        self.code = code


def _object(value: Any) -> dict:
    if not isinstance(value, dict):
        raise ServiceError(422, "VALIDATION_ERROR")
    return value


def _integer(value: Any, minimum: int = 0, maximum: int = 9_999_999_999) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and minimum <= value <= maximum


def price_advice(payload: dict) -> dict:
    """Return a conservative interval, never a guaranteed transaction price."""
    value = _object(payload)
    required = {"category", "condition", "originalPriceFen", "purchaseAgeMonths", "accessoryState", "defectTags"}
    if set(value) != required:
        raise ServiceError(422, "VALIDATION_ERROR")
    if value["category"] not in {"digital", "books", "household", "clothing", "sports", "other"}:
        raise ServiceError(422, "VALIDATION_ERROR")
    if value["condition"] not in {"new", "like_new", "good", "fair"}:
        raise ServiceError(422, "VALIDATION_ERROR")
    if value["originalPriceFen"] is not None and not _integer(value["originalPriceFen"], 1):
        raise ServiceError(422, "VALIDATION_ERROR")
    if value["purchaseAgeMonths"] is not None and not _integer(value["purchaseAgeMonths"], 0, 600):
        raise ServiceError(422, "VALIDATION_ERROR")
    if value["accessoryState"] not in {"complete", "partial", "unknown"}:
        raise ServiceError(422, "VALIDATION_ERROR")
    tags = value["defectTags"]
    if not isinstance(tags, list) or any(not isinstance(item, str) or not item for item in tags) or len(tags) != len(set(tags)):
        raise ServiceError(422, "VALIDATION_ERROR")

    result = phase2_price_advice(value)
    return {
        "status": result["status"],
        "intervalFen": {"lower": result["lowerFen"], "upper": result["upperFen"]},
        "confidence": "INSUFFICIENT" if result["status"] == "INSUFFICIENT_DATA" else "LOW",
        "factors": [{"code": item, "effect": "RULE_FACTOR", "explanation": _price_factor_description(item)}
                    for item in result["factors"]],
        "sampleSize": 0,
        "algorithmVersion": ALGORITHM_VERSIONS["price"],
        "disclaimer": PRICE_DISCLAIMER,
        "degraded": True,
        "degradationReason": "NO_ELIGIBLE_L3_LABELS",
    }


def _valid_trust_event(event: Any) -> bool:
    return (
        isinstance(event, dict)
        and event.get("type") in VALID_EVENT_TYPES
        and event.get("status") == "COMPLETED"
        and event.get("disputed") is False
        and event.get("invalid") is False
        and _integer(event.get("rating"), 1, 5)
    )


def trust_summary(payload: dict) -> dict:
    """Aggregate valid completed events with a neutral Bayesian prior."""
    value = _object(payload)
    if set(value) != {"events"} or not isinstance(value["events"], list) or len(value["events"]) > 10_000:
        raise ServiceError(422, "VALIDATION_ERROR")
    valid = [event for event in value["events"] if _valid_trust_event(event)]
    ignored = len(value["events"]) - len(valid)
    prior_score, prior_weight = 3.5, 5
    if not valid:
        return {
            "status": "NEW_USER_NEUTRAL",
            "score": prior_score,
            "validEventCount": 0,
            "ignoredEventCount": ignored,
            "smoothing": {"priorScore": prior_score, "priorWeight": prior_weight},
            "factors": [{"code": "NO_VALID_COMPLETED_EVENTS", "effect": "NEUTRAL_PRIOR"}],
            "algorithmVersion": ALGORITHM_VERSIONS["trust"],
        }
    score = round((prior_score * prior_weight + sum(event["rating"] for event in valid)) / (prior_weight + len(valid)), 2)
    return {
        "status": "AVAILABLE",
        "score": score,
        "validEventCount": len(valid),
        "ignoredEventCount": ignored,
        "smoothing": {"priorScore": prior_score, "priorWeight": prior_weight},
        "factors": [
            {"code": "VALID_COMPLETED_EVENTS", "effect": "AGGREGATED", "count": len(valid)},
            {"code": "BAYESIAN_SMOOTHING", "effect": "LIMIT_SMALL_SAMPLE_SWING"},
        ],
        "algorithmVersion": ALGORITHM_VERSIONS["trust"],
    }


def risk_clues(payload: dict) -> dict:
    """Emit explainable clues for manual review; never apply a penalty."""
    value = _object(payload)
    allowed = {"failedPaymentCount24h", "listingCount1h", "distinctCounterpartyCount24h", "sameDeviceAccountCount7d", "reportCount7d"}
    if set(value) != allowed or any(not _integer(value[name], 0, 1_000_000) for name in allowed):
        raise ServiceError(422, "VALIDATION_ERROR")
    before = deepcopy(value)
    rules = [
        ("REPEATED_PAYMENT_FAILURES", value["failedPaymentCount24h"] >= 3, "failedPaymentCount24h", value["failedPaymentCount24h"], 3),
        ("BURST_LISTING_ACTIVITY", value["listingCount1h"] >= 12, "listingCount1h", value["listingCount1h"], 12),
        ("COUNTERPARTY_BURST", value["distinctCounterpartyCount24h"] >= 8, "distinctCounterpartyCount24h", value["distinctCounterpartyCount24h"], 8),
        ("SHARED_DEVICE_CLUSTER", value["sameDeviceAccountCount7d"] >= 4, "sameDeviceAccountCount7d", value["sameDeviceAccountCount7d"], 4),
        ("RECENT_REPORT_CLUSTER", value["reportCount7d"] >= 3, "reportCount7d", value["reportCount7d"], 3),
    ]
    clues = [
        {"code": code, "field": field, "observed": observed, "threshold": threshold,
         "explanation": f"{field}={observed} 达到人工复核线 {threshold}"}
        for code, matched, field, observed, threshold in rules if matched
    ]
    if value != before:
        raise RuntimeError("risk baseline mutated input")
    return {
        "status": "CLUES_FOUND" if clues else "NO_RULE_CLUES",
        "clues": clues,
        "manualReviewRecommended": bool(clues),
        "recommendedAction": "MANUAL_REVIEW" if clues else "NONE",
        "enforcementExecuted": False,
        "algorithmVersion": ALGORITHM_VERSIONS["risk"],
        "disclaimer": "规则只生成风险线索，不代表违规结论，也不会自动处罚、封禁或修改业务对象。",
    }


def evaluate(task: str, payload: dict) -> dict:
    handlers = {"price": price_advice, "trust": trust_summary, "risk": risk_clues}
    if task not in handlers:
        raise ServiceError(404, "NOT_FOUND")
    return handlers[task](payload)
