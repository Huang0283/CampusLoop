"""Validate the frozen rank reply against the caller's authoritative snapshot."""
import copy
import math

from scripts.m7_phase2.contract_check import digest
from scripts.m7_phase2.pipeline import hard_constraints
from .engine import validate_inputs


def _number(value):
    return type(value) in (int, float) and math.isfinite(value)


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def valid_response(value, payload, options):
    if not isinstance(value, dict) or set(value) != {"items", "metadata"}:
        return False
    items, metadata = value["items"], value["metadata"]
    fields = {"schemaVersion", "algorithmVersion", "tokenizerVersion", "dictionaryVersion", "dictionaryHash",
              "modelVersion", "mode", "quarantinedProductCount", "degraded", "fallbackReason", "asOf", "sort"}
    if not isinstance(items, list) or not isinstance(metadata, dict) or set(metadata) != fields:
        return False
    request, dictionary = payload["request"], payload["dictionary"]
    matching = request["task"] == "matching"
    disabled = options.get("mode", "keyword") == "semantic"
    expected = dict(schemaVersion="m7-baseline-result-v1", algorithmVersion="m7-match-v0" if matching else "m7-keyword-v0",
                    tokenizerVersion="m7-tokenizer-v0", dictionaryVersion=dictionary["version"],
                    dictionaryHash=digest("dictionary", dictionary), modelVersion=None,
                    mode="rule" if matching else "keyword", degraded=disabled,
                    fallbackReason="MODEL_DISABLED" if disabled else None,
                    asOf=request["context"]["asOf"], sort=options.get("sort", "relevance"))
    if (any(metadata[key] != value for key, value in expected.items())
            or type(metadata["degraded"]) is not bool
            or type(metadata["quarantinedProductCount"]) is not int):
        return False
    good = validate_inputs(payload["products"], request, dictionary)
    if metadata["quarantinedProductCount"] != len(payload["products"]) - len(good):
        return False
    by_id = {product["productId"]: product for product in good}
    constraint_request = copy.deepcopy(request)
    if not matching:
        constraint_request["context"].update(viewerId=None, campusId=None)
    query = bool(request["queryText"].strip())
    score_type = ("rule_match_v0" if query else "constraints_only") if matching else ("keyword_v0" if query else "unscored")
    seen = set()
    for item in items:
        if not isinstance(item, dict) or set(item) != {"productId", "productVersion", "relevanceScore", "scoreType", "reasons", "explanationDetails"}:
            return False
        pid = item["productId"]
        if not isinstance(pid, str) or pid not in by_id or pid in seen:
            return False
        seen.add(pid)
        product = by_id[pid]
        if (type(item["productVersion"]) is not int or item["productVersion"] != product["entityVersion"]
                or hard_constraints(constraint_request, product, dictionary)[1] != "eligible"):
            return False
        score = item["relevanceScore"]
        if query:
            if not _number(score) or not 0 <= score <= 1:
                return False
        elif score is not None:
            return False
        if item["scoreType"] != score_type or not isinstance(item["reasons"], list) or not item["reasons"] or not all(_text(x) for x in item["reasons"]):
            return False
        details = item["explanationDetails"]
        if not isinstance(details, list) or (query and not details):
            return False
        for detail in details:
            if (not isinstance(detail, dict)
                    or set(detail) != {"code", "kind", "field", "observed", "required", "contribution", "ruleVersion"}
                    or not all(_text(detail[k]) for k in ("code", "field", "ruleVersion"))
                    or detail["kind"] not in {"factor", "constraint"}
                    or (detail["contribution"] is not None and not _number(detail["contribution"]))):
                return False
    return True
