"""/health 与 /ready 接口测试（BP2-06 验收证据）。

验收口径（Issue BP-P2 小组验收标准第 1 条）：
非作者从空数据库启动服务也能得到健康响应——即依赖不可用时
必须 200 + status=degraded + dependencies 明细，而不是 5xx。
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_envelope_shape(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) >= {"code", "message", "data"}
    assert body["code"] == 0
    data = body["data"]
    assert data["status"] in {"ok", "degraded"}
    assert set(data["dependencies"]) >= {"database", "redis"}
    for value in data["dependencies"].values():
        assert value in {"ok", "unavailable"}


def test_health_reports_degraded_when_dependencies_down(client: TestClient) -> None:
    """本机无 Postgres/Redis（或连不上）时：200 + degraded + 明细。"""
    from app.api.routes import system

    original = system.collect_dependency_status
    system.collect_dependency_status = lambda: {"database": "unavailable", "redis": "unavailable"}
    try:
        resp = client.get("/health")
    finally:
        system.collect_dependency_status = original

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "degraded"
    assert data["dependencies"]["database"] == "unavailable"
    assert data["dependencies"]["redis"] == "unavailable"


def test_health_ok_when_dependencies_up(client: TestClient) -> None:
    from app.api.routes import system

    original = system.collect_dependency_status
    system.collect_dependency_status = lambda: {"database": "ok", "redis": "ok"}
    try:
        resp = client.get("/health")
    finally:
        system.collect_dependency_status = original

    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "ok"


def test_ready_returns_503_when_degraded(client: TestClient) -> None:
    from app.api.routes import system

    original = system.collect_dependency_status
    system.collect_dependency_status = lambda: {"database": "ok", "redis": "unavailable"}
    try:
        resp = client.get("/ready")
    finally:
        system.collect_dependency_status = original

    assert resp.status_code == 503
    assert resp.json()["data"]["status"] == "degraded"


def test_request_id_roundtrip(client: TestClient) -> None:
    resp = client.get("/health", headers={"X-Request-ID": "rid-demo-001"})
    assert resp.headers["X-Request-ID"] == "rid-demo-001"
