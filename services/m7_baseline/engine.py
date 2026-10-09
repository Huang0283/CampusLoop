"""Deterministic keyword baseline; returns internal IDs, never business DTOs."""
import copy
from datetime import datetime
import json
from pathlib import Path
import re
import unicodedata

from jsonschema import Draft202012Validator
from scripts.m7_phase2.contract_check import FORMATS
from scripts.m7_phase2.contract_check import digest
from scripts.m7_phase2.pipeline import hard_constraints


class ServiceError(ValueError):
    def __init__(self, status, code):
        super().__init__(code)
        self.status = status
        self.code = code


HAN = r"[\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0002fa1f]+"
WORD = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*|" + HAN)
HAN_WORD = re.compile(HAN)
ROOT = Path(__file__).resolve().parents[2]
DATA_SCHEMA = json.loads((ROOT / "schemas/m7-phase2/dataset.schema.json").read_text(encoding="utf-8"))
VALIDATORS = {kind: Draft202012Validator({"$ref": "#/$defs/" + kind, "$defs": DATA_SCHEMA["$defs"]},
                                       format_checker=FORMATS) for kind in ("product", "request")}


def validate_inputs(products, request, dictionary):
    if not VALIDATORS["request"].is_valid(request):
        raise ServiceError(422, "VALIDATION_ERROR")
    if not isinstance(products, list) or len(products) > 5000:
        raise ServiceError(422, "VALIDATION_ERROR")
    filters = request["filters"]
    if (filters["minPriceFen"] is not None and filters["maxPriceFen"] is not None
            and filters["minPriceFen"] > filters["maxPriceFen"]):
        raise ServiceError(422, "VALIDATION_ERROR")
    if not isinstance(dictionary, dict) or dictionary.get("conditionRank") != {
            "poor": 1, "fair": 2, "good": 3, "like_new": 4, "new": 5} or not dictionary.get("version"):
        raise ServiceError(503, "DEPENDENCY_UNAVAILABLE")
    if (not isinstance(dictionary["version"], str)
            or any(type(rank) is not int for rank in dictionary["conditionRank"].values())
            or any(not isinstance(dictionary.get(name), list) or any(not isinstance(v, str) for v in dictionary[name]) for name in ("categoryIds", "placeIds"))
            or not isinstance(dictionary.get("categoryNames", {}), dict)
            or any(not isinstance(k, str) or not isinstance(v, str) for k, v in dictionary.get("categoryNames", {}).items())):
        raise ServiceError(503, "DEPENDENCY_UNAVAILABLE")
    if filters["categoryId"] is not None and filters["categoryId"] not in dictionary.get("categoryIds", []):
        raise ServiceError(422, "VALIDATION_ERROR")
    if not set(filters["requiredPlaceIds"]) <= set(dictionary.get("placeIds", [])):
        raise ServiceError(422, "VALIDATION_ERROR")
    good = [p for p in products if VALIDATORS["product"].is_valid(p)]
    if products and not good:
        raise ServiceError(503, "DEPENDENCY_UNAVAILABLE")
    if len({p["productId"] for p in good}) != len(good):
        raise ServiceError(422, "VALIDATION_ERROR")
    return good


def tokens(text, *, indexing=False):
    text = unicodedata.normalize("NFKC", text).lower()
    result = []
    for match in WORD.finditer(text):
        word = match.group()
        if HAN_WORD.fullmatch(word):
            result.extend([word] if len(word) == 1 else [word[i:i + 2] for i in range(len(word) - 1)])
            if indexing:
                result.extend(word)
        else:
            result.append(word)
    return list(dict.fromkeys(result))


class KeywordIndex:
    def __init__(self, products, dictionary):
        self.products = {p["productId"]: p for p in products}
        self.weights = {}
        for product in products:
            fields = [(product["title"], 4), (product["attributes"]["model"] or "", 2),
                      (dictionary.get("categoryNames", {}).get(product["categoryId"], ""), 2),
                      (product["description"], 1)]
            for text, weight in fields:
                for term in tokens(text, indexing=True):
                    posting = self.weights.setdefault(term, {})
                    pid = product["productId"]
                    posting[pid] = posting.get(pid, 0) + weight

    def query(self, terms):
        numerators = {}
        for term in terms:
            for pid, weight in self.weights.get(term, {}).items():
                numerators[pid] = numerators.get(pid, 0) + weight
        return {pid: value / (9 * len(terms)) for pid, value in numerators.items()}


def rank(products, request, dictionary, *, mode="keyword", sort="relevance"):
    if sort not in ("relevance", "newest", "price_asc", "price_desc") or mode not in ("keyword", "semantic"):
        raise ServiceError(422, "VALIDATION_ERROR")
    supplied_count = len(products) if isinstance(products, list) else 0
    products = validate_inputs(products, request, dictionary)
    quarantined = supplied_count - len(products)
    request = copy.deepcopy(request)
    if request["task"] == "matching":
        wanted = request["wanted"]
        if wanted is None:
            raise ServiceError(422, "VALIDATION_ERROR")
        if request["context"]["viewerId"] is None:
            raise ServiceError(401, "UNAUTHORIZED")
        if request["context"]["viewerId"] != wanted["ownerId"]:
            raise ServiceError(403, "FORBIDDEN")
        if wanted["status"] != "OPEN" or datetime.fromisoformat(wanted["expiresAt"].replace("Z", "+00:00")) <= datetime.fromisoformat(request["context"]["asOf"].replace("Z", "+00:00")):
            raise ServiceError(409, "WANTED_INACTIVE")
    if request["task"] == "search":
        request["context"].update(viewerId=None, campusId=None)
    products = [p for p in products if hard_constraints(request, p, dictionary)[1] == "eligible"]
    terms = tokens(request["queryText"])
    if not terms and request["queryText"].strip():
        raise ServiceError(422, "EMPTY_SEARCH_TERMS")
    index = KeywordIndex(products, dictionary)
    scores = index.query(terms) if terms else {}
    if request["task"] == "matching" or not terms:
        scores = {p["productId"]: scores.get(p["productId"], 0.0) if terms else None for p in products}
    def order(pid):
        product = index.products[pid]
        published = datetime.fromisoformat(product["publishedAt"].replace("Z", "+00:00")).timestamp()
        if sort == "newest":
            return (-published, int(pid))
        if sort in {"price_asc", "price_desc"}:
            return (product["priceFen"] * (1 if sort == "price_asc" else -1), int(pid))
        return (-(scores[pid] or 0), -published, int(pid))
    ordered = sorted(scores, key=order)
    items = []
    for pid in ordered:
        product = index.products[pid]
        score = scores[pid]
        details = [{"code": "TEXT_MATCH", "kind": "factor", "field": "text",
                    "observed": [t for t in terms if pid in index.weights.get(t, {})],
                    "required": terms, "contribution": score, "ruleVersion": "keyword-v0"}] if terms else []
        filters = request["filters"]
        facts = []
        if filters["minPriceFen"] is not None or filters["maxPriceFen"] is not None:
            facts.append(("BUDGET_MATCH", "priceFen", product["priceFen"],
                          {"min": filters["minPriceFen"], "max": filters["maxPriceFen"]}))
        if filters["categoryId"] is not None:
            facts.append(("CATEGORY_MATCH", "categoryId", product["categoryId"], filters["categoryId"]))
        if filters["minCondition"] is not None:
            facts.append(("CONDITION_MATCH", "conditionRank", dictionary["conditionRank"][product["condition"]],
                          dictionary["conditionRank"][filters["minCondition"]]))
        if filters["requiredPlaceIds"]:
            facts.append(("LOCATION_MATCH", "placeIds", product["placeIds"], filters["requiredPlaceIds"]))
        for code, field, observed, required in facts:
            details.append({"code": code, "kind": "constraint", "field": field, "observed": observed,
                            "required": required, "contribution": None, "ruleVersion": "match-v0"})
        items.append({"productId": pid, "productVersion": product["entityVersion"], "relevanceScore": score,
                      "scoreType": ("rule_match_v0" if terms else "constraints_only")
                      if request["task"] == "matching" else ("keyword_v0" if terms else "unscored"),
                      "reasons": ["关键词规则评分" if terms else "仅条件匹配"], "explanationDetails": details})
    return {"items": items, "metadata": {
        "schemaVersion": "m7-baseline-result-v1", "algorithmVersion": "m7-match-v0" if request["task"] == "matching" else "m7-keyword-v0",
        "tokenizerVersion": "m7-tokenizer-v0", "dictionaryVersion": dictionary["version"],
        "dictionaryHash": digest("dictionary", dictionary), "modelVersion": None, "mode": "rule" if request["task"] == "matching" else "keyword",
        "quarantinedProductCount": quarantined,
        "degraded": mode == "semantic", "fallbackReason": "MODEL_DISABLED" if mode == "semantic" else None,
        "asOf": request["context"]["asOf"], "sort": sort}}
