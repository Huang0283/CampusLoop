"""M6 domain/RPC fault tests; PostgreSQL scenarios live in test_matching_jobs."""

import copy
import json
import threading
import time
from datetime import timedelta
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy.orm import Session, make_transient_to_detached

from app.core.config import get_settings
from app.core.errors import BusinessError
from app.core.security import utcnow
from app.models import MatchingJob, Product, WantedPost
from app.services.ai_adapters import price_payload, rank_payload, valid_rank
from app.services.matching_jobs import business_event_key, process_claim, remember_changes

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def rpc_settings(monkeypatch):
    monkeypatch.setenv("BASELINE_SERVICES_ENABLED", "true")
    monkeypatch.setenv("BASELINE_RPC_TOKEN", "m6-test-only-" + "x" * 40)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def payload():
    def read(name):
        return (ROOT / "data/m7-phase2" / name).read_text(encoding="utf-8")

    product = json.loads(read("derived/products.jsonl").splitlines()[0])
    product.update(title="计算器", description="", priceFen=18000)
    product["attributes"]["model"] = None
    request = next(
        json.loads(line)
        for line in read("derived/requests.jsonl").splitlines()
        if json.loads(line)["requestId"] == "calculator-search-exact"
    )
    request["queryText"] = "计算器"
    request["context"]["asOf"] = utcnow().isoformat()
    return {
        "schemaVersion": "m7-baseline-rpc-v1",
        "products": [product],
        "request": request,
        "dictionary": json.loads(read("raw/dictionary.json")),
        "options": {"mode": "keyword", "sort": "relevance"},
    }


def price_input():
    return {
        "category": "books",
        "condition": "good",
        "originalPriceFen": 10000,
        "purchaseAgeMonths": None,
        "accessoryState": "unknown",
        "defectTags": [],
    }


@pytest.mark.parametrize("fault", [TimeoutError, ConnectionError, ValueError])
def test_rank_failure_keeps_filtered_keyword_baseline(payload, monkeypatch, fault):
    from services.m7_baseline import client

    def fail(*args, **kwargs):
        assert kwargs["timeout"] == 1.5
        raise fault("private provider message")

    monkeypatch.setattr(client, "call_baseline", fail)
    hidden = copy.deepcopy(payload["products"][0])
    hidden.update(productId="999", status="HIDDEN")
    payload["products"].append(hidden)
    result = rank_payload(payload)
    assert [item["productId"] for item in result["items"]] == ["101"]
    assert result["metadata"]["degraded"]
    assert "private" not in str(result)


@pytest.mark.parametrize("bad", [None, [], {}, {"items": [], "metadata": {}}])
def test_malformed_rank_response_falls_back(payload, monkeypatch, bad):
    from services.m7_baseline import client

    monkeypatch.setattr(client, "call_baseline", lambda *a, **k: bad)
    result = rank_payload(payload)
    assert result["items"][0]["productId"] == "101"
    assert result["metadata"]["fallbackReason"] == "INVALID_SERVICE_RESPONSE"


@pytest.mark.parametrize("mutation", ["duplicate", "unknown", "old_version", "nan", "explanation"])
def test_rank_result_contract_rejects_unsafe_values(payload, mutation):
    from services.m7_baseline.engine import rank

    baseline = rank(payload["products"], payload["request"], payload["dictionary"])
    result = copy.deepcopy(baseline)
    item = result["items"][0]
    if mutation == "duplicate":
        result["items"].append(copy.deepcopy(item))
    elif mutation == "unknown":
        item["productId"] = "999"
    elif mutation == "old_version":
        item["productVersion"] += 1
    elif mutation == "nan":
        item["relevanceScore"] = float("nan")
    else:
        item["reasons"] = ["unapproved model content"]
    assert valid_rank(baseline, baseline)
    assert not valid_rank(result, baseline)


@pytest.mark.parametrize("fault", [TimeoutError, ConnectionError, ValueError])
def test_price_transport_failure_is_explicit_unavailable(monkeypatch, fault):
    from services.m8_baseline import client

    def fail(*args, **kwargs):
        assert kwargs["timeout"] == 1.5
        raise fault("private provider error")

    monkeypatch.setattr(client, "call", fail)
    result = price_payload(price_input())
    assert result["status"] == "UNAVAILABLE" and result["degraded"]
    assert result["intervalFen"] == {"lower": None, "upper": None}
    assert "private" not in str(result)


@pytest.mark.parametrize(
    "bad",
    [
        None,
        {},
        {"status": "UNAVAILABLE", "intervalFen": {}},
        {
            "status": "LOW_CONFIDENCE",
            "algorithmVersion": "m8-price-rule-v1",
            "intervalFen": {"lower": 200, "upper": 100},
        },
        {"status": "UNAVAILABLE", "intervalFen": {"lower": None, "upper": None}, "factors": [0]},
    ],
)
def test_malformed_price_never_reaches_business_projection(monkeypatch, bad):
    from services.m8_baseline import client

    monkeypatch.setattr(client, "call", lambda *a, **k: bad)
    assert price_payload(price_input())["degradationReason"] == "INVALID_SERVICE_RESPONSE"


@pytest.mark.parametrize(
    ("field", "bad"),
    [
        ("sampleSize", -1),
        ("sampleSize", True),
        ("sampleSize", float("nan")),
        ("disclaimer", {"private": "provider detail"}),
        ("algorithmVersion", 123),
        ("degradationReason", None),
        ("degraded", False),
    ],
)
def test_price_response_metadata_must_match_business_contract(monkeypatch, field, bad):
    from services.m8_baseline import client
    from services.m8_baseline.engine import price_advice

    response = price_advice(price_input())
    response[field] = bad
    monkeypatch.setattr(client, "call", lambda *a, **k: response)
    result = price_payload(price_input())
    assert result["status"] == "UNAVAILABLE"
    assert result["degradationReason"] == "INVALID_SERVICE_RESPONSE"


@pytest.mark.parametrize("version", ["unapproved-price-model", None, 123])
def test_unavailable_price_rejects_unknown_algorithm(monkeypatch, version):
    from services.m8_baseline import client

    response = client.fallback("price", "SERVICE_UNAVAILABLE")
    response["algorithmVersion"] = version
    monkeypatch.setattr(client, "call", lambda *a, **k: response)
    assert price_payload(price_input())["degradationReason"] == "INVALID_SERVICE_RESPONSE"


def test_price_rejects_interval_that_would_overflow_business_projection(monkeypatch):
    from services.m8_baseline import client
    from services.m8_baseline.engine import price_advice

    response = price_advice(price_input())
    response["intervalFen"]["upper"] = 10**400
    monkeypatch.setattr(client, "call", lambda *a, **k: response)
    assert price_payload(price_input())["degradationReason"] == "INVALID_SERVICE_RESPONSE"


def test_disabled_service_still_rejects_bad_business_input(payload, monkeypatch):
    monkeypatch.setenv("BASELINE_SERVICES_ENABLED", "false")
    get_settings.cache_clear()
    payload["request"]["filters"].update(minPriceFen=20000, maxPriceFen=10000)
    with pytest.raises(BusinessError) as caught:
        rank_payload(payload)
    assert caught.value.status == 422
    invalid = price_input()
    invalid["condition"] = "made-up"
    with pytest.raises(BusinessError) as caught:
        price_payload(invalid)
    assert caught.value.status == 422


def test_nonretryable_remote_rejection_is_not_hidden(payload, monkeypatch):
    from services.m7_baseline import client
    from services.m7_baseline.engine import ServiceError

    def reject(*args, **kwargs):
        raise ServiceError(403, "FORBIDDEN")

    monkeypatch.setattr(client, "call_baseline", reject)
    with pytest.raises(BusinessError) as caught:
        rank_payload(payload)
    assert caught.value.status == 403


def test_real_http_invalid_json_has_safe_business_fallback(payload, monkeypatch):
    class InvalidJSON(BaseHTTPRequestHandler):
        def do_POST(self):
            self.rfile.read(int(self.headers["Content-Length"]))
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"not json")

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), InvalidJSON)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for name in ("M7_SERVICE_URL", "M8_SERVICE_URL"):
            monkeypatch.setenv(name, f"http://127.0.0.1:{server.server_port}")
        get_settings.cache_clear()
        assert rank_payload(payload)["metadata"]["fallbackReason"] == "INVALID_SERVICE_RESPONSE"
        assert price_payload(price_input())["status"] == "UNAVAILABLE"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(3)


def test_real_http_timeout_is_bounded_and_keeps_baseline(payload, monkeypatch):
    release = threading.Event()

    class SlowProvider(BaseHTTPRequestHandler):
        def do_POST(self):
            self.rfile.read(int(self.headers["Content-Length"]))
            release.wait(5)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), SlowProvider)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        monkeypatch.setenv("M7_SERVICE_URL", f"http://127.0.0.1:{server.server_port}")
        monkeypatch.setenv("M8_SERVICE_URL", f"http://127.0.0.1:{server.server_port}")
        get_settings.cache_clear()
        start = time.monotonic()
        result = rank_payload(payload)
        assert time.monotonic() - start < 3
        assert result["metadata"]["fallbackReason"] == "SERVICE_TIMEOUT"
        assert result["items"][0]["productId"] == "101"
        start = time.monotonic()
        result = price_payload(price_input())
        assert time.monotonic() - start < 3
        assert result["status"] == "UNAVAILABLE" and result["degraded"]
    finally:
        release.set()
        server.shutdown()
        server.server_close()
        thread.join(3)


def test_business_version_is_stable_and_ignores_view_counters():
    now = utcnow()
    product = Product(id=1, owner_id=1, title="book", price=50, created_at=now, updated_at=now)
    first = business_event_key(product)
    product.price = Decimal("50.00")
    assert business_event_key(product) == first
    product.view_count = 5
    product.favorite_count = 3
    assert business_event_key(product) == first
    product.price = 51
    assert business_event_key(product) != first
    product.price = 50
    product.updated_at = now + timedelta(seconds=1)
    assert business_event_key(product) != first


def test_counter_only_update_does_not_trigger_ai_work():
    product = Product(id=1, owner_id=1, title="book", price=50, view_count=0)
    make_transient_to_detached(product)
    with Session() as db:
        db.add(product)
        product.view_count = 1
        remember_changes(db)
        assert not db.info["matching_changes"]
        product.price = 51
        remember_changes(db)
        assert product in db.info["matching_changes"]


def test_repeated_stale_snapshot_stops_after_five_attempts(monkeypatch):
    from app.services import intelligence

    wanted = WantedPost(
        id=1, owner_id=1, title="book", status="OPEN", expires_at=utcnow() + timedelta(days=1)
    )
    job = MatchingJob(wanted_id=1, status="PENDING", attempts=0)
    monkeypatch.setattr(intelligence, "rank_live", lambda *a, **k: ({}, {}, "unused"))
    for attempt in range(1, 6):
        values = iter([1, 1, SimpleNamespace(status="ACTIVE"), wanted, 2])
        db = SimpleNamespace(scalar=lambda *a, values=values: next(values), commit=lambda: None)
        assert process_claim(db, job)
        assert job.attempts == attempt and job.last_error == "STALE_INPUT"
        assert job.status == ("FAILED" if attempt == 5 else "PENDING")
