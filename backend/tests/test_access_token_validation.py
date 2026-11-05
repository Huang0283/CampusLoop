"""C12/C34: expiry is renewable; forged credentials never authenticate via cookies."""

import uuid
from datetime import timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.errors import BusinessError
from app.core.security import decode_access, signing_key, utcnow
from app.db.session import SessionLocal
from app.models import AuthSessionFamily
from tests.conftest import requires_postgres
from tests.test_browser_sessions import BROWSER, browser_account


@pytest.fixture(autouse=True)
def token_settings(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "access-token-test-only-" + "x" * 40)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def encode(claims, **kwargs):
    return jwt.encode(
        claims,
        kwargs.pop("key", signing_key()),
        algorithm=kwargs.pop("algorithm", "HS256"),
        headers={"kid": kwargs.pop("kid", get_settings().auth_signing_kid)},
        **kwargs,
    )


@pytest.mark.parametrize(
    ("changes", "options", "expected"),
    [
        ({}, {}, "AUTH_ACCESS_EXPIRED"),
        ({}, {"key": "forged-key-" + "z" * 40}, "AUTH_UNAUTHORIZED"),
        ({}, {"algorithm": "HS384"}, "AUTH_UNAUTHORIZED"),
        ({}, {"kid": "unknown"}, "AUTH_UNAUTHORIZED"),
        ({"iss": "other-api"}, {}, "AUTH_UNAUTHORIZED"),
        ({"aud": "other-client"}, {}, "AUTH_UNAUTHORIZED"),
        ({"sub": "not-a-user"}, {}, "AUTH_UNAUTHORIZED"),
        ({"sub": "0"}, {}, "AUTH_UNAUTHORIZED"),
        ({"sid": "not-a-session"}, {}, "AUTH_UNAUTHORIZED"),
        ({"iat": int(utcnow().timestamp()) + 3600}, {}, "AUTH_UNAUTHORIZED"),
        ({"jti": None}, {}, "AUTH_UNAUTHORIZED"),
    ],
)
def test_expired_code_requires_valid_signature_and_all_other_claims(changes, options, expected):
    now = int(utcnow().timestamp())
    claims = {
        "iss": "campusloop-api",
        "aud": "campusloop-web",
        "sub": "1",
        "sid": str(uuid.uuid4()),
        "jti": uuid.uuid4().hex,
        "iat": now - 60,
        "exp": now - 1,
    } | changes
    with pytest.raises(BusinessError) as error:
        decode_access(encode(claims, **options))
    assert error.value.status == 401
    assert error.value.code == expected


@pytest.mark.integration
@requires_postgres
@pytest.mark.parametrize("kind", ["missing", "malformed", "signature", "expired"])
def test_valid_browser_cookie_cannot_replace_rejected_bearer(client, kind):
    data = browser_account(client).json()["data"]
    claims = decode_access(data["accessToken"])
    candidates = {
        "malformed": "not-a-jwt",
        "signature": encode(claims, key="attacker-key-" + "z" * 40),
        "expired": encode(
            claims | {"iat": int(utcnow().timestamp()) - 60, "exp": int(utcnow().timestamp()) - 1}
        ),
    }
    bearer = {"Authorization": "Bearer " + candidates[kind]} if kind != "missing" else {}
    expected = "AUTH_ACCESS_EXPIRED" if kind == "expired" else "AUTH_UNAUTHORIZED"
    for method, payload in (("GET", {}), ("PATCH", {"json": {"bio": "must not be saved"}})):
        denied = client.request(method, "/users/me", headers=BROWSER | bearer, **payload)
        assert denied.status_code == 401
        assert denied.json()["code"] == expected
        assert denied.headers["www-authenticate"] == "Bearer"
    renewed = client.post("/auth/browser-session", headers=BROWSER, json={})
    assert renewed.status_code == 200
    good = {"Authorization": "Bearer " + renewed.json()["data"]["accessToken"]}
    profile = client.get("/users/me", headers=good)
    assert profile.status_code == 200
    assert profile.json()["data"]["bio"] is None
    assert client.get("/users/me", headers=bearer).status_code == 401


@pytest.mark.integration
@requires_postgres
@pytest.mark.parametrize("invalidate", ["logout", "family-expired"])
@pytest.mark.parametrize("expired", [False, True])
def test_old_access_and_cookie_both_fail_after_session_invalidation(client, invalidate, expired):
    data = browser_account(client).json()["data"]
    claims = decode_access(data["accessToken"])
    access = (
        encode(claims | {"exp": int(utcnow().timestamp()) - 1}) if expired else data["accessToken"]
    )
    cookie = next(iter(client.cookies.items()))
    if invalidate == "logout":
        assert client.post("/auth/logout", headers=BROWSER).status_code == 204
        client.cookies.set(*cookie)
    else:
        with SessionLocal() as db:
            family = db.get(AuthSessionFamily, claims["sid"])
            family.expires_at = utcnow() - timedelta(seconds=1)
            db.commit()
    rejected = client.get("/users/me", headers={"Authorization": "Bearer " + access})
    assert rejected.status_code == 401
    assert rejected.json()["code"] == "AUTH_UNAUTHORIZED"
    assert client.post("/auth/browser-session", headers=BROWSER, json={}).status_code == 401
    # A new login cookie must not turn the revoked family's expired token into renewable expiry.
    logged_in = client.post(
        "/auth/login",
        headers=BROWSER,
        json={"email": data["user"]["email"], "password": "Valid@12345"},
    )
    assert logged_in.status_code == 200
    again = client.get("/users/me", headers={"Authorization": "Bearer " + access})
    assert again.status_code == 401 and again.json()["code"] == "AUTH_UNAUTHORIZED"
