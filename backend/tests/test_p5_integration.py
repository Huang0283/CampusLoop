"""BP5-03/04: actual PostgreSQL transactions and durable HTTP recovery."""

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import utcnow
from app.db.session import SessionLocal
from app.main import app
from app.models import ChatMessage, Order, OrderEvent, Product, Review
from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_transaction_api import key_headers, pending_order, product

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "p5-integration-only-" + "x" * 40)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def race(actions):
    barrier = threading.Barrier(len(actions))

    def run(action):
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            return action(client)

    with ThreadPoolExecutor(max_workers=len(actions)) as executor:
        return list(executor.map(run, actions))


def test_different_buyers_race_for_same_product_creates_one_order(client):
    seller = account(client)
    buyers = [account(client), account(client)]
    item = product(client, seller)
    actions = []
    for buyer in buyers:
        sid = client.post(
            "/chat/sessions", headers=headers(buyer), json={"productId": item["id"]}
        ).json()["data"]["id"]
        offer = client.post(
            f"/chat/sessions/{sid}/offers", headers=key_headers(seller), json={"amount": 40}
        ).json()["data"]
        actions.append(
            lambda c, buyer=buyer, oid=offer["id"]: c.post(
                f"/offers/{oid}/accept", headers=key_headers(buyer)
            )
        )
    results = race(actions)
    assert sorted(r.status_code for r in results) == [200, 409], [r.text for r in results]
    with SessionLocal() as db:
        orders = db.scalars(select(Order).where(Order.product_id == item["id"])).all()
        assert len(orders) == 1 and db.get(Product, item["id"]).status == "RESERVED"
        assert (
            db.scalar(
                select(func.count())
                .select_from(OrderEvent)
                .where(OrderEvent.order_id == orders[0].id)
            )
            == 1
        )


def test_concurrent_completion_and_reviews_remain_unique(client):
    seller, buyer = account(client), account(client)
    item, _, order = pending_order(client, seller, buyer)
    oid = order["id"]
    body = {
        "campusLocation": "Library",
        "scheduledDate": (utcnow() + timedelta(days=2)).date().isoformat(),
        "timeSlotStart": "13:00",
        "timeSlotEnd": "14:00",
    }
    response = client.post(f"/orders/{oid}/meetup", headers=key_headers(buyer), json=body)
    assert response.status_code == 200, response.text
    meeting = response.json()["data"]
    confirm = {"meetupId": meeting["id"], "version": meeting["version"]}
    for actor in (buyer, seller):
        assert (
            client.post(
                f"/orders/{oid}/meetup/confirm", headers=key_headers(actor), json=confirm
            ).status_code
            == 200
        )
    complete = {"meetupVersion": meeting["version"]}
    results = race(
        [
            lambda c, actor=actor: c.post(
                f"/orders/{oid}/confirm-complete", headers=key_headers(actor), json=complete
            )
            for actor in (buyer, seller)
        ]
    )
    assert all(r.status_code == 200 for r in results), [r.text for r in results]
    assert sorted(r.json()["data"]["completed"] for r in results) == [False, True]
    events = client.get(f"/orders/{oid}/events", headers=headers(buyer)).json()["data"]
    for actor in (buyer, seller):
        assert (
            client.post(
                f"/orders/{oid}/confirm-complete", headers=key_headers(actor), json=complete
            ).status_code
            == 200
        )
    assert client.get(f"/orders/{oid}/events", headers=headers(buyer)).json()["data"] == events
    review = {
        "orderId": oid,
        "overall": 5,
        "descriptionAccuracy": 5,
        "communication": 5,
        "punctuality": 5,
        "comment": "P5 test",
    }
    results = race(
        [lambda c: c.post("/reviews", headers=key_headers(buyer), json=review) for _ in range(2)]
    )
    assert sorted(r.status_code for r in results) == [201, 409], [r.text for r in results]
    with SessionLocal() as db:
        assert db.get(Product, item["id"]).status == "SOLD"
        assert db.get(Order, oid).status == "COMPLETED"
        assert (
            db.scalar(select(func.count()).select_from(Review).where(Review.order_id == oid)) == 1
        )


def test_disconnected_reader_recovers_multiple_pages_without_duplicate_messages(client):
    seller, buyer, stranger = account(client), account(client), account(client)
    _, sid, _ = pending_order(client, seller, buyer)
    ids = []
    for n in range(5):
        body = {"clientMsgId": str(uuid.uuid4()), "kind": "TEXT", "content": f"offline message {n}"}
        response = client.post(f"/chat/sessions/{sid}/messages", headers=headers(buyer), json=body)
        assert response.status_code == 201
        ids.append(response.json()["data"]["id"])
        assert (
            client.post(f"/chat/sessions/{sid}/messages", headers=headers(buyer), json=body).json()
            == response.json()
        )
    recovered, cursor = [], 0
    for _ in range(4):
        response = client.get(
            f"/chat/sessions/{sid}/messages",
            headers=headers(seller),
            params={"afterId": cursor, "limit": 2},
        )
        assert response.status_code == 200
        batch = response.json()["data"]
        if not batch:
            break
        recovered.extend(m["id"] for m in batch)
        cursor = batch[-1]["id"]
    assert recovered == ids
    assert (
        client.get(
            f"/chat/sessions/{sid}/messages", headers=headers(stranger), params={"afterId": 0}
        ).status_code
        == 403
    )
    for params in ({"beforeId": 0}, {"afterId": -1}, {"afterId": 0, "beforeId": ids[-1]}):
        assert (
            client.get(
                f"/chat/sessions/{sid}/messages", headers=headers(seller), params=params
            ).status_code
            == 422
        )
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == sid)
            )
            == 5
        )
