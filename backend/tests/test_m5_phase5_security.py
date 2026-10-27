"""M5 Phase 5 security regression scenarios (BP5-01/BP5-02).

These checks run only against the dedicated PostgreSQL/Redis/MinIO integration
environment. They cover the release boundary that is easy to miss when the
broader Phase 3/4 suites are run independently: authentication throttling,
neutral credential errors, and administrator-only moderation access.
"""

import logging
import uuid

import pytest

from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_transaction_api import image_url, key_headers

pytestmark = [pytest.mark.integration, requires_postgres]


def test_login_failures_are_rate_limited_without_disclosing_account_state(client):
    target = account(client)
    for email in (target["user"]["email"], f"unknown-{uuid.uuid4().hex}@example.invalid"):
        payload = {"email": email, "password": "Wrong@12345"}
        responses = [client.post("/auth/login", json=payload) for _ in range(6)]

        assert [response.status_code for response in responses[:5]] == [401] * 5
        assert {response.json()["code"] for response in responses[:5]} == {
            "AUTH_INVALID_CREDENTIALS"
        }
        assert responses[-1].status_code == 429
        assert responses[-1].headers["retry-after"]
        assert email not in responses[-1].text
        assert "Wrong@12345" not in responses[-1].text
        assert "accessToken" not in responses[-1].text


def test_registration_ip_rate_limit_rejects_excess_attempts(client):
    def register(index):
        return client.post(
            "/auth/register",
            json={
                "email": f"blocked-{index}-{uuid.uuid4().hex}@outside.invalid",
                "password": "Valid@12345",
                "nickname": "Blocked registration",
            },
        )

    allowed_but_rejected_domain = [register(index) for index in range(10)]
    blocked = register(10)

    assert [response.status_code for response in allowed_but_rejected_domain] == [422] * 10
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"]


def test_admin_moderation_requires_role_and_authenticated_evidence_context(client, caplog):
    reporter, target, outsider = account(client), account(client), account(client)
    evidence = image_url(client, reporter, "evidence")
    caplog.set_level(logging.INFO, logger="http")
    report = client.post(
        "/reports",
        headers=key_headers(reporter),
        json={
            "targetType": "USER",
            "targetId": target["user"]["id"],
            "reason": "SPAM",
            "description": "Release security review",
            "evidence": [evidence],
        },
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["data"]["id"]

    for actor_headers in ({}, headers(outsider), headers(reporter)):
        assert client.get("/admin/reports", headers=actor_headers).status_code in (401, 403)
        assert client.get(
            f"/admin/reports/{report_id}/evidence/0", headers=actor_headers
        ).status_code in (401, 403)
    assert evidence not in caplog.text


def test_http_access_log_omits_authentication_payload(client, caplog):
    email = f"log-secret-{uuid.uuid4().hex}@example.invalid"
    password = "LogSecret@12345"
    caplog.set_level(logging.INFO, logger="http")

    registered = client.post(
        "/auth/register", json={"email": email, "password": password, "nickname": "Log test"}
    )
    assert registered.status_code == 201
    login = client.post("/auth/login", json={"email": email, "password": password})

    assert login.status_code == 200
    profile = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {login.json()['data']['accessToken']}"},
    )
    assert profile.status_code == 200
    assert "request_finished" in caplog.text
    for value in (
        email,
        password,
        registered.json()["data"]["accessToken"],
        registered.json()["data"]["refreshToken"],
        login.json()["data"]["accessToken"],
        login.json()["data"]["refreshToken"],
    ):
        assert value not in caplog.text
