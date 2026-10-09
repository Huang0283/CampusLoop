from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Path, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.config import get_settings
from app.core.envelope import ok
from app.core.errors import BusinessError
from app.core.security import (
    dummy_hash,
    hash_password,
    issue_pair,
    password_hasher,
    token_digest,
    utcnow,
    verify_password,
)
from app.models import AuthSessionFamily, RefreshSession, User
from app.schemas.auth import (
    BrowserSessionRequest,
    LoginRequest,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    UserStatusUpdate,
)
from app.services.auth import (
    Actor,
    Db,
    administrator,
    audit,
    authenticate,
    bearer,
    browser_access,
    browser_origin,
    browser_session,
    cookie_options,
    login_failed,
    new_session,
    rate_limit,
    refresh_window,
    revoke_family,
)
from app.services.serializers import private_user, private_users, public_user

router = APIRouter(tags=["Auth"])


@router.post("/auth/register", status_code=201, operation_id="register")
def register(body: RegisterRequest, request: Request, response: Response, db: Db):
    rate_limit(request, "register")
    domain = body.email.rsplit("@", 1)[1]
    if domain not in {
        d.strip().lower() for d in get_settings().auth_registration_domains.split(",")
    }:
        raise BusinessError(422, "VALIDATION_ERROR", "Registration email domain is not allowed.")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
        role="USER",
        status="ACTIVE",
        campus_email_verified=False,
        rating_avg=0,
        transaction_count=0,
    )
    try:
        db.add(user)
        db.flush()
        pair = new_session(db, user, request, response)
        audit(db, "registered", user.id)
        result = ok({**pair, "user": private_user(db, user)})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise BusinessError(409, "EMAIL_ALREADY_REGISTERED", "Email already registered.") from None
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post("/auth/login", operation_id="login")
def login(body: LoginRequest, request: Request, response: Response, db: Db):
    rate_limit(request, "login", body.email)
    user = db.scalar(select(User).where(User.email == body.email).with_for_update())
    valid = verify_password(user.password_hash if user else dummy_hash, body.password)
    if not user or not valid:
        login_failed(body.email)
        raise BusinessError(401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials.")
    if user.status != "ACTIVE":
        raise BusinessError(423, "ACCOUNT_DISABLED", "Account disabled.")
    if password_hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
    pair = new_session(db, user, request, response)
    audit(db, "logged_in", user.id)
    result = ok({**pair, "user": private_user(db, user)})
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post("/auth/refresh", operation_id="refreshSession")
def refresh(body: RefreshRequest, response: Response, db: Db):
    row = db.scalar(
        select(RefreshSession).where(RefreshSession.token_hash == token_digest(body.refreshToken))
    )
    if not row or not row.family_id:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Session unavailable.")
    user = db.scalar(select(User).where(User.id == row.user_id).with_for_update())
    family = db.scalar(
        select(AuthSessionFamily).where(AuthSessionFamily.id == row.family_id).with_for_update()
    )
    row = db.scalar(
        select(RefreshSession)
        .where(RefreshSession.id == row.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    now = utcnow()
    if not user or not family or family.user_id != user.id:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Session unavailable.")
    if user.status != "ACTIVE":
        raise BusinessError(423, "ACCOUNT_DISABLED", "Account disabled.")
    if family.revoked_at or family.expires_at <= now or row.expires_at <= now or row.revoked_at:
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Session expired or revoked.")
    if row.consumed_at:
        revoke_family(db, family, "replay")
        audit(db, "refresh_replay", user.id)
        # Commit revocation before raising; rolling it back would leave stolen tokens valid.
        db.commit()
        raise BusinessError(401, "AUTH_UNAUTHORIZED", "Refresh replay detected; sign in again.")
    if (
        family.refresh_window_started_at is None
        or family.refresh_window_started_at + timedelta(seconds=60) <= now
    ):
        family.refresh_window_started_at = now
        family.refresh_window_count = 0
    if family.refresh_window_count >= 30:
        raise BusinessError(
            429, "RATE_LIMITED", "Too many refresh requests.", {"Retry-After": "60"}
        )
    family.refresh_window_count += 1
    row.consumed_at = now
    db.flush()
    pair = issue_pair(user.id, family.id, family.expires_at)
    db.add(
        RefreshSession(
            user_id=user.id,
            family_id=family.id,
            parent_id=row.id,
            token_hash=token_digest(pair["refreshToken"]),
            expires_at=family.expires_at,
        )
    )
    audit(db, "refresh_rotated", user.id)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return ok(pair)


@router.post("/auth/browser-session", operation_id="restoreBrowserSession")
def restore_browser(body: BrowserSessionRequest, request: Request, response: Response, db: Db):
    user, family = browser_session(db, request)
    refresh_window(family)
    result = ok({**browser_access(user, family), "user": private_user(db, user)})
    audit(db, "browser_session_restored", user.id)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post("/auth/logout", status_code=204, operation_id="logout")
def logout(request: Request, db: Db):
    browser = request.headers.get("X-CampusLoop-Browser") == "1"
    if browser:
        browser_origin(request)
        try:
            user, family = browser_session(db, request, allow_revoked=True)
        except BusinessError as exc:
            if exc.status != 401:
                raise
            # Even an expired/removed cookie must be cleared. No new authorization.
            response = Response(status_code=204, headers={"Cache-Control": "no-store"})
            response.delete_cookie(**cookie_options())
            return response
    else:
        user, family = authenticate(db, bearer(request), allow_logout_replay=True)
    if family.revoked_at is None:
        revoke_family(db, family, "logout")
        audit(db, "logged_out", user.id)
        db.commit()
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    if browser:
        response.delete_cookie(**cookie_options())
    return response


@router.get("/users/me", operation_id="getCurrentUser")
def get_current_user(response: Response, db: Db, actor: Actor):
    response.headers["Cache-Control"] = "no-store"
    return ok(private_user(db, actor))


@router.patch("/users/me", operation_id="updateCurrentUser")
def update_current_user(body: ProfileUpdate, response: Response, db: Db, actor: Actor):
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(actor, "avatar_url" if key == "avatar" else key, value)
    db.flush()
    result = ok(private_user(db, actor))
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result


@router.get("/users/{userId}", operation_id="getPublicUser")
def get_public_user(userId: Annotated[int, Path(gt=0, le=9007199254740991)], db: Db):
    user = db.get(User, userId)
    if not user or user.status != "ACTIVE":
        raise BusinessError(404, "NOT_FOUND", "User not found.")
    return ok(public_user(db, user))


@router.get("/admin/users", operation_id="adminListUsers")
def admin_users(
    db: Db,
    actor: Actor,
    page: Annotated[int, Query(ge=1)] = 1,
    pageSize: Annotated[int, Query(ge=1, le=100)] = 20,
):
    administrator(actor)
    users = db.scalars(
        select(User).order_by(User.id).offset((page - 1) * pageSize).limit(pageSize)
    ).all()
    result = ok(
        {
            "items": private_users(db, users),
            "pagination": {
                "page": page,
                "pageSize": pageSize,
                "total": db.scalar(select(func.count()).select_from(User)),
            },
        }
    )
    audit(db, "admin_users_read", actor.id)
    db.commit()
    return result


@router.patch("/admin/users/{userId}/status", operation_id="adminUpdateUserStatus")
def admin_status(userId: int, body: UserStatusUpdate, db: Db, actor: Actor):
    administrator(actor)
    if userId == actor.id:
        raise BusinessError(403, "FORBIDDEN", "Self-administration is not permitted.")
    # Do not acquire another administrator's lock: two admins targeting each other
    # must fail without reversing the authorization lock order.
    user = db.scalar(select(User).where(User.id == userId, User.role == "USER").with_for_update())
    if not user:
        raise BusinessError(404, "NOT_FOUND", "User not found.")
    if user.role == "ADMIN":
        raise BusinessError(403, "FORBIDDEN", "Administrator accounts cannot be changed here.")
    if user.status != body.status:
        user.status = body.status
        if body.status == "DISABLED":
            for family in db.scalars(
                select(AuthSessionFamily)
                .where(AuthSessionFamily.user_id == user.id)
                .order_by(AuthSessionFamily.id)
                .with_for_update()
            ):
                revoke_family(db, family, "disabled")
        audit(
            db,
            "admin_user_" + body.status.lower(),
            actor.id,
            user.id,
            context={"reason": body.reason},
        )
    db.flush()
    result = ok(private_user(db, user))
    db.commit()
    return result
