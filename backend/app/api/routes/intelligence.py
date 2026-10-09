from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import Field
from sqlalchemy import func, select

from app.api.routes.market import Page, PageSize
from app.core.config import get_settings
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import ChatSession, Order, Product, Report, Review, User, WantedPost
from app.schemas.auth import StrictInput
from app.services.auth import Actor, Db, administrator, audit
from app.services.business import load
from app.services.intelligence import CATEGORIES, CONDITIONS, rank_live

router = APIRouter(tags=["Intelligence"])


def call_advisory(task, payload):
    from services.m8_baseline.client import call, fallback
    from services.m8_baseline.engine import ServiceError

    settings = get_settings()
    if not settings.baseline_services_enabled or len(settings.baseline_rpc_token) < 32:
        return fallback(task, "SERVICE_DISABLED")
    try:
        return call(
            settings.m8_service_url, task, payload, settings.baseline_rpc_token, timeout=1.5
        )
    except ServiceError as exc:
        raise BusinessError(
            exc.status, exc.code, "Advisory input could not be processed."
        ) from None


@router.get("/users/{userId}/trust", operation_id="getUserTrust")
def trust(userId: int, db: Db):
    user = db.get(User, userId)
    if user is None or user.status != "ACTIVE":
        raise BusinessError(404, "NOT_FOUND", "User unavailable.")
    # Completed reviews are real observed ratings. Unrated trades are not invented 5-star events.
    ratings = db.scalars(
        select(Review.rating)
        .join(Order, Order.id == Review.order_id)
        .where(Review.reviewee_id == userId, Order.status == "COMPLETED")
        .order_by(Review.id)
        .limit(10001)
    ).all()
    if len(ratings) > 10000:
        raise BusinessError(503, "TRUST_CAPACITY_EXCEEDED", "Baseline event capacity exceeded.")
    result = call_advisory(
        "trust",
        {
            "events": [
                {
                    "type": "REVIEW",
                    "status": "COMPLETED",
                    "disputed": False,
                    "invalid": False,
                    "rating": value,
                }
                for value in ratings
            ]
        },
    )
    return ok(result)


@router.get("/admin/users/{userId}/risk-clues", operation_id="getUserRiskClues")
def risk(userId: int, db: Db, actor: Actor):
    administrator(actor)
    if db.get(User, userId) is None:
        raise BusinessError(404, "NOT_FOUND", "User unavailable.")
    now = utcnow()
    sessions = db.execute(
        select(ChatSession.buyer_id, ChatSession.seller_id).where(
            (ChatSession.buyer_id == userId) | (ChatSession.seller_id == userId),
            ChatSession.created_at >= now - timedelta(hours=24),
        )
    ).all()
    peers = {seller if buyer == userId else buyer for buyer, seller in sessions}
    product_ids = select(Product.id).where(Product.owner_id == userId)
    payload = {
        "failedPaymentCount24h": None,  # No payment gateway in the agreed MVP.
        "sameDeviceAccountCount7d": None,  # Device fingerprints are not collected.
        "listingCount1h": db.scalar(
            select(func.count())
            .select_from(Product)
            .where(Product.owner_id == userId, Product.created_at >= now - timedelta(hours=1))
        ),
        "distinctCounterpartyCount24h": len(peers),
        "reportCount7d": db.scalar(
            select(func.count())
            .select_from(Report)
            .where(
                Report.created_at >= now - timedelta(days=7),
                ((Report.target_type == "USER") & (Report.target_id == userId))
                | ((Report.target_type == "PRODUCT") & Report.target_id.in_(product_ids)),
            )
        ),
    }
    result = call_advisory("risk", payload)
    audit(db, "admin_risk_clues_read", actor.id, userId, context={"purpose": "manual_review"})
    db.commit()
    return ok({**result, "sourceWindowAsOf": now.isoformat()})


@router.get("/search", operation_id="searchProducts")
def search(
    query: str,
    db: Db,
    mode: Literal["keyword", "semantic", "hybrid"] = "keyword",
    page: Page = 1,
    pageSize: PageSize = 20,
    category: str = "",
    condition: str = "",
    minPrice: float | None = Query(default=None, ge=0),
    maxPrice: float | None = Query(default=None, ge=0),
    sort: Literal["relevance", "newest", "price_asc", "price_desc"] = "relevance",
):
    if not query.strip() or len(query) > 200:
        raise BusinessError(422, "VALIDATION_ERROR", "Query must contain 1 to 200 characters.")
    result, public, version = rank_live(
        db,
        query,
        mode=mode,
        sort=sort,
        filters={
            "category": category,
            "condition": condition,
            "minPrice": minPrice,
            "maxPrice": maxPrice,
        },
    )
    all_items = [public[int(item["productId"])] for item in result["items"]]
    metadata = result["metadata"]
    return ok(
        {
            "items": all_items[(page - 1) * pageSize : page * pageSize],
            "pagination": {"page": page, "pageSize": pageSize, "total": len(all_items)},
            "mode": "keyword",
            "degraded": metadata["degraded"],
            "degradationReason": metadata["fallbackReason"] or "",
            "resultVersion": version,
        }
    )


@router.get("/wanted/{wantedId}/matches", operation_id="listWantedMatches")
def matches(wantedId: int, db: Db, actor: Actor):
    entity = load(db, WantedPost, wantedId, lock=True)
    if entity.owner_id != actor.id:
        raise BusinessError(403, "FORBIDDEN", "Only wanted owner can view matches.")
    result, public, version = rank_live(db, entity.title, wanted=entity)
    return ok(
        {
            "items": [
                {
                    "product": public[int(item["productId"])],
                    "relevanceScore": min(1, max(0, item["relevanceScore"] or 0)),
                    "reasons": item["reasons"]
                    + [str(detail["code"]) for detail in item["explanationDetails"]],
                    "constraints": [
                        detail["code"]
                        for detail in item["explanationDetails"]
                        if detail["kind"] == "constraint"
                    ],
                    "resultVersion": version,
                    "expiresAt": entity.expires_at.isoformat(),
                }
                for item in result["items"]
            ],
            "degraded": result["metadata"]["degraded"],
            "degradationReason": result["metadata"]["fallbackReason"] or "",
        }
    )


class PriceInput(StrictInput):
    category: str
    condition: str
    title: str = ""
    description: str = ""
    originalPrice: float | int | None = Field(default=None, gt=0, le=99999999.99)


@router.post("/price-advice", operation_id="getPriceAdvice")
def price_advice(body: PriceInput, db: Db, actor: Actor):
    from services.m8_baseline.client import call, fallback
    from services.m8_baseline.engine import ServiceError

    settings = get_settings()
    payload = {
        "category": CATEGORIES.get(body.category, body.category),
        "condition": CONDITIONS.get(body.condition, body.condition),
        "originalPriceFen": round(body.originalPrice * 100)
        if body.originalPrice is not None
        else None,
        "purchaseAgeMonths": None,
        "accessoryState": "unknown",
        "defectTags": [],
    }
    try:
        result = (
            call(
                settings.m8_service_url, "price", payload, settings.baseline_rpc_token, timeout=1.5
            )
            if settings.baseline_services_enabled and len(settings.baseline_rpc_token) >= 32
            else fallback("price", "SERVICE_DISABLED")
        )
    except ServiceError as exc:
        raise BusinessError(exc.status, exc.code, "Price input could not be processed.") from None
    interval = result["intervalFen"]
    return ok(
        {
            "lower": interval["lower"] / 100 if interval["lower"] is not None else None,
            "upper": interval["upper"] / 100 if interval["upper"] is not None else None,
            "currency": "CNY",
            "status": result["status"],
            "factors": [factor["explanation"] for factor in result.get("factors", [])],
            "method": "unavailable" if interval["lower"] is None else "rule",
            "sampleSize": result.get("sampleSize", 0),
            "degraded": result.get("degraded", False),
            "degradationReason": result.get("degradationReason", ""),
            "disclaimer": result.get(
                "disclaimer",
                "Unavailable; enter a price manually. No guaranteed transaction price.",
            ),
            "resultVersion": result.get("algorithmVersion", "m8-unavailable-v1"),
        }
    )
