"""Atomic account decisions, notices and appeal outcomes; no private-report projection."""

from sqlalchemy import select

from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import AccountAppeal, AccountDecision, AuthSessionFamily, Product, User
from app.services.auth import audit, revoke_family
from app.services.business import notify
from app.services.business_serializers import iso
from app.services.storage import owned_keys


def target_user(db, user_id, actor):
    if user_id == actor.id:
        raise BusinessError(403, "FORBIDDEN", "不能对自己的账号进行处罚。")
    user = db.scalar(select(User).where(User.id == user_id, User.role == "USER").with_for_update())
    if not user:
        raise BusinessError(404, "NOT_FOUND", "用户不存在或该账号属于受保护的管理员。")
    return user


def revoke_sessions(db, user):
    for family in db.scalars(
        select(AuthSessionFamily)
        .where(AuthSessionFamily.user_id == user.id, AuthSessionFamily.revoked_at.is_(None))
        .order_by(AuthSessionFamily.id)
        .with_for_update()
    ):
        revoke_family(db, family, "disabled")


def record_decision(
    db,
    user,
    actor,
    *,
    action,
    reason,
    facts,
    basis,
    occurred_at=None,
    product_id=None,
    evidence=None,
):
    reference = None
    if product_id:
        product = db.get(Product, product_id)
        if not product or product.owner_id != user.id:
            raise BusinessError(422, "VALIDATION_ERROR", "关联商品必须属于被处理用户。")
        reference = {"productId": product.id, "title": product.title}
    decision = AccountDecision(
        user_id=user.id,
        actor_id=actor.id,
        action=action,
        reason=reason.strip(),
        facts=facts.strip(),
        basis=basis.strip(),
        occurred_at=occurred_at,
        reference=reference,
        evidence=owned_keys(db, actor, evidence or [], "evidence"),
    )
    db.add(decision)
    db.flush()
    if action == "DISABLE":
        user.status = "DISABLED"
        revoke_sessions(db, user)
    title = "账号违规警告" if action == "WARNING" else "账号已被禁用"
    notify(
        db, user.id, "ACCOUNT_ACTION", f"/account/decisions/{decision.id}", title, decision.reason
    )
    audit(
        db,
        "admin_account_decision",
        actor.id,
        user.id,
        context={"reason": decision.reason, "decisionId": decision.id, "after": {"status": action}},
    )
    return decision


def appeal_dto(appeal):
    return {
        "id": appeal.id,
        "decisionId": appeal.decision_id,
        "explanation": appeal.explanation,
        "status": appeal.status,
        "createdAt": iso(appeal.created_at),
        "reviewedAt": iso(appeal.reviewed_at),
        "reviewReason": appeal.review_reason,
        "evidence": [
            f"/account/appeals/{appeal.id}/evidence/{i}" for i in range(len(appeal.evidence))
        ],
    }


def decision_dto(decision, appeal=None):
    return {
        "id": decision.id,
        "userId": decision.user_id,
        "action": decision.action,
        "reason": decision.reason,
        "facts": decision.facts,
        "basis": decision.basis,
        "occurredAt": iso(decision.occurred_at),
        "createdAt": iso(decision.created_at),
        "reference": decision.reference,
        "revokedAt": iso(decision.revoked_at),
        "revocationReason": decision.revocation_reason,
        "evidence": [
            f"/account/decisions/{decision.id}/evidence/{i}" for i in range(len(decision.evidence))
        ],
        "appeal": appeal_dto(appeal) if appeal else None,
    }


def conclude_appeal(db, appeal, actor, outcome, reason):
    appeal.status, appeal.review_reason = outcome, reason.strip()
    appeal.reviewed_at, appeal.reviewed_by = utcnow(), actor.id
    decision = db.get(AccountDecision, appeal.decision_id)
    notify(
        db,
        decision.user_id,
        "APPEAL_RESULT",
        f"/account/decisions/{decision.id}",
        "申诉复核结果",
        "已撤销原处理" if outcome == "REVOKED" else "维持原处理",
    )


def restore_account(db, user, actor, reason):
    for decision in db.scalars(
        select(AccountDecision)
        .where(
            AccountDecision.user_id == user.id,
            AccountDecision.action == "DISABLE",
            AccountDecision.revoked_at.is_(None),
        )
        .order_by(AccountDecision.id)
        .with_for_update()
    ):
        decision.revoked_at, decision.revoked_by, decision.revocation_reason = (
            utcnow(),
            actor.id,
            reason,
        )
        appeal = db.scalar(
            select(AccountAppeal).where(AccountAppeal.decision_id == decision.id).with_for_update()
        )
        if appeal and appeal.status == "PENDING":
            conclude_appeal(db, appeal, actor, "REVOKED", reason)
        notify(
            db, user.id, "ACCOUNT_ACTION", f"/account/decisions/{decision.id}", "账号已恢复", reason
        )
    user.status = "ACTIVE"
