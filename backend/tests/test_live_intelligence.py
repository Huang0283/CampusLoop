from datetime import timedelta
from uuid import uuid4

import pytest

from app.core.config import get_settings
from app.core.security import utcnow
from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_transaction_api import key_headers, product

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    import tempfile
    import threading
    from pathlib import Path

    from services.m7_baseline.http_service import create_server as m7_server
    from services.m7_baseline.store import BaselineStore
    from services.m8_baseline.http_service import create_server as m8_server

    monkeypatch.setenv("AUTH_SIGNING_KEY", "p3-intelligence-test-" + "x" * 40)
    token = "private-rpc-test-" + "y" * 40
    with tempfile.TemporaryDirectory() as folder:
        servers = [
            m7_server(("127.0.0.1", 0), BaselineStore(Path(folder) / "test.sqlite"), token),
            m8_server(("127.0.0.1", 0), token),
        ]
        monkeypatch.setenv("BASELINE_RPC_TOKEN", token)
        monkeypatch.setenv("BASELINE_SERVICES_ENABLED", "true")
        for name, server in zip(("M7_SERVICE_URL", "M8_SERVICE_URL"), servers, strict=True):
            monkeypatch.setenv(name, f"http://127.0.0.1:{server.server_address[1]}")
            threading.Thread(target=server.serve_forever, daemon=True).start()
        get_settings.cache_clear()
        yield
        for server in servers:
            server.shutdown()
            server.server_close()
        get_settings.cache_clear()


def test_live_search_matches_price_and_service_degradation(client, monkeypatch):
    seller, buyer = account(client), account(client)
    item = product(client, seller)
    response = client.get(
        "/search", params={"query": "MVP test book", "category": "BOOKS", "maxPrice": 50}
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert item["id"] in [entity["id"] for entity in data["items"]]
    assert all(entity["price"] <= 50 and entity["category"] == "BOOKS" for entity in data["items"])
    assert (
        client.get("/search", params={"query": "MVP", "minPrice": 60, "maxPrice": 50}).status_code
        == 422
    )
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "book",
            "budgetMin": 49,
            "budgetMax": 50,
            "condition": "GOOD",
            "location": "Library",
            "expireAt": (utcnow() + timedelta(days=7)).isoformat(),
        },
    ).json()["data"]
    path = f'/wanted/{wanted["id"]}/matches'
    matches = client.get(path, headers=headers(buyer))
    assert matches.status_code == 200, matches.text
    assert item["id"] in [entry["product"]["id"] for entry in matches.json()["data"]["items"]]
    assert client.get(path, headers=headers(seller)).status_code == 403
    price = client.post(
        "/price-advice",
        headers=headers(seller),
        json={"category": "BOOKS", "condition": "GOOD", "originalPrice": 100},
    )
    assert price.status_code == 200, price.text
    assert price.json()["data"]["lower"] <= price.json()["data"]["upper"]
    monkeypatch.setenv("BASELINE_SERVICES_ENABLED", "false")
    get_settings.cache_clear()
    disabled = client.get("/search", params={"query": "book"}).json()["data"]
    assert disabled["degraded"] and disabled["degradationReason"] == "SERVICE_DISABLED"
    unavailable = client.post(
        "/price-advice", headers=headers(seller), json={"category": "BOOKS", "condition": "GOOD"}
    ).json()["data"]
    assert unavailable["lower"] is None and unavailable["upper"] is None
    assert client.get("/products").status_code == 200


def test_trust_and_risk_use_current_facts_no_enforcement(client):
    from app.db.session import SessionLocal
    from app.models import User

    actor = account(client)
    uid = actor["user"]["id"]
    neutral = client.get(f"/users/{uid}/trust")
    assert neutral.status_code == 200, neutral.text
    assert neutral.json()["data"]["status"] == "NEW_USER_NEUTRAL"
    assert neutral.json()["data"]["score"] == 3.5
    assert client.get(f"/admin/users/{uid}/risk-clues", headers=headers(actor)).status_code == 403
    admin = account(client)
    with SessionLocal() as db:
        db.get(User, admin["user"]["id"]).role = "ADMIN"
        db.commit()
    result = client.get(f"/admin/users/{uid}/risk-clues", headers=headers(admin))
    assert result.status_code == 200, result.text
    clues = result.json()["data"]
    assert clues["missingInputs"] == ["failedPaymentCount24h", "sameDeviceAccountCount7d"]
    assert clues["enforcementExecuted"] is False
    assert clues["status"] == "INSUFFICIENT_DATA"
    assert client.get("/users/me", headers=headers(actor)).json()["data"]["status"] == "ACTIVE"


def test_timeout_does_not_rollback_publish_and_filters_expired_wanted(client, monkeypatch):
    from services.m7_baseline import client as m7_client
    from services.m8_baseline import client as m8_client

    from app.db.session import SessionLocal
    from app.models import WantedPost

    def timeout(*args, **kwargs):
        raise TimeoutError("injected provider timeout")

    monkeypatch.setattr(m7_client, "call_baseline", timeout)
    monkeypatch.setattr(m8_client, "call", timeout)
    seller, buyer = account(client), account(client)
    item = product(client, seller)
    response = client.get("/search", params={"query": "MVP test book"})
    assert response.status_code == 200
    assert response.json()["data"]["degraded"]
    assert item["id"] in [row["id"] for row in response.json()["data"]["items"]]
    price = client.post(
        "/price-advice",
        headers=headers(seller),
        json={"category": "BOOKS", "condition": "GOOD", "originalPrice": 100},
    )
    assert price.status_code == 200 and price.json()["data"]["method"] == "unavailable"
    wanted = client.post(
        "/wanted",
        headers=key_headers(buyer),
        json={
            "title": "book",
            "budgetMin": 0,
            "budgetMax": 100,
            "condition": "ANY",
            "location": "ANY",
            "expireAt": (utcnow() + timedelta(days=1)).isoformat(),
        },
    )
    assert wanted.status_code == 201
    wid = wanted.json()["data"]["id"]
    assert client.get(f"/wanted/{wid}/matches", headers=headers(buyer)).status_code == 200
    with SessionLocal() as db:
        db.get(WantedPost, wid).expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert client.get(f"/wanted/{wid}/matches", headers=headers(buyer)).status_code == 409
    assert client.get(f'/products/{item["id"]}').status_code == 200


@pytest.mark.parametrize("parameter", ["minPrice", "maxPrice"])
@pytest.mark.parametrize("value", ["inf", "1e309", "1e308"])
def test_search_rejects_nonfinite_prices_without_server_error(client, parameter, value):
    response = client.get("/search", params={"query": "book", parameter: value})
    assert response.status_code == 422, response.text


def test_catalog_search_new_products_edits_relevance_filters_and_visibility(client):
    seller = account(client)
    marker = uuid4().hex
    # Publish through real upload/product APIs; assertions never depend on catalog fixture IDs.
    seed = product(client, seller)
    base = {
        "category": "DIGITAL", "condition": "GOOD", "price": 100,
        "campusLocation": "校内", "images": seed["images"], "description": "功能正常",
    }

    def publish(title, description):
        response = client.post(
            "/products", headers=key_headers(seller),
            json={**base, "title": f"{title} {marker}", "description": description},
        )
        assert response.status_code == 201, response.text
        return response.json()["data"]

    computer = publish("验收台式电脑", "功能正常")
    bag = publish("验收手提包", "购买后闲置，可装电脑")
    quilt = publish("验收被子", "购买后闲置")

    def search(query, **params):
        response = client.get(
            "/search", params={"query": f"{query} {marker}", "pageSize": 100, **params}
        )
        assert response.status_code == 200, response.text
        return response.json()["data"]

    ids = [row["id"] for row in search("购买电脑")["items"]]
    assert ids.index(computer["id"]) < ids.index(bag["id"])
    assert quilt["id"] not in ids
    assert [row["id"] for row in search("验收 电脑 台式")["items"]] == [computer["id"]]
    assert search("验收不存在的东西")["pagination"]["total"] == 0
    assert search("验收 电脑", maxPrice=50)["items"] == []
    assert search("验收 电脑", category="BEDDING")["items"] == []
    assert search("验收 电脑", condition="NEW")["items"] == []
    assert search("验收 电脑", page=2, pageSize=1)["items"][0]["id"] == bag["id"]
    assert search("验收 电脑", sort="newest")["items"][0]["id"] == bag["id"]
    changed = client.patch(
        f'/products/{bag["id"]}', headers=headers(seller),
        json={**base, "title": f"验收手提包 {marker}", "description": "可装平板"},
    )
    assert changed.status_code == 200, changed.text
    assert bag["id"] not in [row["id"] for row in search("验收 电脑")["items"]]
    assert bag["id"] in [row["id"] for row in search("验收 平板")["items"]]
    hidden = client.patch(
        f'/products/{computer["id"]}/status', headers=headers(seller), json={"status": "HIDDEN"}
    )
    assert hidden.status_code == 200, hidden.text
    assert search("验收 电脑")["items"] == []
