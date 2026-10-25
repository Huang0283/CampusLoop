"""PostgreSQL is authoritative for events, jobs, results and notification identity.

Workers hold a row lock until commit instead of a separate leased state. A process
crash rolls back and releases the claim; SKIP LOCKED allows multiple workers.
"""

import hashlib
import json
import logging
import threading
from collections.abc import Callable
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

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

MAX_ATTEMPTS = 5
BUSINESS_FIELDS = {
    Product: (
        "title",
        "description",
        "category",
        "condition",
        "price",
        "original_price",
        "campus_location",
        "status",
        "deleted_at",
        "attributes",
        "owner_id",
    ),
    WantedPost: (
        "title",
        "description",
        "category",
        "budget_min",
        "budget_max",
        "requirements",
        "status",
        "expires_at",
        "owner_id",
    ),
    User: ("status", "role"),
}


def business_event_key(entity):
    """Stable identity of a persisted business version, independent of delivery."""
    facts = {name: getattr(entity, name) for name in BUSINESS_FIELDS[type(entity)]}
    facts["updated_at"] = entity.updated_at or entity.created_at
    for name, value in facts.items():
        if name in ("price", "original_price", "budget_min", "budget_max") and value is not None:
            facts[name] = format(Decimal(str(value)), ".2f")
        elif isinstance(value, datetime):
            facts[name] = value.isoformat()
    digest = hashlib.sha256(json.dumps(facts, sort_keys=True, default=str).encode()).hexdigest()
    return f"{entity.__tablename__}:{entity.id}:{digest}"


def schedule_retry(job, reason):
    """All retry paths, including catalog churn, share one terminal bound."""
    job.last_error = reason[:64]
    job.status = "FAILED" if job.attempts >= MAX_ATTEMPTS else "PENDING"
    job.available_at = utcnow() + timedelta(seconds=min(60, 2**job.attempts))


def enqueue(db, event_key, wanted_ids):
    rows = [
        {"event_key": event_key, "wanted_id": identity, "status": "PENDING", "attempts": 0}
        for identity in sorted(set(wanted_ids))
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
        fields = BUSINESS_FIELDS.get(type(entity))
        if fields is None:
            continue
        if entity in db.new or any(
            inspect(entity).attrs[field].history.has_changes() for field in fields
        ):
            changed.add(entity)


@event.listens_for(Session, "after_flush_postexec")
def persist_outbox(db, *_):
    changed = db.info.pop("matching_changes", set())
    if not changed:
        return
    db.scalar(text("UPDATE matching_revision SET value=value+1 WHERE id=1 RETURNING value"))
    targets = list(
        db.scalars(
            select(WantedPost.id).where(
                WantedPost.status == "OPEN", WantedPost.expires_at > utcnow()
            )
        )
    )
    for entity in changed:
        key = business_event_key(entity)
        enqueue(db, key, [entity.id] if isinstance(entity, WantedPost) else targets)


@event.listens_for(Session, "after_rollback")
def discard_uncommitted_changes(db):
    db.info.pop("matching_changes", None)


# BP4-08（M9）：任务运行观察者。独立 worker 运行时（app/worker）安装钩子后，
# 每次任务执行产生一条观测事件（落 ai_task_runs），主循环每轮产生 tick 事件
# （供 /healthz 判定主循环存活）。不安装钩子时零行为变化（phase-3 语义不变）。
RUN_OBSERVERS: list[Callable[[dict[str, Any]], None]] = []


def _emit_run(event: dict[str, Any]) -> None:
    for observer in list(RUN_OBSERVERS):
        try:
            observer(event)
        except Exception:
            # 钩子内部已兜底，这里再兜一层：观测绝不能影响任务执行。
            logging.getLogger("matching").warning("任务观测钩子失败（已忽略）。")


def run_one():
    started = utcnow()
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
            done = process_claim(db, job)
            _emit_run(_run_event(job, started))
            return done
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
                schedule_retry(retry, "WORKER_FAILURE")
                db.commit()
                _emit_run(_run_event(retry, started))
            else:
                # 另一个 worker 已抢先接管该任务：记录竞态事实，重试计数未知。
                _emit_run(
                    _run_event(
                        None,
                        started,
                        identity=identity,
                        outcome="WORKER_FAILURE",
                        error="JOB_RELEASED",
                    )
                )
            return True


def _run_event(job, started, *, identity=None, outcome=None, error=None):
    """构造观测事件（BP4-08）。字段与 ai_task_runs 列一一对应。

    outcome 映射：DONE/SKIPPED/FAILED 原样；PENDING（已排期重试）记为 RETRY，
    便于 SQL 直接统计"最终失败 vs 安排重试"。
    """
    finished = utcnow()
    if job is not None:
        status = job.status or "WORKER_FAILURE"
        mapped = status if status in ("DONE", "SKIPPED", "FAILED") else "RETRY"
        return {
            "taskType": "matching",
            "taskId": job.id,
            "eventKey": job.event_key,
            "wantedId": job.wanted_id,
            "outcome": outcome or mapped,
            "errorCode": job.last_error,
            "resultVersion": job.result_version,
            "attempt": job.attempts,
            "durationMs": int((finished - started).total_seconds() * 1000),
            "startedAt": started.isoformat(),
            "finishedAt": finished.isoformat(),
        }
    return {
        "taskType": "matching",
        "taskId": identity,
        "eventKey": None,
        "wantedId": None,
        "outcome": outcome or "WORKER_FAILURE",
        "errorCode": error,
        "resultVersion": None,
        "attempt": 0,
        "durationMs": int((finished - started).total_seconds() * 1000),
        "startedAt": started.isoformat(),
        "finishedAt": finished.isoformat(),
    }


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
        wanted is None
        or owner is None
        or wanted.status != "OPEN"
        or wanted.expires_at is None
        or wanted.expires_at <= utcnow()
        or owner.status != "ACTIVE"
    ):
        job.status = "SKIPPED"
        db.execute(
            MatchingResult.__table__.delete().where(MatchingResult.wanted_id == job.wanted_id)
        )
        db.commit()
        return True
    try:
        result, public, version = rank_live(db, wanted.title, wanted=wanted, lock_candidates=True)
    except BusinessError as exc:
        schedule_retry(job, exc.code)
        db.commit()
        return True
    final_revision = db.scalar(text("SELECT value FROM matching_revision WHERE id=1 FOR UPDATE"))
    if final_revision != input_revision:
        schedule_retry(job, "STALE_INPUT")
        db.commit()
        return True
    facts = {
        "items": result["items"],
        "metadata": result["metadata"],
        "expiresAt": wanted.expires_at.isoformat(),
        "policyVersion": "first-pair-v1",
        "inputRevision": input_revision,
        "wantedVersion": max(
            1, int((wanted.updated_at or wanted.created_at).timestamp() * 1000000)
        ),
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
        _emit_run({"tick": True})  # BP4-08：主循环存活信号（/healthz 依赖）
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
