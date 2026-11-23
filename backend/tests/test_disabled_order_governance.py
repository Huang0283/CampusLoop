"""Actual API journeys; only the dedicated integration database is permitted."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.security import utcnow
from app.db.session import SessionLocal
from app.main import app
from app.models import AccountAppeal, AccountDecision, AuthAudit, Notification, Order, OrderEvent
from tests.conftest import requires_postgres
from tests.test_account_appeals import admin, appeal, decide, review
from tests.test_account_appeals import isolated_database as isolated_database
from tests.test_auth import account, headers
from tests.test_transaction_api import key_headers, pending_order

pytestmark = [pytest.mark.integration, requires_postgres]


def arrange(client, buyer, seller, order, complete=False):
    endpoint = f'/orders/{order["id"]}'
    result = client.post(
        endpoint + "/meetup",
        headers=key_headers(buyer),
        json={
            "campusLocation": "校内公共区",
            "scheduledDate": (utcnow() + timedelta(days=2)).date().isoformat(),
            "timeSlotStart": "12:00",
            "timeSlotEnd": "13:00",
            "note": "验收夹具",
        },
    )
    assert result.status_code == 200, result.text
    meetup = result.json()["data"]
    for actor in (buyer, seller):
        result = client.post(
            endpoint + "/meetup/confirm",
            headers=key_headers(actor),
            json={"meetupId": meetup["id"], "version": meetup["version"]},
        )
        assert result.status_code == 200, result.text
    if complete:
        result = client.post(
            endpoint + "/confirm-complete",
            headers=key_headers(buyer),
            json={"meetupVersion": meetup["version"]},
        )
        assert result.status_code == 200, result.text


@pytest.mark.parametrize("disabled_role", ["buyer", "seller"])
@pytest.mark.parametrize("stage", ["early", "arranged", "one_complete"])
def test_disable_protects_order_and_cancellation_is_audited(client, disabled_role, stage):
    seller, buyer, operator = account(client), account(client), admin(client)
    _, _, order = pending_order(client, seller, buyer)
    endpoint = f'/orders/{order["id"]}'
    if stage != "early":
        arrange(client, buyer, seller, order, complete=stage == "one_complete")
    disabled = buyer if disabled_role == "buyer" else seller
    active = seller if disabled_role == "buyer" else buyer
    decide(client, operator, disabled, "DISABLE")
    assert client.get("/users/me", headers=headers(disabled)).status_code == 423
    current = client.get(endpoint, headers=headers(active)).json()["data"]
    assert current["participantDisabled"] is True
    assert client.get(endpoint, headers=headers(account(client))).status_code == 403
    if stage == "early":
        assert current["status"] == "PENDING_CONFIRM"
        assert (
            client.post(
                endpoint + "/meetup",
                headers=key_headers(active),
                json={
                    "campusLocation": "校内",
                    "scheduledDate": (utcnow() + timedelta(days=2)).date().isoformat(),
                    "timeSlotStart": "12:00",
                    "timeSlotEnd": "13:00",
                },
            ).status_code
            == 409
        )
        result = client.post(
            endpoint + "/cancel", headers=headers(active), json={"reason": "对方被禁用，未交付取消"}
        )
        assert result.status_code == 200, result.text
    else:
        assert current["status"] == "DISPUTED"
        assert current["product"]["status"] == "RESERVED"
        assert (
            client.post(
                endpoint + "/cancel", headers=headers(active), json={"reason": "不能自行取消"}
            ).status_code
            == 409
        )
        admin_endpoint = f'/admin/orders/{order["id"]}/cancel-dispute'
        body = {"reason": "核实双方已协商线下结清并取消", "expectedVersion": current["version"]}
        assert client.post(admin_endpoint, headers=headers(active), json=body).status_code == 403
        assert (
            client.post(
                admin_endpoint, headers=headers(operator), json={**body, "reason": " "}
            ).status_code
            == 422
        )
        assert (
            client.post(
                admin_endpoint,
                headers=headers(operator),
                json={**body, "expectedVersion": current["version"] - 1},
            ).status_code
            == 409
        )
        result = client.post(admin_endpoint, headers=headers(operator), json=body)
        assert result.status_code == 200, result.text
        assert client.post(admin_endpoint, headers=headers(operator), json=body).status_code == 409
        with SessionLocal() as db:
            audits = db.scalars(
                select(AuthAudit).where(AuthAudit.event == "admin_order_dispute_cancelled")
            ).all()
            assert sum(row.context["orderId"] == order["id"] for row in audits) == 1
        history = client.get(f'/admin/orders/{order["id"]}/events', headers=headers(operator))
        assert (
            history.status_code == 200
            and history.json()["data"][-1]["description"] == body["reason"]
        )
    saved = result.json()["data"]
    assert saved["status"] == "CANCELLED"
    assert saved["product"]["status"] == ("HIDDEN" if disabled_role == "seller" else "ON_SALE")
    reloaded = client.get(endpoint, headers=headers(active)).json()["data"]
    assert reloaded["status"] == saved["status"] and reloaded["version"] == saved["version"]
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count(OrderEvent.id)).where(
                    OrderEvent.order_id == order["id"], OrderEvent.to_status == "CANCELLED"
                )
            )
            == 1
        )


def test_original_admin_cannot_review_or_restore_their_own_decision(client):
    user, operator, reviewer = account(client), admin(client), admin(client)
    decision = decide(client, operator, user, "DISABLE")
    scoped = {
        "accessToken": client.get("/users/me", headers=headers(user)).json()["details"][
            "appealToken"
        ]
    }
    submitted = appeal(client, scoped, decision["id"])
    for outcome in ("UPHELD", "REVOKED"):
        denied = review(client, operator, submitted["id"], outcome)
        assert denied.status_code == 403 and denied.json()["code"] == "INDEPENDENT_REVIEW_REQUIRED"
    denied = client.patch(
        f'/admin/users/{user["user"]["id"]}/status',
        headers=headers(operator),
        json={"status": "ACTIVE", "reason": "绕过申诉入口"},
    )
    assert denied.status_code == 403
    with SessionLocal() as db:
        assert db.get(AccountAppeal, submitted["id"]).status == "PENDING"
        assert db.get(AccountDecision, decision["id"]).revoked_at is None
    assert review(client, reviewer, submitted["id"], "REVOKED").status_code == 200


def test_admin_cannot_cancel_a_normal_order_as_a_dispute(client):
    seller, buyer, operator = account(client), account(client), admin(client)
    _, _, order = pending_order(client, seller, buyer)
    result = client.post(
        f'/admin/orders/{order["id"]}/cancel-dispute',
        headers=headers(operator),
        json={"expectedVersion": order["version"], "reason": "无争议的订单"},
    )
    assert result.status_code == 409
    with SessionLocal() as db:
        assert db.get(Order, order["id"]).status == "PENDING_CONFIRM"


def test_two_administrators_cannot_cancel_the_same_dispute_twice(client):
    seller, buyer, first, second = account(client), account(client), admin(client), admin(client)
    _, _, order = pending_order(client, seller, buyer)
    arrange(client, buyer, seller, order, complete=True)
    decide(client, first, buyer, "DISABLE")
    current = client.get(f'/orders/{order["id"]}', headers=headers(seller)).json()["data"]

    def cancel(operator):
        with TestClient(app) as other:
            return other.post(
                f'/admin/orders/{order["id"]}/cancel-dispute',
                headers=headers(operator),
                json={"expectedVersion": current["version"], "reason": "并发复核已线下结清"},
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(cancel, (first, second))) == [200, 409]
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count(OrderEvent.id)).where(
                    OrderEvent.order_id == order["id"], OrderEvent.to_status == "CANCELLED"
                )
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count(Notification.id)).where(
                    Notification.user_id.in_((buyer["user"]["id"], seller["user"]["id"])),
                    Notification.payload["title"].astext == "Order cancelled",
                )
            )
            == 2
        )


def test_completed_trade_is_not_rewritten_when_a_participant_is_disabled(client):
    seller, buyer, operator = account(client), account(client), admin(client)
    _, _, order = pending_order(client, seller, buyer)
    arrange(client, buyer, seller, order, complete=True)
    current = client.get(f'/orders/{order["id"]}', headers=headers(seller)).json()["data"]
    completed = client.post(
        f'/orders/{order["id"]}/confirm-complete',
        headers=key_headers(seller),
        json={"meetupVersion": current["meetup"]["version"]},
    )
    assert completed.status_code == 200
    before = completed.json()["data"]["order"]
    decide(client, operator, buyer, "DISABLE")
    after = client.get(f'/orders/{order["id"]}', headers=headers(seller)).json()["data"]
    assert after["status"] == "COMPLETED" and after["product"]["status"] == "SOLD"
    assert after["version"] == before["version"]
