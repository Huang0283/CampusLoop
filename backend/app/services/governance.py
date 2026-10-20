"""M5 visibility projections and atomic administrator decisions."""

import hashlib
import json
from collections.abc import Callable

from sqlalchemy import select

from app.core.errors import BusinessError
from app.models import IdempotencyRecord
from app.services.auth import administrator, audit
from app.services.business_serializers import iso


def trust_view(result: dict, visibility: str) -> dict:
    # Never forward a model payload wholesale to a public or self response.
    public_fields = (
        "status",
        "score",
        "validEventCount",
        "algorithmVersion",
        "degraded",
        "degradationReason",
        "fallback",
    )
    data = {name: result[name] for name in public_fields if name in result}
    factor_codes = {"NO_VALID_COMPLETED_EVENTS", "VALID_COMPLETED_EVENTS", "BAYESIAN_SMOOTHING"}
    data["factors"] = [
        {key: factor[key] for key in ("code", "effect", "count") if key in factor}
        for factor in result.get("factors", [])
        if isinstance(factor, dict) and factor.get("code") in factor_codes
    ]
    data["visibility"] = visibility
    data["explanation"] = {
        "NEW_USER_NEUTRAL": "No valid completed reviews; neutral prior is not a risk verdict.",
        "AVAILABLE": "Completed reviews aggregated with a neutral small-sample prior.",
        "UNAVAILABLE": "Trust service unavailable; no negative conclusion may be inferred.",
    }.get(result.get("status"), "Trust summary unavailable.")
    if visibility != "PUBLIC":
        if "ignoredEventCount" in result:
            data["ignoredEventCount"] = result["ignoredEventCount"]
        if isinstance(result.get("smoothing"), dict):
            data["smoothing"] = {
                key: result["smoothing"][key]
                for key in ("priorScore", "priorWeight")
                if key in result["smoothing"]
            }
    return data


def report_snapshot(entity) -> dict:
    return {
        "status": entity.status,
        "handledBy": entity.handled_by,
        "handledAt": iso(entity.handled_at),
    }


def admin_report(entity) -> dict:
    from app.api.routes.transactions import report_dto

    keys = (entity.evidence or {}).get("keys", [])
    return {
        **report_dto(entity),
        **report_snapshot(entity),
        "evidence": [f"/admin/reports/{entity.id}/evidence/{index}" for index in range(len(keys))],
    }


def read_audit(db, event, actor_id, *, reason, snapshot, target_id=None, **metadata):
    audit(
        db,
        event,
        actor_id,
        target_id,
        context={"reason": reason, "before": snapshot, "after": snapshot, **metadata},
    )


def admin_idempotent(
    db,
    actor,
    scope: str,
    key: str | None,
    body: dict,
    action: Callable[[], dict],
    *,
    replay_audit: Callable[[dict], None] | None = None,
) -> dict:
    administrator(actor)
    if key is None or not key.strip() or len(key) > 64:
        raise BusinessError(422, "VALIDATION_ERROR", "A nonblank Idempotency-Key is required.")
    fingerprint = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    # Authentication holds the actor lock, including across different sessions.
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
        cached = prior.result["data"]
        if replay_audit:
            replay_audit(cached)
        else:
            read_audit(
                db,
                "admin_report_replay",
                actor.id,
                reason=body["note"],
                snapshot={name: cached[name] for name in ("status", "handledBy", "handledAt")},
                reportId=cached["id"],
                purpose="idempotent_response_replay",
            )
        db.commit()
        return prior.result
    result = action()
    db.add(
        IdempotencyRecord(
            actor_id=actor.id,
            scope=scope,
            key=key,
            input_hash=fingerprint,
            result=result,
        )
    )
    # Decision, audit and cached response commit together or roll back together.
    db.commit()
    return result
