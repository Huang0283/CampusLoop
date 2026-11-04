"""Account notices and one reviewed appeal per decision, including disabled accounts."""

from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query, UploadFile
from sqlalchemy import func, select

from app.api.routes.media import image_response
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import AccountAppeal, AccountDecision, User
from app.schemas.moderation import AppealReview, AppealWrite, DecisionWrite
from app.services.appeal_access import AppealActor
from app.services.auth import Actor, Db, administrator, audit
from app.services.business import notify
from app.services.governance import admin_idempotent, read_audit
from app.services.moderation import (
    appeal_dto,
    conclude_appeal,
    decision_dto,
    record_decision,
    target_user,
)
from app.services.storage import owned_keys, upload

router = APIRouter(tags=["Governance"])
Key = Annotated[str | None, Header(alias="Idempotency-Key")]
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def decision_for(db, decision_id, user_id):
    decision = db.scalar(
        select(AccountDecision).where(
            AccountDecision.id == decision_id, AccountDecision.user_id == user_id
        )
    )
    if not decision:
        raise BusinessError(404, "NOT_FOUND", "处理记录不存在。")
    return decision


def decision_list(db, user_id, page, page_size):
    stmt = select(AccountDecision).where(AccountDecision.user_id == user_id)
    decisions = db.scalars(
        stmt.order_by(AccountDecision.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    appeals = {
        item.decision_id: item
        for item in db.scalars(
            select(AccountAppeal).where(
                AccountAppeal.decision_id.in_([item.id for item in decisions])
            )
        )
    }
    return {
        "items": [decision_dto(item, appeals.get(item.id)) for item in decisions],
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": db.scalar(select(func.count()).select_from(stmt.subquery())),
        },
    }


@router.get("/account/decisions", operation_id="listAccountDecisions")
def own_decisions(db: Db, actor: AppealActor, page: Page = 1, pageSize: PageSize = 20):
    return ok(decision_list(db, actor.id, page, pageSize))


@router.get("/account/decisions/{decisionId}", operation_id="getAccountDecision")
def own_decision(decisionId: int, db: Db, actor: AppealActor):
    decision = decision_for(db, decisionId, actor.id)
    appeal = db.scalar(select(AccountAppeal).where(AccountAppeal.decision_id == decision.id))
    return ok(decision_dto(decision, appeal))


@router.post("/account/decisions/{decisionId}/appeal", operation_id="submitAccountAppeal")
def submit_appeal(decisionId: int, body: AppealWrite, db: Db, actor: AppealActor):
    decision = decision_for(db, decisionId, actor.id)
    if decision.revoked_at:
        raise BusinessError(409, "DECISION_REVOKED", "该处理已撤销，无需再次申诉。")
    keys = owned_keys(db, actor, body.evidence, "evidence")
    prior = db.scalar(select(AccountAppeal).where(AccountAppeal.decision_id == decision.id))
    if prior:
        if prior.explanation == body.explanation.strip() and prior.evidence == keys:
            return ok(appeal_dto(prior))
        raise BusinessError(409, "APPEAL_EXISTS", "该处理已有申诉，请查看复核进度。")
    appeal = AccountAppeal(
        decision_id=decision.id, explanation=body.explanation.strip(), evidence=keys
    )
    db.add(appeal)
    db.flush()
    # FK insertion must not lock other administrators; their next poll sees this notice.
    for admin_id in db.scalars(
        select(User.id).where(User.role == "ADMIN", User.status == "ACTIVE")
    ):
        notify(
            db,
            admin_id,
            "APPEAL_RECEIVED",
            f"/admin/appeals?appeal={appeal.id}",
            "收到账号申诉",
            f"处理记录 #{decision.id} 有待复核申诉。",
        )
    audit(
        db,
        "account_appeal_submitted",
        actor.id,
        context={"decisionId": decision.id, "appealId": appeal.id},
    )
    result = ok(appeal_dto(appeal))
    db.commit()
    return result


@router.post("/account/appeals/images", status_code=201, operation_id="uploadAppealImage")
def appeal_image(file: UploadFile, db: Db, actor: AppealActor):
    return ok(upload(db, actor, file.file.read(5 * 1024 * 1024 + 1), "evidence"))


@router.get(
    "/account/decisions/{decisionId}/evidence/{imageIndex}", operation_id="getDecisionEvidence"
)
def own_evidence(decisionId: int, imageIndex: int, db: Db, actor: AppealActor):
    decision = decision_for(db, decisionId, actor.id)
    if imageIndex < 0 or imageIndex >= len(decision.evidence):
        raise BusinessError(404, "NOT_FOUND", "证据不存在。")
    return image_response(decision.evidence[imageIndex])


@router.get(
    "/account/appeals/{appealId}/evidence/{imageIndex}", operation_id="getOwnAppealEvidence"
)
def own_appeal_evidence(appealId: int, imageIndex: int, db: Db, actor: AppealActor):
    appeal = db.get(AccountAppeal, appealId)
    if not appeal:
        raise BusinessError(404, "NOT_FOUND", "申诉不存在。")
    decision_for(db, appeal.decision_id, actor.id)
    if imageIndex < 0 or imageIndex >= len(appeal.evidence):
        raise BusinessError(404, "NOT_FOUND", "证据不存在。")
    return image_response(appeal.evidence[imageIndex])


@router.get("/admin/users/{userId}/decisions", operation_id="adminListAccountDecisions")
def admin_decisions(userId: int, db: Db, actor: Actor, page: Page = 1, pageSize: PageSize = 20):
    administrator(actor)
    result = ok(decision_list(db, userId, page, pageSize))
    read_audit(
        db,
        "admin_account_decisions_read",
        actor.id,
        target_id=userId,
        reason="account_decision_review",
        snapshot={"ids": [item["id"] for item in result["data"]["items"]]},
    )
    db.commit()
    return result


@router.post(
    "/admin/users/{userId}/decisions", status_code=201, operation_id="adminCreateAccountDecision"
)
def create_decision(userId: int, body: DecisionWrite, db: Db, actor: Actor, key: Key = None):
    administrator(actor)

    def action():
        user = target_user(db, userId, actor)
        if user.status != "ACTIVE":
            raise BusinessError(
                409, "ACCOUNT_STATE_CONFLICT", "账号已被禁用，请先查看现有处理记录。"
            )
        decision = record_decision(
            db,
            user,
            actor,
            action=body.action,
            reason=body.reason,
            facts=body.facts,
            basis=body.basis,
            occurred_at=body.occurredAt,
            product_id=body.productId,
            evidence=body.evidence,
        )
        return ok(decision_dto(decision))

    return admin_idempotent(
        db,
        actor,
        f"account-decision:{userId}",
        key,
        body.model_dump(mode="json"),
        action,
        replay_audit=lambda result: read_audit(
            db,
            "admin_account_decision_replay",
            actor.id,
            target_id=userId,
            reason=body.reason,
            snapshot={"decisionId": result["id"]},
        ),
    )


def admin_appeal_dto(db, appeal, decision=None, user=None):
    decision = decision if decision is not None else db.get(AccountDecision, appeal.decision_id)
    user = user if user is not None else db.get(User, decision.user_id)
    return {
        "appeal": appeal_dto(appeal),
        "decision": decision_dto(decision, appeal),
        "user": {"id": user.id, "nickname": user.nickname, "status": user.status},
    }


@router.get("/admin/appeals", operation_id="adminListAccountAppeals")
def appeals(
    db: Db,
    actor: Actor,
    page: Page = 1,
    pageSize: PageSize = 20,
    status: Literal["PENDING", "UPHELD", "REVOKED"] | None = None,
):
    administrator(actor)
    stmt = (
        select(AccountAppeal, AccountDecision, User)
        .join(AccountDecision, AccountDecision.id == AccountAppeal.decision_id)
        .join(User, User.id == AccountDecision.user_id)
    )
    if status:
        stmt = stmt.where(AccountAppeal.status == status)
    rows = db.execute(
        stmt.order_by(AccountAppeal.id.desc()).offset((page - 1) * pageSize).limit(pageSize)
    ).all()
    result = ok(
        {
            "items": [
                admin_appeal_dto(db, appeal, decision, user) for appeal, decision, user in rows
            ],
            "pagination": {
                "page": page,
                "pageSize": pageSize,
                "total": db.scalar(select(func.count()).select_from(stmt.subquery())),
            },
        }
    )
    read_audit(
        db,
        "admin_account_appeals_read",
        actor.id,
        reason="account_appeal_queue",
        snapshot={"ids": [appeal.id for appeal, _, _ in rows]},
    )
    db.commit()
    return result


@router.get("/admin/appeals/{appealId}", operation_id="adminGetAccountAppeal")
def appeal_detail(appealId: int, db: Db, actor: Actor):
    administrator(actor)
    appeal = db.get(AccountAppeal, appealId)
    if not appeal:
        raise BusinessError(404, "NOT_FOUND", "申诉不存在。")
    result = ok(admin_appeal_dto(db, appeal))
    read_audit(
        db,
        "admin_account_appeal_read",
        actor.id,
        reason="account_appeal_review",
        snapshot={"appealId": appeal.id, "status": appeal.status},
    )
    db.commit()
    return result


@router.post("/admin/appeals/{appealId}/review", operation_id="adminReviewAccountAppeal")
def review(appealId: int, body: AppealReview, db: Db, actor: Actor):
    administrator(actor)
    reference = db.get(AccountAppeal, appealId)
    if not reference:
        raise BusinessError(404, "NOT_FOUND", "申诉不存在。")
    decision_ref = db.get(AccountDecision, reference.decision_id)
    # Same target-user -> decision -> appeal lock order as direct restore and submissions.
    user = target_user(db, decision_ref.user_id, actor)
    decision = db.scalar(
        select(AccountDecision)
        .where(AccountDecision.id == reference.decision_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    appeal = db.scalar(
        select(AccountAppeal)
        .where(AccountAppeal.id == appealId)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if appeal.status != "PENDING":
        if appeal.status == body.outcome and appeal.review_reason == body.reason.strip():
            return ok(admin_appeal_dto(db, appeal))
        raise BusinessError(409, "APPEAL_REVIEWED", "该申诉已被复核，请刷新查看结果。")
    if decision.revoked_at:
        raise BusinessError(409, "DECISION_REVOKED", "原处理已撤销，请刷新后查看。")
    if body.outcome == "REVOKED":
        decision.revoked_at, decision.revoked_by, decision.revocation_reason = (
            utcnow(),
            actor.id,
            body.reason.strip(),
        )
        db.flush()
        if decision.action == "DISABLE" and not db.scalar(
            select(AccountDecision.id).where(
                AccountDecision.user_id == user.id,
                AccountDecision.action == "DISABLE",
                AccountDecision.revoked_at.is_(None),
            )
        ):
            user.status = "ACTIVE"
    conclude_appeal(db, appeal, actor, body.outcome, body.reason)
    audit(
        db,
        "admin_account_appeal_review",
        actor.id,
        user.id,
        context={
            "reason": body.reason.strip(),
            "decisionId": decision.id,
            "appealId": appeal.id,
            "after": {"status": body.outcome},
        },
    )
    result = ok(admin_appeal_dto(db, appeal))
    db.commit()
    return result


@router.get(
    "/admin/appeals/{appealId}/evidence/{imageIndex}", operation_id="adminGetAppealEvidence"
)
def admin_evidence(
    appealId: int,
    imageIndex: int,
    db: Db,
    actor: Actor,
    source: Literal["appeal", "decision"] = "appeal",
):
    administrator(actor)
    appeal = db.get(AccountAppeal, appealId)
    decision = db.get(AccountDecision, appeal.decision_id) if appeal else None
    keys = (appeal.evidence if source == "appeal" else decision.evidence) if decision else []
    if imageIndex < 0 or imageIndex >= len(keys):
        raise BusinessError(404, "NOT_FOUND", "证据不存在。")
    response = image_response(keys[imageIndex])
    read_audit(
        db,
        "admin_account_evidence_read",
        actor.id,
        target_id=decision.user_id,
        reason="account_appeal_evidence_review",
        snapshot={"appealId": appealId, "imageIndex": imageIndex, "source": source},
    )
    db.commit()
    return response
