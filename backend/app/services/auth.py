"""Database-authoritative authorization and locked refresh rotation."""

import hashlib
import hmac
import re
import secrets
import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import Depends, Request, Response
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.core.config import get_settings
from app.core.errors import BusinessError
from app.core.logging import request_id_var
from app.core.security import decode_access, issue_pair, signing_key, token_digest, utcnow
from app.models import AuthAudit, AuthSessionFamily, RefreshSession, User


def audit(
    db: Session,
    event: str,
    actor_id: int | None,
    target_id: int | None = None,
    *,
    context: dict | None = None,
) -> None:
    db.add(
        AuthAudit(
            event=event,
            actor_id=actor_id,
            target_id=target_id,
            request_id=request_id_var.get()[:64],
            context=context or {},
        )
    )


def revoke_family(db: Session, family: AuthSessionFamily, reason: str) -> None:
    family.revoked_at = utcnow()
    family.revocation_reason = reason
    db.execute(
        update(RefreshSession)
        .where(RefreshSession.family_id == family.id)
        .values(revoked_at=family.revoked_at)
    )


def authenticate(
    db: Session, token: str, *, allow_logout_replay: bool = False
) -> tuple[User, AuthSessionFamily]:
    claims = decode_access(token)
    # Shared by protected reads/writes and revocation: user -> family -> refresh.
    user = db.scalar(select(User).where(User.id == int(claims["sub"])).with_for_update())
    family = db.scalar(
        select(AuthSessionFamily).where(AuthSessionFamily.id == claims["sid"]).with_for_update()
    )
    if not user or not family or family.user_id != user.id or family.expires_at <= utcnow():
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Session unavailable.")
    if user.status != "ACTIVE":
        raise BusinessError(423, "ACCOUNT_DISABLED", "Account disabled.")
    if family.revoked_at and not (allow_logout_replay and family.revocation_reason == "logout"):
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Session revoked.")
    return user, family


def bearer(request: Request) -> str:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Authentication required.")
    return token


def current_user(request: Request, db: Annotated[Session, Depends(get_db)]) -> User:
    user, family = authenticate(db, bearer(request))
    request.state.auth_family = family
    return user


Db = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(current_user)]


def student(user: User) -> None:
    if user.role != "USER":
        raise BusinessError(403, "FORBIDDEN", "Student account required.")


def administrator(user: User) -> None:
    if user.role != "ADMIN":
        raise BusinessError(403, "FORBIDDEN", "Administrator required.")


def browser_origin(request: Request) -> None:
    if (
        request.headers.get("X-CampusLoop-Browser") != "1"
        or request.headers.get("Origin") not in get_settings().cors_origin_list
    ):
        raise BusinessError(403, "FORBIDDEN", "Trusted browser Origin and CSRF header required.")


def cookie_options() -> dict:
    settings = get_settings()
    secure = settings.app_env == "prod" or settings.auth_cookie_secure
    name = "__Host-campusloop-session" if secure else settings.auth_cookie_name
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", name):
        raise BusinessError(
            503, "AUTH_SERVICE_UNAVAILABLE", "Browser session cookie is not configured."
        )
    return dict(key=name, httponly=True, secure=secure, samesite="strict", path="/")


def browser_session(db: Session, request: Request, *, allow_revoked=False):
    browser_origin(request)
    token = request.cookies.get(cookie_options()["key"], "")
    if not 32 <= len(token) <= 128:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Browser session unavailable.")
    reference = db.scalar(
        select(AuthSessionFamily).where(AuthSessionFamily.browser_token_hash == token_digest(token))
    )
    if not reference:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Browser session unavailable.")
    user = db.scalar(select(User).where(User.id == reference.user_id).with_for_update())
    family = db.scalar(
        select(AuthSessionFamily)
        .where(AuthSessionFamily.id == reference.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if (
        not user
        or not family
        or family.expires_at <= utcnow()
        or (family.revoked_at and not allow_revoked)
    ):
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Browser session expired or revoked.")
    if user.status != "ACTIVE" and not allow_revoked:
        raise BusinessError(423, "ACCOUNT_DISABLED", "Account disabled.")
    return user, family


def refresh_window(family):
    now = utcnow()
    if (
        family.refresh_window_started_at is None
        or family.refresh_window_started_at + timedelta(seconds=60) <= now
    ):
        family.refresh_window_started_at, family.refresh_window_count = now, 0
    if family.refresh_window_count >= 30:
        raise BusinessError(
            429, "RATE_LIMITED", "Too many session renewals.", {"Retry-After": "60"}
        )
    family.refresh_window_count += 1


def browser_access(user, family):
    pair = issue_pair(user.id, family.id, family.expires_at)
    return {key: pair[key] for key in ("accessToken", "expiresIn")}


def new_session(
    db: Session, user: User, request: Request | None = None, response: Response | None = None
) -> dict:
    browser = request is not None and request.headers.get("X-CampusLoop-Browser") == "1"
    if browser:
        browser_origin(request)
    family = AuthSessionFamily(
        id=str(uuid.uuid4()),
        user_id=user.id,
        expires_at=utcnow()
        + timedelta(seconds=min(get_settings().auth_refresh_ttl_seconds, 604800)),
        refresh_window_count=0,
    )
    db.add(family)
    if browser:
        token = secrets.token_urlsafe(48)
        family.browser_token_hash = token_digest(token)
        response.set_cookie(
            value=token,
            max_age=max(1, int((family.expires_at - utcnow()).total_seconds())),
            **cookie_options(),
        )
        db.flush()
        return browser_access(user, family)
    db.flush()
    pair = issue_pair(user.id, family.id, family.expires_at)
    db.add(
        RefreshSession(
            user_id=user.id,
            family_id=family.id,
            token_hash=token_digest(pair["refreshToken"]),
            expires_at=family.expires_at,
        )
    )
    return pair


def rate_limit(request: Request, action: str, email: str | None = None) -> None:
    settings = get_settings()
    secret = signing_key().encode()

    def key(value: str) -> str:
        return hmac.new(secret, value.encode(), hashlib.sha256).hexdigest()

    # Never trust forwarded headers without an explicit trusted-proxy deployment.
    ip = request.client.host if request.client else "unknown"
    rules = [
        (
            f"auth:{action}:ip:{key(ip)}",
            30 if action == "login" else 10,
            900 if action == "login" else 3600,
        )
    ]
    if email:
        rules.append((f"auth:fail:{key(email)}", 5, 900))
    script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}"
    try:
        with Redis.from_url(
            settings.redis_url,
            socket_timeout=settings.redis_socket_timeout_seconds,
            socket_connect_timeout=settings.redis_socket_timeout_seconds,
        ) as redis:
            for rule_key, maximum, window in rules:
                if rule_key.startswith("auth:fail:"):
                    count = int(redis.get(rule_key) or 0)
                    retry = redis.ttl(rule_key)
                else:
                    count, retry = redis.eval(script, 1, rule_key, window)
                limited = count >= maximum if rule_key.startswith("auth:fail:") else count > maximum
                if limited:
                    raise BusinessError(
                        429,
                        "RATE_LIMITED",
                        "Too many attempts.",
                        {"Retry-After": str(max(1, retry))},
                    )
    except RedisError:
        raise BusinessError(
            503, "AUTH_SERVICE_UNAVAILABLE", "Authentication limiter unavailable."
        ) from None


def login_failed(email: str) -> None:
    settings = get_settings()
    digest = hmac.new(signing_key().encode(), email.encode(), hashlib.sha256).hexdigest()
    try:
        with Redis.from_url(
            settings.redis_url,
            socket_timeout=settings.redis_socket_timeout_seconds,
            socket_connect_timeout=settings.redis_socket_timeout_seconds,
        ) as redis:
            redis.eval(
                "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n",
                1,
                "auth:fail:" + digest,
            )
    except RedisError:
        raise BusinessError(
            503, "AUTH_SERVICE_UNAVAILABLE", "Authentication limiter unavailable."
        ) from None
