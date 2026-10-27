"""Administrator-only moderation and explicit trust visibility boundaries."""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query
from pydantic import AwareDatetime, Field, field_validator
from sqlalchemy import func, select

from app.api.routes.intelligence import trust_data
from app.api.routes.market import Page, PageSize
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import Product, Report
from app.schemas.auth import StrictInput
from app.services import business_serializers as dto
from app.services.auth import Actor, Db, administrator, audit
from app.services.business import load, notify
from app.services.governance import (
    admin_idempotent,
    admin_report,
    read_audit,
    report_snapshot,
    trust_view,
)

router = APIRouter(tags=["Governance"])
Key = Annotated[str | None, Header(alias="Idempotency-Key")]
ReadReason = Annotated[str, Query(min_length=1, max_length=500, pattern=r"\S")]


def product_snapshot(entity):
    return {
        "status": entity.status,
        "moderationBlocked": entity.moderation_blocked,
        "updatedAt": dto.iso(entity.updated_at or entity.created_at),
    }


def admin_products_dto(db, entities):
    values = dto.products(db, entities)
    return [
        {"product": value, "moderationBlocked": entity.moderation_blocked}
        for entity, value in zip(entities, values, strict=True)
    ]


@router.get("/admin/products", operation_id="adminListProducts")
def product_queue(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    query: str = "",
    status: Literal["ON_SALE", "HIDDEN", "RESERVED", "SOLD"] | None = None,
    reason: ReadReason = "product_queue_review",
):
    administrator(actor)
    stmt = select(Product).where(Product.deleted_at.is_(None))
    if query:
        stmt = stmt.where(Product.title.contains(query, autoescape=True))
    if status:
        stmt = stmt.where(Product.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    entities = db.scalars(
        stmt.order_by(Product.id.desc()).offset((page - 1) * pageSize).limit(pageSize)
    ).all()
    read_audit(
        db,
        "admin_products_read",
        actor.id,
        reason=reason,
        snapshot={str(item.id): product_snapshot(item) for item in entities},
        page=page,
        pageSize=pageSize,
    )
    result = ok(
        {
            "items": admin_products_dto(db, entities),
            "pagination": {"page": page, "pageSize": pageSize, "total": total},
        }
    )
    db.commit()
    return result


@router.get("/admin/products/{productId}", operation_id="adminGetProduct")
def product_detail(
    productId: int, db: Db, actor: Actor, reason: ReadReason = "product_detail_review"
):
    administrator(actor)
    item = load(db, Product, productId)
    if item.deleted_at:
        raise BusinessError(404, "NOT_FOUND", "Product was deleted by its owner.")
    read_audit(
        db,
        "admin_product_read",
        actor.id,
        reason=reason,
        snapshot=product_snapshot(item),
        productId=item.id,
    )
    result = ok(admin_products_dto(db, [item])[0])
    db.commit()
    return result


class ProductModeration(StrictInput):
    hidden: bool
    reason: str = Field(min_length=1, max_length=500)
    expectedUpdatedAt: AwareDatetime

    @field_validator("reason")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("A manual decision requires a reason.")
        return value.strip()

    @field_validator("expectedUpdatedAt", mode="before")
    @classmethod
    def parse_timestamp(cls, value):
        return (
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            if isinstance(value, str)
            else value
        )


@router.post("/admin/products/{productId}/moderation", operation_id="adminModerateProduct")
def moderate_product(
    productId: int, body: ProductModeration, db: Db, actor: Actor, idempotency_key: Key = None
):
    def action():
        item = load(db, Product, productId, lock=True)
        if item.deleted_at or item.status in ("RESERVED", "SOLD"):
            raise BusinessError(
                409,
                "PRODUCT_STATE_CONFLICT",
                "Deleted or trading goods cannot be moderated by this action.",
            )
        if (item.updated_at or item.created_at) != body.expectedUpdatedAt:
            raise BusinessError(409, "PRODUCT_STALE", "商品已变更，请刷新详情后再处理。")
        if (
            body.hidden
            and item.status != "ON_SALE"
            or not body.hidden
            and not item.moderation_blocked
        ):
            raise BusinessError(
                409,
                "PRODUCT_STATE_CONFLICT",
                "Only an on-sale listing can be hidden, and only a moderation hold can be restored.",
            )
        before = product_snapshot(item)
        item.moderation_blocked = body.hidden
        item.status = "HIDDEN" if body.hidden else "ON_SALE"
        item.updated_at = utcnow()
        db.flush()
        audit(
            db,
            "admin_product_moderate",
            actor.id,
            context={
                "productId": item.id,
                "reason": body.reason,
                "before": before,
                "after": product_snapshot(item),
                "enforcementExecuted": True,
            },
        )
        return ok(admin_products_dto(db, [item])[0])

    return admin_idempotent(
        db,
        actor,
        f"product:{productId}:moderation",
        idempotency_key,
        body.model_dump(mode="json"),
        action,
        replay_audit=lambda cached: read_audit(
            db,
            "admin_product_replay",
            actor.id,
            reason=body.reason,
            snapshot={
                "status": cached["product"]["status"],
                "moderationBlocked": cached["moderationBlocked"],
            },
            productId=productId,
        ),
    )


@router.get("/users/me/trust", operation_id="getMyTrust")
def own_trust(db: Db, actor: Actor):
    return ok(trust_view(trust_data(actor.id, db), "SELF"))


@router.get("/admin/users/{userId}/trust", operation_id="adminGetUserTrust")
def admin_trust(userId: int, db: Db, actor: Actor, reason: ReadReason = "manual_review"):
    administrator(actor)
    result = trust_view(trust_data(userId, db, allow_disabled=True), "ADMIN")
    read_audit(
        db,
        "admin_trust_read",
        actor.id,
        target_id=userId,
        reason=reason,
        snapshot={"status": result["status"], "score": result.get("score")},
    )
    db.commit()
    return ok(result)


@router.get("/admin/reports", operation_id="adminListReports")
def report_queue(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    status: Literal["PENDING", "PROCESSING", "RESOLVED", "REJECTED"] | None = None,
    reason: ReadReason = "report_queue_review",
):
    administrator(actor)
    query = select(Report)
    if status:
        query = query.where(Report.status == status)
    reports = db.scalars(
        query.order_by(Report.created_at.desc(), Report.id.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    ).all()
    read_audit(
        db,
        "admin_reports_read",
        actor.id,
        reason=reason,
        snapshot={str(item.id): report_snapshot(item) for item in reports},
        page=page,
        pageSize=pageSize,
        status=status,
    )
    result = ok([admin_report(item) for item in reports])
    db.commit()
    return result


class Resolution(StrictInput):
    resolution: Literal["RESOLVED", "REJECTED"]
    note: str = Field(min_length=1, max_length=1000)

    @field_validator("note")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("A manual decision requires a reason.")
        return value.strip()


class Override(Resolution):
    expectedStatus: Literal["RESOLVED", "REJECTED"]
    expectedHandledAt: AwareDatetime

    @field_validator("expectedHandledAt", mode="before")
    @classmethod
    def parse_timestamp(cls, value):
        # StrictInput receives decoded JSON, where RFC 3339 dates are strings.
        # Parse strings explicitly while retaining timezone and type validation.
        return (
            datetime.fromisoformat(value.replace("Z", "+00:00"))
            if isinstance(value, str)
            else value
        )


def decide(db, actor, report_id, body, key, *, override=False):
    def action():
        entity = load(db, Report, report_id, lock=True)
        before = report_snapshot(entity)
        if override:
            if entity.status != body.expectedStatus or entity.handled_at != body.expectedHandledAt:
                raise BusinessError(409, "REPORT_STALE", "Reload the report before overriding.")
        elif entity.status not in ("PENDING", "PROCESSING"):
            raise BusinessError(409, "REPORT_ALREADY_HANDLED", "Use explicit manual override.")
        entity.status = body.resolution
        entity.handled_by = actor.id
        entity.handled_at = utcnow()
        entity.resolution_note = body.note
        db.flush()
        notify(
            db,
            entity.reporter_id,
            "REPORT_RESULT",
            "/report",
            "举报已处理" if body.resolution == "RESOLVED" else "举报已驳回",
            f"处理说明：{body.note}",
        )
        audit(
            db,
            "admin_report_override" if override else "admin_report_resolve",
            actor.id,
            context={
                "reportId": entity.id,
                "reason": body.note,
                "before": before,
                "after": report_snapshot(entity),
                "enforcementExecuted": False,
            },
        )
        return ok(admin_report(entity))

    return admin_idempotent(
        db,
        actor,
        f"report:{report_id}:" + ("override" if override else "resolve"),
        key,
        body.model_dump(mode="json"),
        action,
    )


@router.post("/admin/reports/{reportId}/resolve", operation_id="resolveReport")
def resolve(reportId: int, body: Resolution, db: Db, actor: Actor, idempotency_key: Key = None):
    return decide(db, actor, reportId, body, idempotency_key)


@router.post("/admin/reports/{reportId}/override", operation_id="overrideReport")
def override(reportId: int, body: Override, db: Db, actor: Actor, idempotency_key: Key = None):
    return decide(db, actor, reportId, body, idempotency_key, override=True)
