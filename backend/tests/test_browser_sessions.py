import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import token_digest, utcnow
from app.db.session import SessionLocal
from app.main import app
from app.models import AuthSessionFamily, RefreshSession, User
from app.services.auth import cookie_options
from tests.conftest import requires_postgres
from tests.test_auth import headers

pytestmark = [pytest.mark.integration, requires_postgres]
BROWSER = {"Origin": "http://localhost:5173", "X-CampusLoop-Browser": "1"}


def browser_account(client):
    response = client.post(
        "/auth/register",
        headers=BROWSER,
        json={
            "email": f"browser-{uuid.uuid4().hex}@example.invalid",
            "password": "Valid@12345",
            "nickname": "Browser",
        },
    )
    assert response.status_code == 201, response.text
    return response


def test_cookie_restore_csrf_and_absolute_lifetime(client):
    registered = browser_account(client)
    data = registered.json()["data"]
    assert set(data) == {"accessToken", "expiresIn", "user"}
    cookie = client.cookies.get(cookie_options()["key"])
    assert cookie and cookie not in registered.text
    setting = registered.headers["set-cookie"]
    assert "HttpOnly" in setting and "SameSite=strict" in setting and "Path=/" in setting
    assert "Domain=" not in setting
    with SessionLocal() as db:
        family = db.scalar(
            select(AuthSessionFamily).where(
                AuthSessionFamily.browser_token_hash == token_digest(cookie)
            )
        )
        deadline, fid = family.expires_at, family.id
        assert (
            db.scalar(
                select(func.count())
                .select_from(RefreshSession)
                .where(RefreshSession.family_id == fid)
            )
            == 0
        )
    restored = client.post("/auth/browser-session", headers=BROWSER, json={})
    assert restored.status_code == 200
    assert restored.json()["data"]["user"]["id"] == data["user"]["id"]
    assert restored.headers["cache-control"] == "no-store"
    for unsafe in (
        {},
        {"Origin": "http://localhost:5173"},
        {"X-CampusLoop-Browser": "1"},
        BROWSER | {"Origin": "http://localhost:4173"},
        BROWSER | {"Origin": "null"},
    ):
        assert client.post("/auth/browser-session", headers=unsafe, json={}).status_code == 403
    assert (
        client.post("/auth/browser-session", headers=BROWSER, json={"userId": 1}).status_code == 422
    )
    assert (
        client.post(
            "/auth/logout", headers={"Origin": "http://localhost:4173", "X-CampusLoop-Browser": "1"}
        ).status_code
        == 403
    )
    assert client.post("/auth/browser-session", headers=BROWSER, json={}).status_code == 200
    with SessionLocal() as db:
        assert db.get(AuthSessionFamily, fid).expires_at == deadline
        db.get(AuthSessionFamily, fid).expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert client.post("/auth/browser-session", headers=BROWSER, json={}).status_code == 401
    assert client.post("/auth/logout", headers=BROWSER).status_code == 204
    assert client.cookies.get(cookie_options()["key"]) is None


def test_concurrent_reload_keeps_both_tabs_valid_and_logout_revokes(client):
    data = browser_account(client).json()["data"]
    cookie = client.cookies.get(cookie_options()["key"])

    def restore(_):
        with TestClient(app) as other:
            other.cookies.set(cookie_options()["key"], cookie)
            return other.post("/auth/browser-session", headers=BROWSER, json={})

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(restore, range(2)))
    assert [r.status_code for r in results] == [200, 200]
    for result in results:
        assert client.get("/users/me", headers=headers(result.json()["data"])).status_code == 200
    assert client.post("/auth/logout", headers=BROWSER).status_code == 204
    for result in results:
        assert client.get("/users/me", headers=headers(result.json()["data"])).status_code == 401
    client.cookies.set(cookie_options()["key"], cookie)
    assert client.post("/auth/browser-session", headers=BROWSER, json={}).status_code == 401
    assert client.post("/auth/logout", headers=BROWSER).status_code == 204
    assert client.get("/users/me", headers=headers(data)).status_code == 401


def test_disable_and_renewal_rate_bound(client):
    data = browser_account(client).json()["data"]
    cookie = client.cookies.get(cookie_options()["key"])
    with SessionLocal() as db:
        family = db.scalar(
            select(AuthSessionFamily).where(
                AuthSessionFamily.browser_token_hash == token_digest(cookie)
            )
        )
        family.refresh_window_started_at, family.refresh_window_count = utcnow(), 30
        db.commit()
    response = client.post("/auth/browser-session", headers=BROWSER, json={})
    assert response.status_code == 429 and response.headers["retry-after"] == "60"
    with SessionLocal() as db:
        db.get(User, data["user"]["id"]).status = "DISABLED"
        db.commit()
    assert client.post("/auth/browser-session", headers=BROWSER, json={}).status_code == 423
    assert client.post("/auth/logout", headers=BROWSER).status_code == 204


def test_production_cookie_is_secure_host_only(client, monkeypatch):
    monkeypatch.setenv("APP_ENV", "prod")
    monkeypatch.setenv("AUTH_COOKIE_SECURE", "false")
    get_settings.cache_clear()
    try:
        registered = browser_account(client)
        setting = registered.headers["set-cookie"]
        assert setting.startswith("__Host-campusloop-session=")
        assert "Secure" in setting and "HttpOnly" in setting and "Domain=" not in setting
    finally:
        get_settings.cache_clear()
