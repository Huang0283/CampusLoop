"""M6 BP5-03/04 local boundary tests; real transactions live in test_p5_integration."""

import copy
from types import SimpleNamespace

import pytest
from starlette.websockets import WebSocketDisconnect

from app.api.routes import realtime, transactions
from app.core.errors import BusinessError
from app.services.ai_adapters import valid_price, valid_rank
from app.services.business import idempotent


class MemoryLedger:
    """Only exercises domain replay decisions, never claims PostgreSQL concurrency."""

    def __init__(self):
        self.record = None
        self.commits = 0

    def scalar(self, _):
        return self.record

    def add(self, record):
        self.record = record

    def commit(self):
        self.commits += 1


@pytest.mark.parametrize("key", [None, "", " \t", "x" * 65])
def test_invalid_idempotency_keys_cannot_execute_action(key):
    def must_not_run():
        pytest.fail("Invalid key executed a write")

    db = MemoryLedger()
    with pytest.raises(BusinessError) as caught:
        idempotent(db, SimpleNamespace(id=1, role="USER"), "test", key, {}, must_not_run)
    assert caught.value.status == 422
    assert db.record is None and db.commits == 0


def test_replay_returns_original_and_changed_body_never_runs_action():
    db, actor = MemoryLedger(), SimpleNamespace(id=1, role="USER")
    calls = []

    def action():
        calls.append(True)
        return {"id": 123}

    first = idempotent(db, actor, "offer:1", "repeat-key", {"amount": 10}, action)
    assert idempotent(db, actor, "offer:1", "repeat-key", {"amount": 10}, action) == first
    with pytest.raises(BusinessError) as caught:
        idempotent(db, actor, "offer:1", "repeat-key", {"amount": 11}, action)
    assert caught.value.code == "IDEMPOTENCY_CONFLICT"
    assert len(calls) == db.commits == 1


@pytest.mark.parametrize("after,before", [(-1, None), (None, 0), (None, -1), (0, 1)])
def test_history_rejects_invalid_or_ambiguous_cursor_before_query(after, before):
    with pytest.raises(BusinessError) as caught:
        transactions.list_messages(1, None, None, afterId=after, beforeId=before)
    assert caught.value.status == 422


@pytest.mark.parametrize(
    "path,origin", [("/ws?token=private", None), ("/ws", "https://evil.invalid")]
)
def test_websocket_rejects_url_credentials_and_untrusted_origin(client, path, origin):
    with pytest.raises(WebSocketDisconnect) as caught:
        with client.websocket_connect(path, headers={"Origin": origin} if origin else {}):
            pass
    assert caught.value.code == 4403


def test_websocket_invalid_frames_recover_and_revocation_closes(client, monkeypatch):
    revoked = False

    def authenticate(token):
        if revoked:
            raise BusinessError(401, "AUTH_UNAUTHORIZED", "Revoked")
        assert token == "unit-test-token"
        return 1, 0

    monkeypatch.setattr(realtime, "authenticate_connection", authenticate)
    monkeypatch.setattr(realtime, "next_messages", lambda *args: [])
    with client.websocket_connect("/ws") as socket:
        socket.send_json({"type": "AUTH", "accessToken": "unit-test-token"})
        assert socket.receive_json()["type"] == "AUTH_OK"
        for invalid in ("not-json", "[]", "null"):
            socket.send_text(invalid)
            assert socket.receive_json()["payload"]["code"] == "VALIDATION_ERROR"
        socket.send_json({"type": "PING"})
        assert socket.receive_json()["type"] == "PONG"
        revoked = True
        socket.send_json({"type": "PING"})
        with pytest.raises(WebSocketDisconnect) as caught:
            socket.receive_json()
        assert caught.value.code == 4401


@pytest.mark.parametrize("body", [{}, [], {"type": "PING"}, {"type": "AUTH", "accessToken": 1}])
def test_websocket_requires_auth_first(client, body):
    with client.websocket_connect("/ws") as socket:
        socket.send_json(body)
        with pytest.raises(WebSocketDisconnect) as caught:
            socket.receive_json()
        assert caught.value.code == 4401


@pytest.mark.parametrize(
    "field,value",
    [
        ("sampleSize", -1),
        ("sampleSize", True),
        ("sampleSize", "2"),
        ("disclaimer", {}),
        ("algorithmVersion", None),
    ],
)
def test_price_projection_rejects_malformed_optional_fields(field, value):
    from services.m8_baseline.engine import price_advice

    good = price_advice(
        {
            "category": "books",
            "condition": "good",
            "originalPriceFen": 10000,
            "purchaseAgeMonths": None,
            "accessoryState": "unknown",
            "defectTags": [],
        }
    )
    assert valid_price(good)
    assert not valid_price({**good, field: value})


def test_missing_score_is_not_accepted_as_nullable_score():
    baseline = {
        "metadata": {
            key: "frozen"
            for key in (
                "schemaVersion",
                "algorithmVersion",
                "dictionaryVersion",
                "dictionaryHash",
                "mode",
            )
        },
        "items": [
            {
                "productId": "1",
                "productVersion": 1,
                "relevanceScore": None,
                "reasons": [],
                "explanationDetails": [],
            }
        ],
    }
    baseline["metadata"].update(degraded=False, fallbackReason=None)
    assert valid_rank(baseline, baseline)
    bad = copy.deepcopy(baseline)
    del bad["items"][0]["relevanceScore"]
    assert not valid_rank(bad, baseline)
