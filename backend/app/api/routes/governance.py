"""Administrator-only moderation and explicit trust visibility boundaries."""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query
from pydantic import AwareDatetime, Field, field_validator
from sqlalchemy import select

from app.api.routes.intelligence import trust_data
from app.api.routes.market import Page, PageSize
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import Report
from app.schemas.auth import StrictInput
from app.services.auth import Actor, Db, administrator, audit
from app.services.business import load
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
        db.flush()
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
