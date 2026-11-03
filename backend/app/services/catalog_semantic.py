"""Live search integration, independent of frozen M7 evaluation/deployment records."""

import json
import math
import urllib.request
from datetime import datetime

from app.core.config import get_settings
from app.services.catalog_search import query_scope, refine_search

VERSION = "live-bge-small-zh-v1"


def semantic_search(payload, keyword, query, mode, sort, semantic_query=None):
    settings = get_settings()
    if not settings.catalog_semantic_url:
        raise ValueError("MODEL_DISABLED")
    from scripts.m7_phase2.pipeline import hard_constraints

    candidates = [
        p
        for p in payload["products"]
        if hard_constraints(payload["request"], p, payload["dictionary"])[1] == "eligible"
    ]
    docs = [
        {"id": p["productId"], "text": p["title"] + "。" + p.get("description", "")}
        for p in candidates
    ]
    request = urllib.request.Request(
        settings.catalog_semantic_url.rstrip("/") + "/score",
        json.dumps(
            {"query": semantic_query or query, "documents": docs}, ensure_ascii=False
        ).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + settings.baseline_rpc_token,
        },
    )
    with urllib.request.urlopen(request, timeout=3) as response:
        scored = json.load(response)
    scores = scored["scores"]
    if scored.get("version") != VERSION or set(scores) != {d["id"] for d in docs}:
        raise ValueError("INVALID_SERVICE_RESPONSE")
    if any(
        type(s) not in (float, int) or not math.isfinite(s) or not -1.001 <= s <= 1.001
        for s in scores.values()
    ):
        raise ValueError("INVALID_SERVICE_RESPONSE")

    by_id = {p["productId"]: p for p in candidates}
    lexical = refine_search(
        {"items": list(keyword["items"])}, payload["products"], query, "relevance"
    )["items"]
    lexical_ids = {p["productId"] for p in lexical}
    # A concrete product name with known matches stays within that relevant set;
    # natural-language queries without literal matches use model similarity.
    threshold = max(0.40, max(scores.values(), default=0) - 0.06)
    anchor_categories = {by_id[pid]["categoryId"] for pid in lexical_ids}
    selected = [
        pid
        for pid, score in scores.items()
        if query_scope(by_id[pid], query)
        and (
            pid in lexical_ids
            or (
                score >= threshold
                and (not anchor_categories or by_id[pid]["categoryId"] in anchor_categories)
            )
        )
    ]
    keyword_rank = {p["productId"]: i for i, p in enumerate(lexical)}
    vector_rank = {
        pid: i for i, pid in enumerate(sorted(selected, key=lambda pid: (-scores[pid], int(pid))))
    }

    def order(pid):
        product = by_id[pid]
        if sort == "newest":
            return (-datetime.fromisoformat(product["publishedAt"]).timestamp(), int(pid))
        if sort in ("price_asc", "price_desc"):
            return (product["priceFen"] * (1 if sort == "price_asc" else -1), int(pid))
        relevance = (
            scores[pid]
            if mode == "semantic"
            else 1 / (60 + vector_rank[pid])
            + (1 / (60 + keyword_rank[pid]) if pid in keyword_rank else 0)
        )
        return (-relevance, int(pid))

    selected.sort(key=order)
    return {
        "items": [
            {
                "productId": pid,
                "productVersion": by_id[pid]["entityVersion"],
                "relevanceScore": max(0, min(1, scores[pid])),
                "reasons": ["名称和简介的语义相关"],
                "explanationDetails": [],
            }
            for pid in selected
        ],
        "metadata": {
            **keyword["metadata"],
            "algorithmVersion": VERSION,
            "mode": mode,
            "degraded": False,
            "fallbackReason": None,
        },
    }
