from datetime import timedelta

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
