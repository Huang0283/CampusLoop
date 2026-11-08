"""Real transactions against the explicitly isolated audit database only."""

import io
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from urllib.parse import urlsplit

import jwt
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import hash_password, signing_key, utcnow
from app.db.session import SessionLocal
from app.main import app
from app.models import AccountAppeal, AccountDecision, AuthAudit, Notification, User
from tests.conftest import requires_postgres
from tests.test_auth import account, headers

pytestmark = [pytest.mark.integration, requires_postgres]
PASSWORD = "Valid@12345"


@pytest.fixture(autouse=True)
def isolated_database():
    settings = get_settings()
    database = urlsplit(settings.database_url)
    name = database.path.lower()
    github_postgres = (
        os.environ.get("GITHUB_ACTIONS") == "true"
        and settings.app_env == "ci"
        and database.hostname in ("localhost", "127.0.0.1")
        and name == "/campusloop"
    )
    assert "audit" in name or "test" in name or github_postgres
    assert urlsplit(settings.redis_url).path in ("/14", "/15")


def admin(client):
    email = f"appeal-admin-{uuid.uuid4().hex}@example.invalid"
    with SessionLocal() as db:
        db.add(
            User(
                email=email,
                password_hash=hash_password(PASSWORD),
                nickname="申诉管理员",
                role="ADMIN",
                status="ACTIVE",
            )
        )
        db.commit()
    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["data"]


def decide(client, operator, user, action="WARNING", **extra):
    response = client.post(
        f'/admin/users/{user["user"]["id"]}/decisions',
        headers={**headers(operator), "Idempotency-Key": uuid.uuid4().hex},
        json={
            "action": action,
            "reason": "商品信息违规",
            "facts": "发布与商品不符的信息",
            "basis": "平台商品信息规则",
            "occurredAt": (utcnow() - timedelta(minutes=1)).isoformat(),
            **extra,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def appeal(client, credentials, decision_id, **extra):
    response = client.post(
        f"/account/decisions/{decision_id}/appeal",
        headers=headers(credentials),
        json={"explanation": "商品信息有误，我补充说明情况。", **extra},
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]


def review(client, operator, appeal_id, outcome):
    return client.post(
        f"/admin/appeals/{appeal_id}/review",
        headers=headers(operator),
        json={"outcome": outcome, "reason": "已核实补充说明。"},
    )


def test_warning_notice_and_appeal_upheld_preserve_original(client):
    user, peer, operator = account(client), account(client), admin(client)
    decision = decide(client, operator, user)
    assert decision["facts"] == "发布与商品不符的信息"
    assert decision["appeal"] is None
    assert client.get("/users/me", headers=headers(user)).status_code == 200
    notices = client.get("/notifications", headers=headers(user)).json()["data"]
    notice = next(item for item in notices if item["type"] == "ACCOUNT_ACTION")
    assert not notice["read"] and notice["link"] == f'/account/decisions/{decision["id"]}'
    assert (
        client.post(f'/notifications/{notice["id"]}/read', headers=headers(user)).status_code == 204
    )
    assert (
        client.get(f'/account/decisions/{decision["id"]}', headers=headers(peer)).status_code == 404
    )
    submitted = appeal(client, user, decision["id"])
    assert appeal(client, user, decision["id"])["id"] == submitted["id"]
    assert (
        client.post(
            f'/account/decisions/{decision["id"]}/appeal',
            headers=headers(user),
            json={"explanation": "重复改写"},
        ).status_code
        == 409
    )
    assert client.get("/admin/appeals", headers=headers(user)).status_code == 403
    admin_notices = client.get("/notifications", headers=headers(operator)).json()["data"]
    assert any(
        item["type"] == "APPEAL_RECEIVED" and item["link"].endswith(f'appeal={submitted["id"]}')
        for item in admin_notices
    )
    result = review(client, operator, submitted["id"], "UPHELD")
    assert result.status_code == 200, result.text
    assert result.json()["data"]["appeal"]["status"] == "UPHELD"
    assert review(client, operator, submitted["id"], "UPHELD").status_code == 200
    assert review(client, operator, submitted["id"], "REVOKED").status_code == 409
    stored = client.get(f'/account/decisions/{decision["id"]}', headers=headers(user)).json()[
        "data"
    ]
    assert stored["facts"] == decision["facts"] and stored["revokedAt"] is None
    assert stored["appeal"]["reviewReason"] == "已核实补充说明。"
    assert any(
        item["type"] == "APPEAL_RESULT"
        for item in client.get("/notifications", headers=headers(user)).json()["data"]
    )


def test_disabled_identity_appeals_but_cannot_transact_and_requires_new_login_after_restore(client):
    user, operator = account(client), admin(client)
    decision = decide(client, operator, user, "DISABLE")
    disabled = client.get("/users/me", headers=headers(user))
    assert disabled.status_code == 423
    scoped = {"accessToken": disabled.json()["details"]["appealToken"]}
    assert "refreshToken" not in disabled.json()["details"]
    login = client.post("/auth/login", json={"email": user["user"]["email"], "password": PASSWORD})
    assert login.status_code == 423 and login.json()["details"]["appealToken"]
    assert (
        client.post(
            "/auth/login", json={"email": user["user"]["email"], "password": "wrong"}
        ).status_code
        == 401
    )
    for path in ["/users/me", "/notifications", "/admin/appeals", "/products/mine"]:
        assert client.get(path, headers=headers(scoped)).status_code in (401, 404, 422)
    assert client.post("/products", headers=headers(scoped), json={}).status_code in (401, 422)
    assert client.get("/account/decisions", headers=headers(scoped)).status_code == 200
    submitted = appeal(client, scoped, decision["id"])
    assert review(client, operator, submitted["id"], "REVOKED").status_code == 200
    result = client.get(f'/account/decisions/{decision["id"]}', headers=headers(scoped)).json()[
        "data"
    ]
    assert result["revokedAt"] and result["appeal"]["status"] == "REVOKED"
    assert result["reason"] == decision["reason"]
    assert client.get("/users/me", headers=headers(user)).status_code == 401
    assert client.get("/users/me", headers=headers(scoped)).status_code == 401
    assert (
        client.post(
            "/auth/login", json={"email": user["user"]["email"], "password": PASSWORD}
        ).status_code
        == 200
    )


def test_scoped_tokens_expiry_tampering_and_private_evidence_ownership(client):
    user, peer, operator = account(client), account(client), admin(client)
    decision = decide(client, operator, user, "DISABLE")
    scoped = {
        "accessToken": client.get("/users/me", headers=headers(user)).json()["details"][
            "appealToken"
        ]
    }
    token = scoped["accessToken"]
    expired = jwt.decode(token, signing_key(), algorithms=["HS256"], audience="account-appeals")
    expired["exp"] = int(utcnow().timestamp()) - 1
    assert (
        client.get(
            "/account/decisions",
            headers=headers({"accessToken": jwt.encode(expired, signing_key(), algorithm="HS256")}),
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/account/decisions", headers=headers({"accessToken": token + "tampered"})
        ).status_code
        == 401
    )
    image = io.BytesIO()
    Image.new("RGB", (12, 12), "white").save(image, "PNG")
    uploaded = client.post(
        "/account/appeals/images",
        headers=headers(scoped),
        files={"file": ("evidence.png", image.getvalue(), "image/png")},
    )
    assert uploaded.status_code == 201, uploaded.text
    reference = uploaded.json()["data"]["url"]
    assert (
        client.post(
            f'/account/decisions/{decision["id"]}/appeal',
            headers=headers(peer),
            json={"explanation": "偷用证据", "evidence": [reference]},
        ).status_code
        == 404
    )
    other_decision = decide(client, operator, peer)
    assert (
        client.post(
            f'/account/decisions/{other_decision["id"]}/appeal',
            headers=headers(peer),
            json={"explanation": "偷用证据", "evidence": [reference]},
        ).status_code
        == 403
    )
    submitted = appeal(client, scoped, decision["id"], evidence=[reference])
    url = f'/account/appeals/{submitted["id"]}/evidence/0'
    assert client.get(url, headers=headers(peer)).status_code == 404
    assert client.get(url).status_code == 401
    viewed = client.get(url, headers=headers(scoped))
    assert viewed.status_code == 200 and viewed.headers["cache-control"] == "no-store"
    assert (
        client.get(
            f'/admin/appeals/{submitted["id"]}/evidence/0', headers=headers(operator)
        ).status_code
        == 200
    )


def test_restore_closes_pending_appeal_and_old_warning_cannot_undo_new_disable(client):
    user, operator = account(client), admin(client)
    warning = decide(client, operator, user)
    warning_appeal = appeal(client, user, warning["id"])
    disabled = decide(client, operator, user, "DISABLE")
    assert review(client, operator, warning_appeal["id"], "REVOKED").status_code == 200
    assert client.get("/users/me", headers=headers(user)).status_code == 423
    scoped = {
        "accessToken": client.get("/users/me", headers=headers(user)).json()["details"][
            "appealToken"
        ]
    }
    pending = appeal(client, scoped, disabled["id"])
    restored = client.patch(
        f'/admin/users/{user["user"]["id"]}/status',
        headers=headers(operator),
        json={"status": "ACTIVE", "reason": "人工核实后恢复"},
    )
    assert restored.status_code == 200
    result = client.get(f'/admin/appeals/{pending["id"]}', headers=headers(operator)).json()["data"]
    assert result["appeal"]["status"] == "REVOKED" and result["decision"]["revokedAt"]
    assert review(client, operator, pending["id"], "UPHELD").status_code == 409


def test_permissions_idempotency_and_concurrent_review(client):
    user, operator, operator2 = account(client), admin(client), admin(client)
    body = {
        "action": "WARNING",
        "reason": "测试警告",
        "facts": "测试事实",
        "basis": "测试依据",
        "occurredAt": (utcnow() - timedelta(minutes=1)).isoformat(),
    }
    for target in [operator, operator2]:
        denied = client.post(
            f'/admin/users/{target["user"]["id"]}/decisions',
            headers={**headers(operator), "Idempotency-Key": uuid.uuid4().hex},
            json=body,
        )
        assert denied.status_code in (403, 404)
    endpoint = f'/admin/users/{user["user"]["id"]}/decisions'
    assert client.post(endpoint, headers=headers(user), json=body).status_code == 403
    request_headers = {**headers(operator), "Idempotency-Key": uuid.uuid4().hex}
    first = client.post(endpoint, headers=request_headers, json=body)
    assert first.status_code == 201, first.text
    assert client.post(endpoint, headers=request_headers, json=body).json() == first.json()
    assert (
        client.post(
            endpoint, headers=request_headers, json={**body, "reason": "修改原因"}
        ).status_code
        == 409
    )
    submitted = appeal(client, user, first.json()["data"]["id"])

    def concurrent_review(credentials, outcome):
        with TestClient(app) as other:
            return review(other, credentials, submitted["id"], outcome).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda pair: concurrent_review(*pair),
                [(operator, "UPHELD"), (operator2, "REVOKED")],
            )
        )
    assert sorted(results) == [200, 409]
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(AccountAppeal)
                .where(AccountAppeal.decision_id == first.json()["data"]["id"])
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuthAudit)
                .where(
                    AuthAudit.event == "admin_account_appeal_review",
                    AuthAudit.target_id == user["user"]["id"],
                )
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(Notification)
                .where(
                    Notification.user_id == user["user"]["id"], Notification.type == "APPEAL_RESULT"
                )
            )
            == 1
        )
        assert db.get(AccountDecision, first.json()["data"]["id"])


def test_browser_disable_after_reload_and_logged_out_tokens_cannot_gain_appeal_access(client):
    operator = admin(client)
    user = account(client)
    token = user["accessToken"]
    assert client.post("/auth/logout", headers=headers(user)).status_code == 204
    decide(client, operator, user, "DISABLE")
    assert client.get("/users/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert (
        client.post("/auth/refresh", json={"refreshToken": user["refreshToken"]}).status_code == 401
    )

    rotated_user = account(client)
    rotated = client.post("/auth/refresh", json={"refreshToken": rotated_user["refreshToken"]})
    assert rotated.status_code == 200
    decide(client, operator, rotated_user, "DISABLE")
    assert (
        client.post(
            "/auth/refresh", json={"refreshToken": rotated_user["refreshToken"]}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/auth/refresh", json={"refreshToken": rotated.json()["data"]["refreshToken"]}
        ).status_code
        == 423
    )

    browser_headers = {"Origin": get_settings().cors_origin_list[0], "X-CampusLoop-Browser": "1"}
    email = f"browser-appeal-{uuid.uuid4().hex}@example.invalid"
    result = client.post(
        "/auth/register",
        headers=browser_headers,
        json={"email": email, "password": PASSWORD, "nickname": "禁用刷新"},
    )
    assert result.status_code == 201, result.text
    browser_user = result.json()["data"]
    decide(client, operator, browser_user, "DISABLE")
    response = client.post("/auth/browser-session", headers=browser_headers, json={})
    assert response.status_code == 423
    scoped = {"accessToken": response.json()["details"]["appealToken"]}
    assert client.get("/account/decisions", headers=headers(scoped)).status_code == 200
    assert client.post("/auth/logout", headers=browser_headers).status_code == 204
    assert client.post("/auth/browser-session", headers=browser_headers, json={}).status_code == 401
