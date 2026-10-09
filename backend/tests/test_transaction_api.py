import io
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.main import app
from app.models import ChatMessage, Offer, Order, OrderEvent, Product, Review
from tests.conftest import requires_postgres
from tests.test_auth import account, headers

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "p3-integration-test-only-" + "x" * 40)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def key_headers(actor, key=None):
    return {**headers(actor), "Idempotency-Key": key or str(uuid.uuid4())}


def image_url(client, actor, purpose="product"):
    image = io.BytesIO()
    Image.new("RGB", (4, 4), "blue").save(image, format="PNG")
    response = client.post(
        "/uploads/images",
        params={"purpose": purpose},
        headers=headers(actor),
        files={"file": ("image.png", image.getvalue(), "image/png")},
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]["url"]


def product(client, seller):
    body = {
        "title": "MVP test book",
        "category": "BOOKS",
        "condition": "GOOD",
        "price": 50,
        "campusLocation": "Library",
        "description": "Test book",
        "images": [image_url(client, seller)],
    }
    h = key_headers(seller)
    response = client.post("/products", headers=h, json=body)
    assert response.status_code == 201, response.text
    assert client.post("/products", headers=h, json=body).json() == response.json()
    assert client.post("/products", headers=h, json={**body, "price": 51}).status_code == 409
    return response.json()["data"]


def pending_order(client, seller, buyer):
    item = product(client, seller)
    context = client.post("/chat/sessions", headers=headers(buyer), json={"productId": item["id"]})
    assert context.status_code == 200, context.text
    sid = context.json()["data"]["id"]
    response = client.post(
        f"/chat/sessions/{sid}/offers", headers=key_headers(buyer), json={"amount": 45}
    )
    assert response.status_code == 201, response.text
    offer = response.json()["data"]
    accept_h = key_headers(seller)
    accepted = client.post(f'/offers/{offer["id"]}/accept', headers=accept_h)
    assert accepted.status_code == 200, accepted.text
    assert client.post(f'/offers/{offer["id"]}/accept', headers=accept_h).json() == accepted.json()
    assert (
        client.post(f'/offers/{offer["id"]}/accept', headers=key_headers(seller)).status_code == 409
    )
    return item, sid, accepted.json()["data"]["order"]


def test_two_account_durable_journey_and_permissions(client):
    seller, buyer, stranger = account(client), account(client), account(client)
    item, sid, order = pending_order(client, seller, buyer)
    oid = order["id"]
    assert client.get(f'/products/{item["id"]}').json()["data"]["status"] == "RESERVED"
    assert client.get(f"/orders/{oid}", headers=headers(stranger)).status_code == 403
    assert (
        client.get(f"/chat/sessions/{sid}/messages", headers=headers(stranger)).status_code == 403
    )
    assert client.get("/orders", headers=headers(stranger)).json()["data"]["items"] == []
    msg = {"clientMsgId": str(uuid.uuid4()), "kind": "TEXT", "content": "Persisted hello"}
    sent = client.post(f"/chat/sessions/{sid}/messages", headers=headers(buyer), json=msg)
    assert sent.status_code == 201
    assert (
        client.post(f"/chat/sessions/{sid}/messages", headers=headers(buyer), json=msg).json()
        == sent.json()
    )
    mid = sent.json()["data"]["id"]
    assert (
        len(
            client.get(
                f"/chat/sessions/{sid}/messages",
                params={"afterId": mid - 1},
                headers=headers(seller),
            ).json()["data"]
        )
        == 1
    )
    review = {
        "orderId": oid,
        "overall": 5,
        "descriptionAccuracy": 5,
        "communication": 4,
        "punctuality": 5,
        "comment": "Good",
    }
    assert client.post("/reviews", headers=key_headers(buyer), json=review).status_code == 409
    meeting = {
        "campusLocation": "Library",
        "scheduledDate": (datetime.now(UTC) + timedelta(days=1)).date().isoformat(),
        "timeSlotStart": "13:00:00",
        "timeSlotEnd": "14:00:00",
        "note": "Bring book",
    }
    m = client.post(f"/orders/{oid}/meetup", headers=key_headers(buyer), json=meeting)
    assert m.status_code == 200, m.text
    m = m.json()["data"]
    confirm = {"meetupId": m["id"], "version": m["version"]}
    assert (
        client.post(
            f"/orders/{oid}/meetup/confirm", headers=key_headers(buyer), json=confirm
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/orders/{oid}/confirm-complete",
            headers=key_headers(buyer),
            json={"meetupVersion": m["version"]},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/orders/{oid}/meetup/confirm", headers=key_headers(seller), json=confirm
        ).status_code
        == 200
    )
    first = client.post(
        f"/orders/{oid}/confirm-complete",
        headers=key_headers(buyer),
        json={"meetupVersion": m["version"]},
    )
    assert first.status_code == 200 and not first.json()["data"]["completed"]
    last = client.post(
        f"/orders/{oid}/confirm-complete",
        headers=key_headers(seller),
        json={"meetupVersion": m["version"]},
    )
    assert last.status_code == 200 and last.json()["data"]["completed"]
    assert client.post("/reviews", headers=key_headers(stranger), json=review).status_code == 403
    assert client.post("/reviews", headers=key_headers(buyer), json=review).status_code == 201
    assert client.post("/reviews", headers=key_headers(buyer), json=review).status_code == 409
    events = client.get(f"/orders/{oid}/events", headers=headers(buyer)).json()["data"]
    assert events[-1]["toStatus"] == "COMPLETED"
    count = len(events)
    assert (
        client.post(
            f"/orders/{oid}/confirm-complete",
            headers=key_headers(seller),
            json={"meetupVersion": m["version"]},
        ).status_code
        == 200
    )
    assert len(client.get(f"/orders/{oid}/events", headers=headers(buyer)).json()["data"]) == count
    with SessionLocal() as db:
        assert db.get(Order, oid).status == "COMPLETED"
        assert db.get(Product, item["id"]).status == "SOLD"
        assert (
            db.scalar(select(func.count()).select_from(Review).where(Review.order_id == oid)) == 1
        )
        assert (
            db.scalar(
                select(func.count())
                .select_from(ChatMessage)
                .where(ChatMessage.client_msg_id == msg["clientMsgId"])
            )
            == 1
        )


def test_meetup_revision_clears_confirmations_and_cancel_eligibility(client):
    seller, buyer = account(client), account(client)
    _, _, entity = pending_order(client, seller, buyer)
    oid = entity["id"]
    body = {
        "campusLocation": "Gate",
        "scheduledDate": "2026-10-12",
        "timeSlotStart": "12:00",
        "timeSlotEnd": "13:00",
    }
    m = client.post(f"/orders/{oid}/meetup", headers=key_headers(buyer), json=body).json()["data"]
    for actor in (buyer, seller):
        assert (
            client.post(
                f"/orders/{oid}/meetup/confirm",
                headers=key_headers(actor),
                json={"meetupId": m["id"], "version": m["version"]},
            ).status_code
            == 200
        )
    assert (
        client.post(
            f"/orders/{oid}/confirm-complete",
            headers=key_headers(buyer),
            json={"meetupVersion": m["version"]},
        ).status_code
        == 200
    )
    new_m = client.post(
        f"/orders/{oid}/meetup",
        headers=key_headers(seller),
        json={**body, "campusLocation": "Library"},
    ).json()["data"]
    assert new_m["version"] == m["version"] + 1
    assert not new_m["buyerConfirmed"] and not new_m["sellerConfirmed"]
    assert (
        client.post(
            f"/orders/{oid}/meetup/confirm",
            headers=key_headers(buyer),
            json={"meetupId": m["id"], "version": m["version"]},
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/orders/{oid}/cancel", headers=headers(buyer), json={"reason": "Cannot attend"}
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/orders/{oid}/confirm-complete",
            headers=key_headers(seller),
            json={"meetupVersion": new_m["version"]},
        ).status_code
        == 409
    )


def test_concurrent_accept_creates_one_order(client):
    seller, buyer = account(client), account(client)
    item = product(client, seller)
    sid = client.post(
        "/chat/sessions", headers=headers(buyer), json={"productId": item["id"]}
    ).json()["data"]["id"]
    quote = client.post(
        f"/chat/sessions/{sid}/offers", headers=key_headers(buyer), json={"amount": 40}
    ).json()["data"]

    def accept(_):
        with TestClient(app) as other:
            return other.post(f'/offers/{quote["id"]}/accept', headers=key_headers(seller))

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(accept, range(2)))
    assert sorted(result.status_code for result in results) == [200, 409]
    with SessionLocal() as db:
        assert (
            db.scalar(select(func.count()).select_from(Order).where(Order.product_id == item["id"]))
            == 1
        )
        order = db.scalar(select(Order).where(Order.product_id == item["id"]))
        assert (
            db.scalar(
                select(func.count()).select_from(OrderEvent).where(OrderEvent.order_id == order.id)
            )
            == 1
        )


def test_accept_failure_rolls_back_product_offer_order_event(client, monkeypatch):
    from app.api.routes import transactions
    from app.core.errors import BusinessError

    seller, buyer = account(client), account(client)
    item = product(client, seller)
    sid = client.post(
        "/chat/sessions", headers=headers(buyer), json={"productId": item["id"]}
    ).json()["data"]["id"]
    quote = client.post(
        f"/chat/sessions/{sid}/offers", headers=key_headers(buyer), json={"amount": 40}
    ).json()["data"]

    def failure(*_):
        raise BusinessError(503, "TEST_TRANSACTION_FAILURE", "Injected transaction failure.")

    with monkeypatch.context() as fault:
        fault.setattr(transactions, "notify", failure)
        assert (
            client.post(f'/offers/{quote["id"]}/accept', headers=key_headers(seller)).status_code
            == 503
        )
    with SessionLocal() as db:
        assert db.get(Product, item["id"]).status == "ON_SALE"
        assert db.get(Offer, quote["id"]).status == "PENDING"
        assert (
            db.scalar(select(func.count()).select_from(Order).where(Order.offer_id == quote["id"]))
            == 0
        )
    assert (
        client.post(f'/offers/{quote["id"]}/accept', headers=key_headers(seller)).status_code == 200
    )


def test_report_private_upload_favorites_and_wanted(client):
    seller, buyer = account(client), account(client)
    item = product(client, seller)
    assert client.get("/products", params={"query": "MVP test book"}).status_code == 200
    assert client.put(f'/favorites/{item["id"]}', headers=headers(buyer)).status_code == 204
    assert client.put(f'/favorites/{item["id"]}', headers=headers(buyer)).status_code == 204
    evidence = image_url(client, buyer, "evidence")
    report = client.post(
        "/reports",
        headers=key_headers(buyer),
        json={
            "targetType": "PRODUCT",
            "targetId": item["id"],
            "reason": "VIOLATION",
            "evidence": [evidence],
        },
    )
    assert report.status_code == 201, report.text
    assert "evidence" not in report.json()["data"]
    assert client.get("/reports/mine", headers=headers(seller)).json()["data"] == []
    assert (
        client.post(
            "/reports",
            headers=key_headers(seller),
            json={
                "targetType": "PRODUCT",
                "targetId": item["id"],
                "reason": "VIOLATION",
                "evidence": [evidence],
            },
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/uploads/images",
            headers=headers(seller),
            files={"file": ("fake.png", b"not an image", "image/png")},
        ).status_code
        == 415
    )
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "Book",
            "budgetMin": 10,
            "budgetMax": 60,
            "condition": "ANY",
            "location": "ANY",
            "expireAt": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
        },
    )
    assert wanted.status_code == 201, wanted.text
    wid = wanted.json()["data"]["id"]
    assert client.get(f"/wanted/{wid}").status_code == 200
    assert client.delete(f"/wanted/{wid}", headers=headers(seller)).status_code == 403
    assert client.delete(f"/wanted/{wid}", headers=headers(buyer)).status_code == 204


def test_redis_failure_blocks_new_auth_not_existing_business(client, monkeypatch):
    seller = account(client)
    item = product(client, seller)
    with monkeypatch.context() as fault:
        fault.setenv("REDIS_URL", "redis://127.0.0.1:1/14")
        get_settings.cache_clear()
        response = client.post(
            "/auth/login", json={"email": seller["user"]["email"], "password": "Valid@12345"}
        )
        assert response.status_code == 503
        assert response.json()["code"] == "AUTH_SERVICE_UNAVAILABLE"
        assert client.get("/products").status_code == 200
        assert client.put(f'/favorites/{item["id"]}', headers=headers(seller)).status_code == 204
    get_settings.cache_clear()
