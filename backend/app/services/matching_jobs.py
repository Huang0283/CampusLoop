"""PostgreSQL is authoritative for events, jobs, results and notification identity.

Workers hold a row lock until commit instead of a separate leased state. A process
crash rolls back and releases the claim; SKIP LOCKED allows multiple workers.
"""

import threading
from datetime import timedelta

from sqlalchemy import event, inspect, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.db.session import SessionLocal
from app.models import (
    MatchingJob,
    MatchingNotification,
    MatchingResult,
    Notification,
    Product,
    User,
    WantedPost,
)


def enqueue(db, event_key, wanted_ids):
    rows = [
        {"event_key": event_key, "wanted_id": identity, "status": "PENDING", "attempts": 0}
        for identity in wanted_ids
    ]
    if rows:
        db.execute(
            insert(MatchingJob)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["event_key", "wanted_id"])
        )


@event.listens_for(Session, "before_flush")
def remember_changes(db, *_):
    changed = db.info.setdefault("matching_changes", set())
    for entity in list(db.new) + list(db.dirty):
        if isinstance(entity, User) and not any(
            inspect(entity).attrs[field].history.has_changes() for field in ("status", "role")
        ):
            continue
        if isinstance(entity, Product | WantedPost | User) and (
            entity in db.new or db.is_modified(entity, include_collections=False)
        ):
            changed.add(entity)


@event.listens_for(Session, "after_flush_postexec")
def persist_outbox(db, *_):
    changed = db.info.pop("matching_changes", set())
    if not changed:
        return
    revision = db.scalar(
        text("UPDATE matching_revision SET value=value+1 WHERE id=1 RETURNING value")
    )
    targets = list(
        db.scalars(
            select(WantedPost.id).where(
                WantedPost.status == "OPEN", WantedPost.expires_at > utcnow()
            )
        )
    )
    for entity in changed:
        stamp = (entity.updated_at or entity.created_at).isoformat()
        key = f"{entity.__tablename__}:{entity.id}:{stamp}:{revision}"
        enqueue(db, key, [entity.id] if isinstance(entity, WantedPost) else targets)


@event.listens_for(Session, "after_rollback")
def discard_uncommitted_changes(db):
    db.info.pop("matching_changes", None)


def run_one():
    with SessionLocal() as db:
        job = db.scalar(
            select(MatchingJob)
            .where(MatchingJob.status == "PENDING", MatchingJob.available_at <= utcnow())
            .order_by(MatchingJob.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job is None:
            return False
        identity = job.id
        try:
            return process_claim(db, job)
        except Exception:
            # Roll back every partial result/notification, then record a bounded,
            # safe retry. Another worker may already have completed the released job.
            db.rollback()
            retry = db.scalar(
                select(MatchingJob)
                .where(MatchingJob.id == identity)
                .with_for_update(skip_locked=True)
            )
            if retry is not None and retry.status == "PENDING":
                retry.attempts += 1
                retry.last_error = "WORKER_FAILURE"
                retry.status = "FAILED" if retry.attempts >= 5 else "PENDING"
                retry.available_at = utcnow() + timedelta(seconds=min(60, 2**retry.attempts))
                db.commit()
            return True


def process_claim(db, job):
    from app.services.intelligence import rank_live

    input_revision = db.scalar(text("SELECT value FROM matching_revision WHERE id=1"))
    job.attempts += 1
    owner_id = db.scalar(select(WantedPost.owner_id).where(WantedPost.id == job.wanted_id))
    owner = db.scalar(select(User).where(User.id == owner_id).with_for_update(read=True))
    wanted = db.scalar(
        select(WantedPost).where(WantedPost.id == job.wanted_id).with_for_update(key_share=True)
    )
    if (
        wanted.status != "OPEN"
        or wanted.expires_at is None
        or wanted.expires_at <= utcnow()
        or owner.status != "ACTIVE"
    ):
        job.status = "SKIPPED"
        db.execute(MatchingResult.__table__.delete().where(MatchingResult.wanted_id == wanted.id))
        db.commit()
        return True
    try:
        result, public, version = rank_live(db, wanted.title, wanted=wanted, lock_candidates=True)
    except BusinessError as exc:
        job.last_error = exc.code[:64]
        job.status = "FAILED" if job.attempts >= 5 else "PENDING"
        job.available_at = utcnow() + timedelta(seconds=min(60, 2**job.attempts))
        db.commit()
        return True
    final_revision = db.scalar(text("SELECT value FROM matching_revision WHERE id=1 FOR UPDATE"))
    if final_revision != input_revision:
        job.available_at = utcnow() + timedelta(seconds=1)
        job.last_error = "STALE_INPUT"
        db.commit()
        return True
    facts = {
        "items": result["items"],
        "metadata": result["metadata"],
        "expiresAt": wanted.expires_at.isoformat(),
        "policyVersion": "first-pair-v1",
    }
    db.execute(
        insert(MatchingResult)
        .values(wanted_id=wanted.id, result_version=version, facts=facts, updated_at=utcnow())
        .on_conflict_do_update(
            index_elements=["wanted_id"],
            set_={"result_version": version, "facts": facts, "updated_at": utcnow()},
        )
    )
    if get_settings().matching_notifications_enabled:
        existing = set(
            db.scalars(
                select(MatchingNotification.product_id).where(
                    MatchingNotification.wanted_id == wanted.id
                )
            )
        )
        for item in result["items"]:
            identity = int(item["productId"])
            if identity in existing or identity not in public:
                continue
            notification = Notification(
                user_id=wanted.owner_id,
                type="MATCH_FOUND",
                payload={
                    "title": "New eligible wanted match",
                    "content": "",
                    "link": f"/wanted/{wanted.id}/matches",
                    "wantedId": wanted.id,
                    "productId": identity,
                    "resultVersion": version,
                },
            )
            db.add(notification)
            db.flush()
            db.add(
                MatchingNotification(
                    wanted_id=wanted.id,
                    product_id=identity,
                    notification_id=notification.id,
                    result_version=version,
                )
            )
    job.status, job.result_version, job.last_error = "DONE", version, None
    db.commit()
    return True


def worker_loop(stop: threading.Event):
    import logging

    initialized = False
    while not stop.is_set():
        try:
            with SessionLocal() as db:
                if not initialized:
                    revision = db.scalar(text("SELECT value FROM matching_revision WHERE id=1"))
                    wanted_ids = list(
                        db.scalars(
                            select(WantedPost.id).where(
                                WantedPost.status == "OPEN", WantedPost.expires_at > utcnow()
                            )
                        )
                    )
                    enqueue(db, f"runtime-reconcile:{revision}", wanted_ids)
                # Expired pointers cannot remain current even without new catalog events.
                expired = select(WantedPost.id).where(
                    (WantedPost.status != "OPEN") | (WantedPost.expires_at <= utcnow())
                )
                db.execute(
                    MatchingResult.__table__.delete().where(MatchingResult.wanted_id.in_(expired))
                )
                db.commit()
                initialized = True
            if run_one():
                continue
        except Exception:
            # No exception details: DB/RPC exceptions can include private payloads.
            logging.getLogger("matching").warning(
                "Matching worker failed; uncommitted claim released."
            )
        stop.wait(1)
