import io
import json
from types import SimpleNamespace

import pytest

from app.services import catalog_semantic as live


def product(identity, title, category="digital", price=10000):
    return {
        "productId": str(identity),
        "title": title,
        "description": "正常使用",
        "categoryId": category,
        "priceFen": price,
        "condition": "good",
        "status": "ON_SALE",
        "deleted": False,
        "visibility": "public",
        "campusId": "campus",
        "ownerId": "9",
        "placeIds": ["校内"],
        "attributes": {"model": None},
        "entityVersion": 1,
        "publishedAt": "2026-11-01T00:00:00+00:00",
    }


@pytest.fixture
def payload(monkeypatch):
    monkeypatch.setattr(
        live,
        "get_settings",
        lambda: SimpleNamespace(
            catalog_semantic_url="http://localhost:18789", baseline_rpc_token="test-token"
        ),
    )
    return {
        "products": [
            product(1, "台式电脑", price=20000),
            product(2, "游戏本"),
            product(3, "被子", "bedding"),
        ],
        "request": {
            "wanted": None,
            "context": {"viewerId": None, "campusId": None},
            "filters": {
                "categoryId": None,
                "minPriceFen": None,
                "maxPriceFen": None,
                "minCondition": None,
                "requiredPlaceIds": [],
                "requiredModel": None,
            },
        },
        "dictionary": {"conditionRank": {"good": 3}},
    }


def respond(monkeypatch, scores, inspect=None):
    def call(request, timeout):
        assert timeout == 3
        if inspect:
            inspect(json.loads(request.data))
        return io.BytesIO(json.dumps({"version": live.VERSION, "scores": scores}).encode())

    monkeypatch.setattr(live.urllib.request, "urlopen", call)


def keyword(*ids):
    return {
        "items": [{"productId": str(pid)} for pid in ids],
        "metadata": {"mode": "keyword", "degraded": False},
    }


def test_actual_semantic_mode_keeps_relevant_devices_and_rejects_unrelated_category(
    payload, monkeypatch
):
    respond(monkeypatch, {"1": 0.6, "2": 0.58, "3": 0.59})
    result = live.semantic_search(payload, keyword(1), "电脑", "semantic", "relevance")
    assert [p["productId"] for p in result["items"]] == ["1", "2"]
    assert result["metadata"]["mode"] == "semantic"
    assert result["metadata"]["degraded"] is False


def test_hard_filters_apply_before_rpc_and_price_sort_stays_authoritative(payload, monkeypatch):
    payload["request"]["filters"]["categoryId"] = "digital"

    def inspect(body):
        assert {d["id"] for d in body["documents"]} == {"1", "2"}
        assert body["query"] == "我想买上网课用的电脑"

    respond(monkeypatch, {"1": 0.6, "2": 0.58}, inspect)
    result = live.semantic_search(
        payload, keyword(1), "电脑", "hybrid", "price_asc", "我想买上网课用的电脑"
    )
    assert [p["productId"] for p in result["items"]] == ["2", "1"]


@pytest.mark.parametrize(
    "scores", [{"1": float("nan"), "2": 0.4, "3": 0.2}, {"1": 0.4, "2": 0.5, "999": 0.9}]
)
def test_corrupt_or_unknown_service_results_are_rejected(payload, monkeypatch, scores):
    respond(monkeypatch, scores)
    with pytest.raises(ValueError, match="INVALID_SERVICE_RESPONSE"):
        live.semantic_search(payload, keyword(1), "电脑", "semantic", "relevance")


def test_low_similarity_does_not_invent_matches(payload, monkeypatch):
    respond(monkeypatch, {"1": 0.2, "2": 0.25, "3": 0.3})
    assert (
        live.semantic_search(payload, keyword(), "外星飞船跃迁引擎", "semantic", "relevance")[
            "items"
        ]
        == []
    )


def test_edited_descriptions_are_sent_in_current_request(payload, monkeypatch):
    payload["products"][0]["description"] = "支持视频会议和课程软件"

    def inspect(body):
        assert body["documents"][0]["text"].endswith("支持视频会议和课程软件")

    respond(monkeypatch, {"1": 0.6, "2": 0.2, "3": 0.2}, inspect)
    assert (
        live.semantic_search(payload, keyword(), "课程软件", "semantic", "relevance")["items"][0][
            "productId"
        ]
        == "1"
    )


@pytest.mark.parametrize("mode", ["semantic", "hybrid"])
@pytest.mark.parametrize(
    ("query", "expected"),
    [("笔记本", {"1", "2", "3"}), ("笔记本电脑", {"1", "2"}), ("电脑", {"1", "2", "4"})],
)
def test_model_similarity_respects_ambiguous_and_explicit_device_names(
    payload, monkeypatch, query, expected, mode
):
    payload["products"] = [
        product(1, "MacBook Air"),
        product(2, "ROG 游戏本"),
        product(3, "手账笔记本", "stationery"),
        product(4, "台式电脑"),
        product(5, "笔记本电脑包"),
    ]

    def inspect(body):
        assert {p["id"] for p in body["documents"]} == {"1", "2", "3", "4", "5"}

    # Even a misleadingly high score for a desktop/bag cannot widen a laptop query.
    respond(monkeypatch, {str(pid): 0.9 for pid in range(1, 6)}, inspect)
    result = live.semantic_search(payload, keyword(*sorted(expected)), query, mode, "relevance")
    assert {p["productId"] for p in result["items"]} == expected
