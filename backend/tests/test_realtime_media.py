import uuid

import pytest
from starlette.websockets import WebSocketDisconnect

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import AuthAudit, User
from tests.conftest import requires_postgres
from tests.test_auth import account, headers
from tests.test_transaction_api import image_url, key_headers, product

pytestmark = [pytest.mark.integration, requires_postgres]


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setenv("AUTH_SIGNING_KEY", "p3-realtime-test-" + "x" * 40)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def context(client, seller, buyer):
    item = product(client, seller)
    return client.post(
        "/chat/sessions", headers=headers(buyer), json={"productId": item["id"]}
    ).json()["data"]["id"]


def test_websocket_auth_and_private_send(client):
    seller, buyer, outsider = account(client), account(client), account(client)
    sid = context(client, seller, buyer)
    for path, origin in (
        ("/ws?token=secret", "http://localhost:5173"),
        ("/ws", "https://evil.invalid"),
    ):
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(path, headers={"Origin": origin}):
                pass
    with client.websocket_connect("/ws") as bad:
        bad.send_json({"type": "AUTH", "accessToken": "invalid"})
        with pytest.raises(WebSocketDisconnect):
            bad.receive_json()
    with client.websocket_connect("/ws") as peer, client.websocket_connect("/ws") as sender:
        for socket, actor in ((peer, seller), (sender, buyer)):
            socket.send_json({"type": "AUTH", "accessToken": actor["accessToken"]})
            assert socket.receive_json()["type"] == "AUTH_OK"
        body = {
            "sessionId": sid,
            "clientMsgId": str(uuid.uuid4()),
            "kind": "TEXT",
            "content": "Persist before ACK",
        }
        sender.send_json({"type": "SEND_MESSAGE", "payload": body})
        ack = sender.receive_json()
        assert ack["type"] == "MESSAGE_ACK"
        live = peer.receive_json()
        assert live["type"] == "MESSAGE_CREATED"
        mid = ack["payload"]["messageId"]
        assert live["payload"]["message"]["id"] == mid
        history = client.get(
            f"/chat/sessions/{sid}/messages", headers=headers(seller), params={"afterId": 0}
        ).json()["data"]
        assert [item["id"] for item in history] == [mid]
        retry = client.post(
            f"/chat/sessions/{sid}/messages",
            headers=headers(buyer),
            json={key: value for key, value in body.items() if key != "sessionId"},
        )
        assert retry.json()["data"]["id"] == mid
    with client.websocket_connect("/ws") as stranger:
        stranger.send_json({"type": "AUTH", "accessToken": outsider["accessToken"]})
        assert stranger.receive_json()["type"] == "AUTH_OK"
        stranger.send_json(
            {"type": "SEND_MESSAGE", "payload": {**body, "clientMsgId": str(uuid.uuid4())}}
        )
        assert stranger.receive_json()["payload"]["code"] == "FORBIDDEN"
    with client.websocket_connect("/ws") as revoked:
        revoked.send_json({"type": "AUTH", "accessToken": buyer["accessToken"]})
        assert revoked.receive_json()["type"] == "AUTH_OK"
        assert client.post("/auth/logout", headers=headers(buyer)).status_code == 204
        revoked.send_json({"type": "PING"})
        with pytest.raises(WebSocketDisconnect):
            revoked.receive_json()


def test_private_chat_and_evidence_access_audited(client):
    seller, buyer, outsider = account(client), account(client), account(client)
    sid = context(client, seller, buyer)
    image = image_url(client, buyer, "chat")
    assert image.startswith("https://private.campusloop.invalid/")
    message = client.post(
        f"/chat/sessions/{sid}/messages",
        headers=headers(buyer),
        json={"clientMsgId": str(uuid.uuid4()), "kind": "IMAGE", "content": image},
    ).json()["data"]
    path = f'/chat/messages/{message["id"]}/image'
    for actor in (buyer, seller):
        response = client.get(path, headers=headers(actor))
        assert response.status_code == 200
        assert response.content.startswith(b"\xff\xd8")
        assert response.headers["cache-control"] == "no-store"
    assert client.get(path, headers=headers(outsider)).status_code == 404
    assert client.get(path).status_code == 401
    evidence = image_url(client, buyer, "evidence")
    report = client.post(
        "/reports",
        headers=key_headers(buyer),
        json={
            "targetType": "USER",
            "targetId": seller["user"]["id"],
            "reason": "VIOLATION",
            "evidence": [evidence],
        },
    ).json()["data"]
    evidence_path = f'/admin/reports/{report["id"]}/evidence/0'
    assert client.get(evidence_path, headers=headers(buyer)).status_code == 403
    # Test fixture only: no public API may promote a user.
    with SessionLocal() as db:
        db.get(User, outsider["user"]["id"]).role = "ADMIN"
        db.commit()
    assert client.get(evidence_path, headers=headers(outsider)).status_code == 200
    from sqlalchemy import select

    with SessionLocal() as db:
        audit = db.scalar(
            select(AuthAudit).where(
                AuthAudit.actor_id == outsider["user"]["id"],
                AuthAudit.event == "admin_report_evidence_read",
            )
        )
        assert audit.context == {"reportId": report["id"], "imageIndex": 0}
        assert audit.target_id is None
