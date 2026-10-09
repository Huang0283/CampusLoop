import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password, utcnow
from app.db.session import SessionLocal
from app.main import app
from app.models import AuthAudit, AuthSessionFamily, RefreshSession, User
from tests.conftest import requires_postgres

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def auth_settings(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "test-only-" + "x" * 40)
    get_settings.cache_clear()
    # Isolate limiter keys per test without resetting another application's Redis database.
    from redis import Redis

    settings = get_settings()
    with Redis.from_url(settings.redis_url) as redis:
        for key in redis.scan_iter("auth:*"):
            redis.delete(key)
    yield
    get_settings.cache_clear()


def account(client):
    email = f"p3-{uuid.uuid4().hex}@example.invalid"
    result = client.post(
        "/auth/register", json={"email": email, "password": "Valid@12345", "nickname": "Test"}
    )
    assert result.status_code == 201, result.text
    return result.json()["data"]


def headers(data):
    return {"Authorization": "Bearer " + data["accessToken"]}


def test_registration_profile_privacy_and_validation(client):
    a = account(client)
    assert a["user"]["role"] == "USER"
    assert a["user"]["campusVerified"] is False
    assert a["expiresIn"] <= 900
    assert client.get("/users/me", headers=headers(a)).headers["cache-control"] == "no-store"
    public = client.get(
        f'/users/{a["user"]["id"]}', headers={"Authorization": "Bearer invalid"}
    ).json()["data"]
    assert set(public) == {"id", "nickname", "avatar", "rating", "transactionCount"}
    duplicate = client.post(
        "/auth/register",
        json={
            "email": " " + a["user"]["email"].upper() + " ",
            "password": "Valid@12345",
            "nickname": "Duplicate",
        },
    )
    assert duplicate.status_code == 409
    secret = "NeverEchoThisPassword"
    bad = client.post(
        "/auth/register",
        json={"email": "bad", "password": secret, "nickname": "Test", "role": "ADMIN"},
    )
    assert bad.status_code == 422 and secret not in bad.text
    assert client.patch("/users/me", headers=headers(a), json={}).status_code == 422
    assert client.patch("/users/me", headers=headers(a), json={"nickname": None}).status_code == 422
    updated = client.patch(
        "/users/me", headers=headers(a), json={"school": "Private school", "bio": "bio"}
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["school"] == "Private school"
    assert (
        client.patch("/users/me", headers=headers(a), json={"bio": None}).json()["data"]["bio"]
        is None
    )
    assert "school" not in client.get(f'/users/{a["user"]["id"]}').json()["data"]
    assert client.get("/admin/users", headers=headers(a)).status_code == 403


def test_login_logout_families_and_refresh_replay(client):
    a = account(client)
    b = client.post(
        "/auth/login", json={"email": a["user"]["email"], "password": "Valid@12345"}
    ).json()["data"]
    wrong = client.post("/auth/login", json={"email": a["user"]["email"], "password": "wrong"})
    unknown = client.post(
        "/auth/login", json={"email": "unknown@example.invalid", "password": "wrong"}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["code"] == unknown.json()["code"] == "AUTH_INVALID_CREDENTIALS"
    rotated = client.post("/auth/refresh", json={"refreshToken": a["refreshToken"]})
    assert rotated.status_code == 200
    assert rotated.json()["data"]["refreshToken"] != a["refreshToken"]
    assert client.get("/users/me", headers=headers(a)).status_code == 200
    assert client.post("/auth/refresh", json={"refreshToken": a["refreshToken"]}).status_code == 401
    assert client.get("/users/me", headers=headers(rotated.json()["data"])).status_code == 401
    assert client.get("/users/me", headers=headers(b)).status_code == 200
    assert client.post("/auth/logout", headers=headers(b)).status_code == 204
    assert client.post("/auth/logout", headers=headers(b)).status_code == 204
    assert client.get("/users/me", headers=headers(b)).status_code == 401
    assert client.post("/auth/refresh", json={"refreshToken": b["refreshToken"]}).status_code == 401


def test_concurrent_refresh_single_success_then_family_revocation(client):
    a = account(client)

    def rotate(_):
        with TestClient(app) as other:
            return other.post("/auth/refresh", json={"refreshToken": a["refreshToken"]})

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(rotate, range(2)))
    assert sorted(result.status_code for result in results) == [200, 401]
    success = next(result for result in results if result.status_code == 200)
    assert client.get("/users/me", headers=headers(success.json()["data"])).status_code == 401
    with SessionLocal() as db:
        family = db.scalar(
            select(AuthSessionFamily).where(AuthSessionFamily.user_id == a["user"]["id"])
        )
        assert family.revoked_at
        assert all(
            row.revoked_at
            for row in db.scalars(
                select(RefreshSession).where(RefreshSession.family_id == family.id)
            )
        )


def test_expired_access_refresh_and_disabled_account(client):
    a = account(client)
    with SessionLocal() as db:
        family = db.scalar(
            select(AuthSessionFamily).where(AuthSessionFamily.user_id == a["user"]["id"])
        )
        family.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert client.get("/users/me", headers=headers(a)).status_code == 401
    assert client.post("/auth/refresh", json={"refreshToken": a["refreshToken"]}).status_code == 401
    b = account(client)
    with SessionLocal() as db:
        db.get(User, b["user"]["id"]).status = "DISABLED"
        db.commit()
    assert client.get("/users/me", headers=headers(b)).status_code == 423
    assert (
        client.post(
            "/auth/login", json={"email": b["user"]["email"], "password": "Valid@12345"}
        ).status_code
        == 423
    )
    assert client.post("/auth/refresh", json={"refreshToken": b["refreshToken"]}).status_code == 423
    assert client.get(f'/users/{b["user"]["id"]}').status_code == 404


def test_admin_disable_revoke_and_audit(client):
    target = account(client)
    admin_email = f"admin-{uuid.uuid4().hex}@example.invalid"
    with SessionLocal() as db:
        admin = User(
            email=admin_email,
            nickname="Admin",
            password_hash=hash_password("Valid@12345"),
            role="ADMIN",
            status="ACTIVE",
        )
        db.add(admin)
        db.commit()
    login = client.post("/auth/login", json={"email": admin_email, "password": "Valid@12345"})
    assert login.status_code == 200
    admin = login.json()["data"]
    changed = client.patch(
        f'/admin/users/{target["user"]["id"]}/status',
        headers=headers(admin),
        json={"status": "DISABLED", "reason": "Test moderation"},
    )
    assert changed.status_code == 200
    assert client.get("/users/me", headers=headers(target)).status_code == 423
    assert (
        client.patch(
            f'/admin/users/{target["user"]["id"]}/status',
            headers=headers(admin),
            json={"status": "ACTIVE", "reason": "Test restore"},
        ).status_code
        == 200
    )
    assert client.get("/users/me", headers=headers(target)).status_code == 401
    with SessionLocal() as db:
        assert db.scalar(
            select(AuthAudit).where(
                AuthAudit.target_id == target["user"]["id"],
                AuthAudit.event == "admin_user_disabled",
            )
        )


def test_origin_content_type_json_and_missing_key(client, monkeypatch):
    payload = {"email": "origin@example.invalid", "password": "Valid@12345", "nickname": "Test"}
    assert (
        client.post(
            "/auth/register", headers={"Origin": "https://untrusted.invalid"}, json=payload
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/auth/register", content="invalid", headers={"Content-Type": "text/plain"}
        ).status_code
        == 415
    )
    assert (
        client.post(
            "/auth/register", content="{", headers={"Content-Type": "application/json"}
        ).status_code
        == 400
    )
    monkeypatch.setenv("AUTH_SIGNING_KEY", "")
    get_settings.cache_clear()
    assert (
        client.post(
            "/auth/login", json={"email": "none@example.invalid", "password": "wrong"}
        ).status_code
        == 503
    )
