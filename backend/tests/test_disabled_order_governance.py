"""Actual API journeys; only the dedicated integration database is permitted."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Event
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.security import utcnow
from app.db.session import SessionLocal
from app.main import app
from app.models import (
    AccountAppeal,
    AccountDecision,
    AuthAudit,
    Notification,
    Offer,
    Order,
    OrderEvent,
    Product,
    User,
)
from tests.conftest import requires_postgres
from tests.test_account_appeals import admin, appeal, decide, review
from tests.test_account_appeals import isolated_database as isolated_database
from tests.test_auth import account, headers
from tests.test_transaction_api import key_headers, pending_order, product

pytestmark = [pytest.mark.integration, requires_postgres]


def pending_offer(client, seller, buyer, disabled_role):
    item = product(client, seller)
    response = client.post("/chat/sessions", headers=headers(buyer), json={"productId": item["id"]})
    assert response.status_code == 200, response.text
    context = response.json()["data"]
    response = client.post(
        f'/chat/sessions/{context["id"]}/offers',
        headers=key_headers(buyer),
        json={"amount": 45},
    )
    assert response.status_code == 201, response.text
    offer = response.json()["data"]
    if disabled_role == "seller":
        response = client.post(
            f'/offers/{offer["id"]}/counter',
            headers=key_headers(seller),
            json={"amount": 46},
        )
        assert response.status_code == 201, response.text
        offer = response.json()["data"]
    return item, context, offer


@pytest.mark.parametrize("disabled_role", ["buyer", "seller"])
@pytest.mark.parametrize("operation", ["create", "counter", "accept"])
def test_disabled_peer_cannot_receive_new_offer_or_order(client, disabled_role, operation):
    seller, buyer, operator = account(client), account(client), admin(client)
    item, context, offer = pending_offer(client, seller, buyer, disabled_role)
    disabled = buyer if disabled_role == "buyer" else seller
    active = seller if disabled_role == "buyer" else buyer
    decide(client, operator, disabled, "DISABLE")
    with SessionLocal() as db:
        before_offers = db.scalar(
            select(func.count(Offer.id)).where(Offer.session_id == context["id"])
        )
        before_notifications = db.scalar(select(func.count(Notification.id)))
    endpoint = (
        f'/chat/sessions/{context["id"]}/offers'
        if operation == "create"
        else f'/offers/{offer["id"]}/{operation}'
    )
    result = client.post(
        endpoint,
        headers=key_headers(active),
        **({} if operation == "accept" else {"json": {"amount": 44}}),
    )
    assert result.status_code == 409, result.text
    assert result.json()["code"] == "OFFER_PEER_DISABLED"
    with SessionLocal() as db:
        assert db.get(Product, item["id"]).status == "ON_SALE"
        assert db.get(Offer, offer["id"]).status == "PENDING"
        assert db.scalar(select(func.count(Order.id)).where(Order.product_id == item["id"])) == 0
        assert (
            db.scalar(select(func.count(Offer.id)).where(Offer.session_id == context["id"]))
            == before_offers
        )
        assert db.scalar(select(func.count(Notification.id))) == before_notifications


def test_peer_status_lock_returns_conflict_and_same_attempt_can_retry(client):
    seller, buyer = account(client), account(client)
    item, _, offer = pending_offer(client, seller, buyer, "buyer")
    accept_headers = key_headers(seller)
    endpoint = f'/offers/{offer["id"]}/accept'
    with SessionLocal.begin() as peer_request:
        peer_request.scalar(
            select(User).where(User.id == buyer["user"]["id"]).with_for_update(key_share=True)
        )
        result = client.post(endpoint, headers=accept_headers)
        assert result.status_code == 409, result.text
        assert result.json()["code"] == "OFFER_PEER_BUSY"
        with SessionLocal() as db:
            assert db.get(Product, item["id"]).status == "ON_SALE"
            assert db.get(Offer, offer["id"]).status == "PENDING"
            assert (
                db.scalar(select(func.count(Order.id)).where(Order.product_id == item["id"])) == 0
            )
    accepted = client.post(endpoint, headers=accept_headers)
    assert accepted.status_code == 200, accepted.text
    assert client.post(endpoint, headers=accept_headers).json() == accepted.json()
    with SessionLocal() as db:
        assert db.scalar(select(func.count(Order.id)).where(Order.product_id == item["id"])) == 1


@pytest.mark.parametrize("disabled_role", ["buyer", "seller"])
def test_disable_waits_for_acceptance_and_protects_the_new_order(client, disabled_role):
    from app.api.routes import transactions

    seller, buyer, operator = account(client), account(client), admin(client)
    item, _, offer = pending_offer(client, seller, buyer, disabled_role)
    disabled = buyer if disabled_role == "buyer" else seller
    active = seller if disabled_role == "buyer" else buyer
    eligibility_checked, finish_acceptance, disabling = Event(), Event(), Event()
    original = transactions.available_product

    def pause_after_eligibility(db, context, actor):
        result = original(db, context, actor)
        eligibility_checked.set()
        assert finish_acceptance.wait(timeout=10)
        return result

    def accept():
        with TestClient(app) as other:
            return other.post(f'/offers/{offer["id"]}/accept', headers=key_headers(active))

    def disable():
        disabling.set()
        with TestClient(app) as other:
            return decide(other, operator, disabled, "DISABLE")

    with patch.object(transactions, "available_product", pause_after_eligibility):
        with ThreadPoolExecutor(max_workers=2) as pool:
            accepting = pool.submit(accept)
            try:
                assert eligibility_checked.wait(timeout=10)
                disable_result = pool.submit(disable)
                assert disabling.wait(timeout=10)
            finally:
                finish_acceptance.set()
            accepted = accepting.result(timeout=15)
            assert accepted.status_code == 200, accepted.text
            disable_result.result(timeout=15)
    saved = client.get(
        f'/orders/{accepted.json()["data"]["order"]["id"]}', headers=headers(active)
    ).json()["data"]
    assert saved["participantDisabled"] is True
    assert saved["status"] == "PENDING_CONFIRM"
    with SessionLocal() as db:
        assert db.get(Product, item["id"]).status == "RESERVED"
        assert (
            db.scalar(
                select(func.count(OrderEvent.id)).where(
                    OrderEvent.order_id == saved["id"],
                    OrderEvent.description == "交易参与方账号被禁用，可由正常账号一方取消订单。",
                )
            )
            == 1
        )


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
    reviewed = client.post(
        "/reviews",
        headers=key_headers(seller),
        json={
            "orderId": order["id"],
            "overall": 4,
            "descriptionAccuracy": 4,
            "communication": 4,
            "punctuality": 4,
            "comment": "真实完成的交易仍可评价",
        },
    )
    assert reviewed.status_code == 201, reviewed.text
    assert reviewed.json()["data"]["revieweeId"] == buyer["user"]["id"]


def test_both_disabled_early_order_can_be_resolved_by_admin(client):
    seller, buyer, operator = account(client), account(client), admin(client)
    item, _, order = pending_order(client, seller, buyer)
    decide(client, operator, buyer, "DISABLE")
    decide(client, operator, seller, "DISABLE")
    with SessionLocal() as db:
        saved = db.get(Order, order["id"])
        assert saved.status == "DISPUTED"
        version = saved.version
    result = client.post(
        f'/admin/orders/{order["id"]}/cancel-dispute',
        headers=headers(operator),
        json={"reason": "双方均已禁用，核实未交付后取消", "expectedVersion": version},
    )
    assert result.status_code == 200, result.text
    with SessionLocal() as db:
        assert db.get(Order, order["id"]).status == "CANCELLED"
        assert db.get(Product, item["id"]).status == "HIDDEN"


@pytest.mark.parametrize("operation", ["cancel", "reject"])
@pytest.mark.parametrize("unavailable", ["disabled", "RESERVED", "HIDDEN"])
def test_pending_offer_can_be_closed_without_starting_a_new_trade(client, operation, unavailable):
    seller, buyer, operator = account(client), account(client), admin(client)
    item, _, offer = pending_offer(client, seller, buyer, "buyer")
    active, peer = (buyer, seller) if operation == "cancel" else (seller, buyer)
    endpoint = f'/offers/{offer["id"]}/{operation}'
    # Role/ownership checks still apply even when trading is unavailable.
    assert client.post(endpoint, headers=headers(peer)).status_code == 403
    if unavailable == "disabled":
        decide(client, operator, peer, "DISABLE")
    else:
        with SessionLocal.begin() as db:
            db.get(Product, item["id"]).status = unavailable
    assert client.post(endpoint, headers=headers(account(client))).status_code == 403
    result = client.post(endpoint, headers=headers(active))
    assert result.status_code == 200, result.text
    assert result.json()["data"]["status"] == ("CANCELLED" if operation == "cancel" else "REJECTED")
    assert client.post(endpoint, headers=headers(active)).status_code == 409


def test_meetup_edit_cannot_erase_a_completion_confirmation(client):
    seller, buyer = account(client), account(client)
    _, _, order = pending_order(client, seller, buyer)
    arrange(client, buyer, seller, order, complete=True)
    endpoint = f'/orders/{order["id"]}'
    result = client.post(
        endpoint + "/meetup",
        headers=key_headers(seller),
        json={
            "campusLocation": "校内公共区",
            "scheduledDate": (utcnow() + timedelta(days=3)).date().isoformat(),
            "timeSlotStart": "12:00",
            "timeSlotEnd": "13:00",
        },
    )
    assert result.status_code == 409, result.text
    current = client.get(endpoint, headers=headers(buyer)).json()["data"]
    assert current["buyerConfirmedComplete"] is True
    assert client.post(
        endpoint + "/cancel", headers=headers(seller), json={"reason": "试图绕过完成确认"}
    ).status_code == 409
