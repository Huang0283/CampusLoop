"""Map authoritative PostgreSQL records to the prepared, versioned rule services."""

import hashlib
import json
import sys
from pathlib import Path

from sqlalchemy import select

from app.core.config import get_settings
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import Product, User, WantedPost
from app.services.business_serializers import products

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


CONDITIONS = {
    "NEW": "new",
    "LIKE_NEW": "like_new",
    "GOOD": "good",
    "FAIR": "fair",
    "全新": "new",
    "九成新": "like_new",
    "八成新": "good",
    "七成新": "fair",
    "new": "new",
    "like-new": "like_new",
    "like_new": "like_new",
    "good": "good",
    "fair": "fair",
}
CATEGORIES = {
    "BOOKS": "books",
    "DIGITAL": "digital",
    "SPORTS": "sports",
    "DAILY": "household",
    "数码": "digital",
    "书籍": "books",
    "生活用品": "household",
    "宿舍": "household",
    "运动": "sports",
}


def input_snapshot(db, query, wanted: WantedPost | None = None, filters=None):
    if filters and filters.get("condition") and filters["condition"] not in CONDITIONS:
        raise BusinessError(422, "VALIDATION_ERROR", "Unsupported condition filter.")
    now = utcnow()
    entities = db.scalars(
        select(Product)
        .join(User, User.id == Product.owner_id)
        .where(Product.deleted_at.is_(None), Product.status == "ON_SALE", User.status == "ACTIVE")
        .order_by(Product.id)
        .limit(5001)
    ).all()
    if len(entities) > 5000:
        raise BusinessError(
            503, "SEARCH_CAPACITY_EXCEEDED", "Baseline candidate capacity exceeded."
        )
    snapshots = []
    for item in entities:
        snapshots.append(
            {
                "schemaVersion": "m7-processed-v1",
                "productId": str(item.id),
                "ownerId": str(item.owner_id),
                "catalogId": "live-catalog",
                "entityId": f"product-{item.id}",
                "nearDuplicateGroup": f"product-{item.id}",
                "title": item.title,
                "description": item.description,
                "categoryId": CATEGORIES.get(item.category, item.category),
                "priceFen": int(item.price * 100),
                "condition": CONDITIONS.get(item.condition),
                "campusId": "campusloop",
                "placeIds": [item.campus_location],
                "visibility": "public",
                "deleted": False,
                "status": item.status,
                "entityVersion": max(
                    1, int((item.updated_at or item.created_at).timestamp() * 1000000)
                ),
                "publishedAt": item.created_at.isoformat(),
                "updatedAt": (item.updated_at or item.created_at).isoformat(),
                "attributes": {"model": (item.attributes or {}).get("model")},
                "sourceRecordId": f"product-{item.id}",
            }
        )
    constraints = wanted.requirements or {} if wanted else {}
    condition = constraints.get("condition", "ANY")
    if isinstance(condition, list):
        raise BusinessError(
            422,
            "WANTED_CONSTRAINT_MIGRATION_REQUIRED",
            "Legacy wanted constraints require an owner edit.",
        )
    minimum_condition = None if condition == "ANY" else CONDITIONS.get(condition)
    if condition != "ANY" and minimum_condition is None:
        raise BusinessError(422, "VALIDATION_ERROR", "Unsupported condition constraint.")
    location = constraints.get("location", "ANY")
    dictionary = {
        "version": "live-dictionary-v1",
        "conditionRank": {"poor": 1, "fair": 2, "good": 3, "like_new": 4, "new": 5},
        "categoryIds": sorted(
            {p["categoryId"] for p in snapshots} | set(CATEGORIES.values()) | {"clothing", "other"}
        ),
        "placeIds": sorted(
            {p["placeIds"][0] for p in snapshots} | ({location} if location != "ANY" else set())
        ),
        "categoryNames": {p["categoryId"]: p["categoryId"] for p in snapshots},
    }
    request = {
        "schemaVersion": "m7-processed-v1",
        "requestId": "live-query",
        "catalogId": "live-catalog",
        "task": "matching" if wanted else "search",
        "templateGroup": "live-query",
        "queryText": query,
        "filters": {
            "categoryId": CATEGORIES.get(
                (filters or {}).get("category"), (filters or {}).get("category")
            )
            or None,
            "minPriceFen": int(wanted.budget_min * 100)
            if wanted and wanted.budget_min is not None
            else None,
            "maxPriceFen": int(wanted.budget_max * 100)
            if wanted and wanted.budget_max is not None
            else None,
            "minCondition": minimum_condition,
            "requiredPlaceIds": [] if location == "ANY" else [location],
            "requiredModel": None,
        },
        "context": {
            "viewerId": str(wanted.owner_id) if wanted else None,
            "campusId": None,
            "asOf": now.isoformat(),
        },
        "wanted": {
            "wantedId": str(wanted.id),
            "ownerId": str(wanted.owner_id),
            "status": wanted.status,
            "expiresAt": wanted.expires_at.isoformat() if wanted.expires_at else now.isoformat(),
            "entityVersion": max(
                1, int((wanted.updated_at or wanted.created_at).timestamp() * 1000000)
            ),
        }
        if wanted
        else None,
    }
    if not wanted and filters:
        for field, parameter in (("minPriceFen", "minPrice"), ("maxPriceFen", "maxPrice")):
            if filters.get(parameter) is not None:
                request["filters"][field] = round(filters[parameter] * 100)
        if filters.get("condition"):
            # Search's chosen condition is exact; matching uses the minimum condition rank.
            snapshots = [
                item
                for item in snapshots
                if item["condition"] == CONDITIONS.get(filters["condition"])
            ]
    return entities, {
        "schemaVersion": "m7-baseline-rpc-v1",
        "products": snapshots,
        "request": request,
        "dictionary": dictionary,
    }


def rank_live(
    db, query, wanted=None, mode="keyword", filters=None, sort="relevance", lock_candidates=False
):
    from services.m7_baseline.client import call_baseline
    from services.m7_baseline.engine import ServiceError, rank

    entities, payload = input_snapshot(db, query, wanted, filters)
    payload["options"] = {"mode": "semantic" if mode != "keyword" else "keyword", "sort": sort}
    settings = get_settings()
    try:
        if settings.baseline_services_enabled and len(settings.baseline_rpc_token) >= 32:
            result = call_baseline(
                settings.m7_service_url, payload, settings.baseline_rpc_token, timeout=1.5
            )
        else:
            result = rank(
                payload["products"], payload["request"], payload["dictionary"], **payload["options"]
            )
            result["metadata"].update(degraded=True, fallbackReason="SERVICE_DISABLED")
    except ServiceError as exc:
        raise BusinessError(
            exc.status, exc.code, "Baseline input could not be processed."
        ) from None
    # Re-read visibility after RPC, before public output; never return internal IDs blindly.
    ranked_ids = [int(item["productId"]) for item in result["items"]]
    fresh_query = select(Product)
    if lock_candidates:
        fresh_query = fresh_query.with_for_update(read=True, of=Product)
    fresh = db.scalars(
        fresh_query.join(User, User.id == Product.owner_id)
        .where(
            Product.id.in_(ranked_ids),
            Product.deleted_at.is_(None),
            Product.status == "ON_SALE",
            User.status == "ACTIVE",
        )
        .execution_options(populate_existing=True)
    ).all()
    public = {item["id"]: item for item in products(db, fresh)}
    versions = {
        item.id: max(1, int((item.updated_at or item.created_at).timestamp() * 1000000))
        for item in fresh
    }
    result["items"] = [
        item
        for item in result["items"]
        if int(item["productId"]) in public
        and item["productVersion"] == versions[int(item["productId"])]
    ]
    stable = {
        "input": payload["products"],
        "request": {k: v for k, v in payload["request"].items() if k != "context"},
        "algorithm": result["metadata"]["algorithmVersion"],
        "options": payload["options"],
    }
    version = hashlib.sha256(json.dumps(stable, sort_keys=True, default=str).encode()).hexdigest()
    if wanted and (
        wanted.status != "OPEN" or wanted.expires_at is None or wanted.expires_at <= utcnow()
    ):
        raise BusinessError(409, "WANTED_INACTIVE", "Wanted post is no longer active.")
    return result, public, version
