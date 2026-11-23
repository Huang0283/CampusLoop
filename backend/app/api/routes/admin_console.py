"""Administrator console: dashboard aggregates, order oversight and the decision log.

Reads are audited; disputed cancellations additionally retain immutable order events.
"""

from typing import Literal

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.routes.market import Page, PageSize
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.models import AuthAudit, Order, OrderEvent, Product
from app.schemas.moderation import DisputeCancel
from app.services import admin_console
from app.services import business_serializers as dto
from app.services.auth import Actor, Db, administrator, audit
from app.services.business import load
from app.services.governance import read_audit
from app.services.order_governance import cancel_reservation

router = APIRouter(tags=["Admin"])
OrderStatusFilter = Literal[
    "PENDING_CONFIRM", "BOOKED", "MEETUP_ARRANGED", "COMPLETED", "CANCELLED", "DISPUTED"
]


@router.get("/admin/dashboard", operation_id="adminGetDashboard")
def dashboard(db: Db, actor: Actor, days: int = 7):
    administrator(actor)
    # Query strings arrive as text; an int Literal would reject "7", so check explicitly.
    if days not in (7, 30):
        raise BusinessError(422, "VALIDATION_ERROR", "days must be 7 or 30.")
    data = admin_console.dashboard(db, days)
    read_audit(
        db,
        "admin_dashboard_read",
        actor.id,
        reason="dashboard_overview",
        snapshot={"days": days, "pending": data["pending"]},
    )
    db.commit()
    return ok(data)


@router.get("/admin/orders", operation_id="adminListOrders")
def orders(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    status: OrderStatusFilter | None = None,
    query: str = Query(default="", max_length=200),
):
    administrator(actor)
    stmt = select(Order).join(Product, Product.id == Order.product_id)
    if status:
        stmt = stmt.where(Order.status == status)
    condition = admin_console.order_search(query)
    if condition is not None:
        stmt = stmt.where(condition)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    entities = db.scalars(
        stmt.order_by(Order.created_at.desc(), Order.id.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    ).all()
    result = ok(
        {
            "items": dto.orders(db, list(entities)),
            "pagination": {"page": page, "pageSize": pageSize, "total": total},
        }
    )
    read_audit(
        db,
        "admin_orders_read",
        actor.id,
        reason="order_oversight",
        snapshot={str(item.id): {"status": item.status} for item in entities},
        page=page,
        pageSize=pageSize,
        status=status,
    )
    db.commit()
    return result


@router.get("/admin/orders/{orderId}/events", operation_id="adminListOrderEvents")
def order_events(orderId: int, db: Db, actor: Actor):
    administrator(actor)
    load(db, Order, orderId)
    rows = db.scalars(
        select(OrderEvent).where(OrderEvent.order_id == orderId).order_by(OrderEvent.id)
    ).all()
    result = ok(
        [
            {
                "id": row.id,
                "orderId": row.order_id,
                "operatorId": row.operator_id,
                "toStatus": row.to_status,
                "description": row.description,
                "createdAt": dto.iso(row.created_at),
                **({"fromStatus": row.from_status} if row.from_status else {}),
            }
            for row in rows
        ]
    )
    read_audit(
        db,
        "admin_order_events_read",
        actor.id,
        reason="order_oversight",
        snapshot={"orderId": orderId, "ids": [row.id for row in rows]},
    )
    db.commit()
    return result


@router.post("/admin/orders/{orderId}/cancel-dispute", operation_id="adminCancelDisputedOrder")
def cancel_dispute(orderId: int, body: DisputeCancel, db: Db, actor: Actor):
    administrator(actor)
    reference = load(db, Order, orderId)
    load(db, Product, reference.product_id, lock=True)
    entity = db.scalar(
        select(Order)
        .where(Order.id == orderId)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if entity.version != body.expectedVersion or entity.status != "DISPUTED":
        raise BusinessError(409, "ORDER_STATE_CONFLICT", "订单已更新，请刷新后重新核实。")
    reason = body.reason.strip()
    cancel_reservation(db, entity, actor, reason)
    audit(
        db,
        "admin_order_dispute_cancelled",
        actor.id,
        context={
            "orderId": entity.id,
            "reason": reason,
            "before": {"status": "DISPUTED", "version": body.expectedVersion},
            "after": {"status": entity.status, "version": entity.version},
        },
    )
    db.flush()
    result = ok(dto.order(db, entity))
    db.commit()
    return result


@router.get("/admin/audit-logs", operation_id="adminListAuditLogs")
def audit_logs(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    scope: Literal["decisions", "all"] = "decisions",
    mine: bool = False,
    days: int | None = None,
):
    administrator(actor)
    if days is not None and days not in (7, 30):
        raise BusinessError(422, "VALIDATION_ERROR", "days must be 7 or 30.")
    stmt = admin_console.audit_query(scope, actor.id if mine else None, days)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.order_by(AuthAudit.created_at.desc(), AuthAudit.id.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
    ).all()
    result = ok(
        {
            "items": admin_console.audit_items(db, list(rows)),
            "pagination": {"page": page, "pageSize": pageSize, "total": total},
        }
    )
    read_audit(
        db,
        "admin_audit_logs_read",
        actor.id,
        reason="decision_trail_review",
        snapshot={"scope": scope, "ids": [row.id for row in rows]},
        days=days,
        page=page,
        pageSize=pageSize,
    )
    db.commit()
    return result
