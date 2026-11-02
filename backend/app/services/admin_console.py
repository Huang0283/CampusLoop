"""Administrator console aggregates: every figure is computed from live tables.

Day boundaries follow campus time (China Standard Time, the same rule as meetup
slots), so "today" on the dashboard matches what students see on the market.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.core.security import utcnow
from app.models import AuthAudit, Order, OrderEvent, Product, Report, User
from app.services.business_serializers import iso
from app.services.meetup_time import CAMPUS_TIMEZONE

CAMPUS_ZONE_NAME = "Asia/Shanghai"  # Fixed UTC+8, no daylight saving: equals CAMPUS_TIMEZONE.
HEATMAP_DAYS = 28
OPEN_REPORT = ("PENDING", "PROCESSING")
HANDLED_REPORT = ("RESOLVED", "REJECTED")
# Administrator decisions that change platform state; reads and replays are excluded.
DECISION_EVENTS = (
    "admin_product_moderate",
    "admin_report_resolve",
    "admin_report_override",
    "admin_user_disabled",
    "admin_user_active",
)


def campus_midnight(now: datetime) -> datetime:
    local = now.astimezone(CAMPUS_TIMEZONE)
    return local.replace(hour=0, minute=0, second=0, microsecond=0)


def local_day(column):
    return func.date(func.timezone(CAMPUS_ZONE_NAME, column))


def market_visible_on_sale():
    """Exactly the market's default listing filter (see routes.market.visible_products)."""
    return and_(
        Product.deleted_at.is_(None),
        Product.status == "ON_SALE",
        User.status == "ACTIVE",
    )


def count(db: Session, stmt) -> int:
    return int(db.scalar(stmt) or 0)


def created_between(column, start, end):
    return and_(column >= start, column < end)


def product_count(db, start, end) -> int:
    return count(
        db,
        select(func.count(Product.id)).where(
            Product.deleted_at.is_(None), created_between(Product.created_at, start, end)
        ),
    )


def order_count(db, start, end) -> int:
    return count(
        db, select(func.count(Order.id)).where(created_between(Order.created_at, start, end))
    )


def user_count(db, start, end) -> int:
    return count(
        db,
        select(func.count(User.id)).where(
            User.role == "USER", created_between(User.created_at, start, end)
        ),
    )


def completed_count(db, start, end) -> int:
    return count(
        db,
        select(func.count(func.distinct(OrderEvent.order_id))).where(
            OrderEvent.to_status == "COMPLETED", created_between(OrderEvent.created_at, start, end)
        ),
    )


def daily(db, column, where, start, end) -> dict[str, int]:
    day = local_day(column)
    rows = db.execute(
        select(day, func.count()).where(where, created_between(column, start, end)).group_by(day)
    ).all()
    return {value.isoformat(): int(total) for value, total in rows}


def trend(db, start, days):
    end = start + timedelta(days=days)
    products = daily(db, Product.created_at, Product.deleted_at.is_(None), start, end)
    orders = daily(db, Order.created_at, Order.id.isnot(None), start, end)
    completed = {}
    day = local_day(OrderEvent.created_at)
    for value, total in db.execute(
        select(day, func.count(func.distinct(OrderEvent.order_id)))
        .where(
            OrderEvent.to_status == "COMPLETED", created_between(OrderEvent.created_at, start, end)
        )
        .group_by(day)
    ).all():
        completed[value.isoformat()] = int(total)
    points = []
    for offset in range(days):
        key = (start + timedelta(days=offset)).date().isoformat()
        points.append(
            {
                "date": key,
                "newProducts": products.get(key, 0),
                "newOrders": orders.get(key, 0),
                "completedOrders": completed.get(key, 0),
            }
        )
    return points


def grouped(db, column, where):
    return [
        {"key": key, "count": int(total)}
        for key, total in db.execute(
            select(column, func.count()).where(where).group_by(column).order_by(func.count().desc())
        ).all()
    ]


def heatmap(db, now):
    start = campus_midnight(now) - timedelta(days=HEATMAP_DAYS - 1)
    local = func.timezone(CAMPUS_ZONE_NAME, Product.created_at)
    weekday = func.extract("isodow", local)
    hour = func.extract("hour", local)
    cells = [[0] * 24 for _ in range(7)]
    for dow, hr, total in db.execute(
        select(weekday, hour, func.count())
        .where(Product.deleted_at.is_(None), Product.created_at >= start)
        .group_by(weekday, hour)
    ).all():
        cells[int(dow) - 1][int(hr)] = int(total)
    return {"days": HEATMAP_DAYS, "cells": cells}


def health(db, start, end):
    window = created_between(Report.created_at, start, end)
    reports_total = count(db, select(func.count(Report.id)).where(window))
    handled = count(
        db, select(func.count(Report.id)).where(window, Report.status.in_(HANDLED_REPORT))
    )
    within_day = count(
        db,
        select(func.count(Report.id)).where(
            window,
            Report.status.in_(HANDLED_REPORT),
            Report.handled_at <= Report.created_at + timedelta(hours=24),
        ),
    )
    order_window = created_between(Order.created_at, start, end)
    closed = dict(
        db.execute(
            select(Order.status, func.count())
            .where(order_window, Order.status.in_(("COMPLETED", "CANCELLED", "DISPUTED")))
            .group_by(Order.status)
        ).all()
    )
    return {
        "reportsHandled": {"numerator": handled, "denominator": reports_total},
        "reportsHandledWithin24h": {"numerator": within_day, "denominator": handled},
        "ordersCompleted": {
            "numerator": int(closed.get("COMPLETED", 0)),
            "denominator": int(sum(closed.values())),
        },
    }


def report_targets(db, reports):
    product_ids = {item.target_id for item in reports if item.target_type == "PRODUCT"}
    user_ids = {item.target_id for item in reports if item.target_type == "USER"}
    titles = (
        dict(db.execute(select(Product.id, Product.title).where(Product.id.in_(product_ids))).all())
        if product_ids
        else {}
    )
    names = (
        dict(db.execute(select(User.id, User.nickname).where(User.id.in_(user_ids))).all())
        if user_ids
        else {}
    )

    def label(item):
        if item.target_type == "PRODUCT":
            return titles.get(item.target_id)
        if item.target_type == "USER":
            return names.get(item.target_id)
        return None

    return label


def todo(db, limit=8):
    reports = db.scalars(
        select(Report)
        .where(Report.status.in_(OPEN_REPORT))
        .order_by(Report.created_at.asc(), Report.id.asc())
        .limit(limit)
    ).all()
    reporters = (
        dict(
            db.execute(
                select(User.id, User.nickname).where(User.id.in_({r.reporter_id for r in reports}))
            ).all()
        )
        if reports
        else {}
    )
    label = report_targets(db, reports)
    items = [
        {
            "kind": "REPORT",
            "id": item.id,
            "status": item.status,
            "reason": item.reason,
            "targetType": item.target_type,
            "targetId": item.target_id,
            "targetTitle": label(item),
            "submittedBy": reporters.get(item.reporter_id),
            "createdAt": iso(item.created_at),
        }
        for item in reports
    ]
    disputes = db.execute(
        select(Order, Product.title)
        .join(Product, Product.id == Order.product_id)
        .where(Order.status == "DISPUTED")
        .order_by(Order.updated_at.asc(), Order.id.asc())
        .limit(limit)
    ).all()
    buyers = (
        dict(
            db.execute(
                select(User.id, User.nickname).where(User.id.in_({o.buyer_id for o, _ in disputes}))
            ).all()
        )
        if disputes
        else {}
    )
    items += [
        {
            "kind": "DISPUTE",
            "id": entity.id,
            "status": entity.status,
            "reason": None,
            "targetType": "ORDER",
            "targetId": entity.id,
            "targetTitle": title,
            "submittedBy": buyers.get(entity.buyer_id),
            "createdAt": iso(entity.updated_at or entity.created_at),
        }
        for entity, title in disputes
    ]
    return sorted(items, key=lambda item: item["createdAt"])[:limit]


def recent_orders(db, limit=6):
    buyer = User.__table__.alias("buyer")
    seller = User.__table__.alias("seller")
    rows = db.execute(
        select(
            Order.id,
            Order.status,
            Order.amount,
            Order.created_at,
            Product.title,
            Product.category,
            buyer.c.nickname,
            seller.c.nickname,
        )
        .join(Product, Product.id == Order.product_id)
        .join(buyer, buyer.c.id == Order.buyer_id)
        .join(seller, seller.c.id == Order.seller_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": identity,
            "status": status,
            "amount": float(amount),
            "createdAt": iso(created),
            "productTitle": title,
            "category": category,
            "buyerNickname": buyer_name,
            "sellerNickname": seller_name,
        }
        for identity, status, amount, created, title, category, buyer_name, seller_name in rows
    ]


def risk_users(db, start, limit=5):
    owner = select(Product.owner_id).where(Product.id == Report.target_id).scalar_subquery()
    subject = case(
        (Report.target_type == "USER", Report.target_id),
        (Report.target_type == "PRODUCT", owner),
        else_=None,
    ).label("subject")
    reported = (
        select(
            subject,
            func.count().label("total"),
            func.count().filter(Report.status.in_(OPEN_REPORT)).label("open"),
            func.max(Report.created_at).label("last"),
        )
        .where(Report.created_at >= start, Report.target_type.in_(("USER", "PRODUCT")))
        .group_by(subject)
        .subquery()
    )
    rows = db.execute(
        select(User, reported.c.total, reported.c.open, reported.c.last)
        .join(reported, reported.c.subject == User.id)
        .where(User.role == "USER")
        .order_by(reported.c.total.desc(), reported.c.last.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": user.id,
            "nickname": user.nickname,
            "avatar": user.avatar_url,
            "status": user.status,
            "reportCount": int(total),
            "openReportCount": int(opened),
            "lastReportedAt": iso(last),
        }
        for user, total, opened, last in rows
    ]


def audit_items(db, rows):
    people = {
        identity
        for row in rows
        for identity in (row.actor_id, row.target_id)
        if identity is not None
    }
    names = (
        dict(db.execute(select(User.id, User.nickname).where(User.id.in_(people))).all())
        if people
        else {}
    )
    items = []
    for row in rows:
        context = row.context or {}
        subject = None
        for key, kind in (("productId", "PRODUCT"), ("reportId", "REPORT")):
            if isinstance(context.get(key), int):
                subject = {"type": kind, "id": context[key]}
        if subject is None and row.target_id is not None:
            subject = {"type": "USER", "id": row.target_id}
        after = context.get("after") if isinstance(context.get("after"), dict) else {}
        items.append(
            {
                "id": row.id,
                "event": row.event,
                "decision": row.event in DECISION_EVENTS,
                "actor": {"id": row.actor_id, "nickname": names.get(row.actor_id)}
                if row.actor_id
                else None,
                "targetUser": {"id": row.target_id, "nickname": names.get(row.target_id)}
                if row.target_id
                else None,
                "subject": subject,
                "reason": context.get("reason") if isinstance(context.get("reason"), str) else None,
                "resultStatus": after.get("status")
                if isinstance(after.get("status"), str)
                else None,
                "createdAt": iso(row.created_at),
            }
        )
    return items


def audit_query(scope: str, actor_id: int | None = None):
    stmt = select(AuthAudit).where(AuthAudit.event.like("admin\\_%", escape="\\"))
    if scope == "decisions":
        stmt = stmt.where(AuthAudit.event.in_(DECISION_EVENTS))
    if actor_id is not None:
        stmt = stmt.where(AuthAudit.actor_id == actor_id)
    return stmt


def dashboard(db: Session, days: int) -> dict:
    now = utcnow()
    today = campus_midnight(now)
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)
    start = today - timedelta(days=days - 1)
    previous = start - timedelta(days=days)
    on_sale_filter = market_visible_on_sale()
    on_sale_rows = select(Product.category, func.count()).join(User, User.id == Product.owner_id)
    categories = [
        {"key": key, "count": int(total)}
        for key, total in db.execute(
            on_sale_rows.where(on_sale_filter)
            .group_by(Product.category)
            .order_by(func.count().desc())
        ).all()
    ]
    held = count(
        db,
        select(func.count(Product.id)).where(
            Product.deleted_at.is_(None), Product.moderation_blocked.is_(True)
        ),
    )
    open_reports = count(db, select(func.count(Report.id)).where(Report.status.in_(OPEN_REPORT)))
    disputed = count(db, select(func.count(Order.id)).where(Order.status == "DISPUTED"))
    return {
        "asOf": iso(now),
        "timezone": "+08:00",
        "days": days,
        "rangeStart": start.date().isoformat(),
        "products": {
            "newToday": product_count(db, today, tomorrow),
            "newYesterday": product_count(db, yesterday, today),
            "newInRange": product_count(db, start, tomorrow),
            "newPreviousRange": product_count(db, previous, start),
            "onSale": sum(item["count"] for item in categories),
            "moderationHeld": held,
        },
        "orders": {
            "newToday": order_count(db, today, tomorrow),
            "newYesterday": order_count(db, yesterday, today),
            "newInRange": order_count(db, start, tomorrow),
            "newPreviousRange": order_count(db, previous, start),
            "completedInRange": completed_count(db, start, tomorrow),
        },
        "users": {
            "total": count(db, select(func.count(User.id)).where(User.role == "USER")),
            "disabled": count(
                db,
                select(func.count(User.id)).where(User.role == "USER", User.status == "DISABLED"),
            ),
            "newInRange": user_count(db, start, tomorrow),
            "newPreviousRange": user_count(db, previous, start),
        },
        "pending": {
            "openReports": open_reports,
            "disputedOrders": disputed,
            "total": open_reports + disputed,
        },
        "trend": trend(db, start, days),
        "categories": categories,
        "orderStatuses": grouped(
            db, Order.status, created_between(Order.created_at, start, tomorrow)
        ),
        "reportReasons": grouped(
            db, Report.reason, created_between(Report.created_at, start, tomorrow)
        ),
        "postingHeatmap": heatmap(db, now),
        "health": health(db, start, tomorrow),
        "todo": todo(db),
        "recentOrders": recent_orders(db),
        "riskUsers": risk_users(db, start),
        "recentDecisions": audit_items(
            db,
            db.scalars(
                audit_query("decisions")
                .order_by(AuthAudit.created_at.desc(), AuthAudit.id.desc())
                .limit(5)
            ).all(),
        ),
    }


def order_search(query: str):
    term = query.strip()
    if not term:
        return None
    digits = term.removeprefix("#")
    title = Product.title.contains(term, autoescape=True)
    return or_(Order.id == int(digits), title) if digits.isdigit() and len(digits) <= 15 else title
