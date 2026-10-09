import hashlib
import json
from collections.abc import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.models import ChatSession, IdempotencyRecord, Notification, Order, OrderEvent, User
from app.services.auth import student


def require_participant(entity, user: User) -> None:
    if user.id not in (entity.buyer_id, entity.seller_id):
        raise BusinessError(403, "FORBIDDEN", "Only participants may access this resource.")


def load(db: Session, model, identity: int, *, lock: bool = False):
    query = select(model).where(model.id == identity)
    if lock:
        query = query.with_for_update()
    entity = db.scalar(query)
    if entity is None:
        raise BusinessError(404, "NOT_FOUND", "Resource not found.")
    return entity


def chat(db: Session, identity: int, actor: User) -> ChatSession:
    entity = load(db, ChatSession, identity, lock=True)
    require_participant(entity, actor)
    return entity


def order(db: Session, identity: int, actor: User) -> Order:
    entity = load(db, Order, identity, lock=True)
    require_participant(entity, actor)
    return entity


def idempotent(
    db: Session, actor: User, scope: str, key: str | None, body: dict, action: Callable[[], dict]
) -> dict:
    # Actor is locked by authorization, serializing same-actor duplicate submissions.
    student(actor)
    if key is None:
        raise BusinessError(422, "VALIDATION_ERROR", "Idempotency-Key is required.")
    if not 1 <= len(key) <= 64:
        raise BusinessError(422, "VALIDATION_ERROR", "Invalid Idempotency-Key.")
    fingerprint = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()
    prior = db.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.actor_id == actor.id,
            IdempotencyRecord.scope == scope,
            IdempotencyRecord.key == key,
        )
    )
    if prior:
        if prior.input_hash != fingerprint:
            raise BusinessError(
                409, "IDEMPOTENCY_CONFLICT", "Key was used with a different request."
            )
        return prior.result
    result = action()
    db.add(
        IdempotencyRecord(
            actor_id=actor.id, scope=scope, key=key, input_hash=fingerprint, result=result
        )
    )
    db.commit()
    return result


def notify(db: Session, recipient: int, kind: str, link: str, title: str) -> None:
    db.add(
        Notification(
            user_id=recipient, type=kind, payload={"title": title, "content": "", "link": link}
        )
    )


def event(
    db: Session, entity: Order, actor: User, description: str, to_status: str | None = None
) -> None:
    previous = entity.status
    if to_status:
        entity.status = to_status
    entity.version += 1
    db.add(
        OrderEvent(
            order_id=entity.id,
            operator_id=actor.id,
            from_status=previous,
            to_status=entity.status,
            description=description,
        )
    )
    peer = entity.seller_id if actor.id == entity.buyer_id else entity.buyer_id
    notify(db, peer, "ORDER_STATUS_CHANGED", f"/orders/{entity.id}", description)
