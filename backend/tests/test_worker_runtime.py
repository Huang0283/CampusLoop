"""Worker 独立运行时单元测试（BP4-07/08，M9）。

范围：不依赖 PostgreSQL/Redis 的部分——
- /healthz 聚合与 HTTP 行为（标准库服务器，端口 0 随机）；
- RunObserver：内存计数/快照 + sqlite 内存库落地（观测表刻意无 PG 专有类型）；
- matching_jobs 观察者钩子的容错语义（坏钩子不影响主流程）；
- baseline_services 配置校验（拒绝非法绑定与弱 token）；
- 配置兼容默认值（phase-3 单进程语义不变）。

涉及真实队列语义（SKIP LOCKED、outbox、重试）的集成测试沿用
test_matching_jobs.py（CI 提供 PostgreSQL 容器时执行）。
"""

from __future__ import annotations

import json
import urllib.request

import pytest
from sqlalchemy import create_engine, select

from app.models import AiTaskRun, WorkerHeartbeat
from app.worker.health import TICK_FRESH_SECONDS, start_health_server
from app.worker.observer import RunObserver, default_worker_id

RUN_EVENT = {
    "taskType": "matching",
    "taskId": 7,
    "eventKey": "wanted_posts:7:2026-10-12:rev1",
    "wantedId": 7,
    "outcome": "DONE",
    "errorCode": None,
    "resultVersion": "abc123",
    "attempt": 1,
    "durationMs": 42,
    "startedAt": "2026-10-12T20:00:00+00:00",
    "finishedAt": "2026-10-12T20:00:00.042000+00:00",
}


@pytest.fixture()
def sqlite_session_factory(monkeypatch):
    """sqlite 内存库承载两张观测表；patch observer 的 SessionLocal。

    - StaticPool：`sqlite://` 每个连接是独立内存库，而 flusher 线程与
      断言方各自取连接——必须共享同一连接并放开同线程检查。
    - 手写 DDL：sqlite 对 BigInteger 主键不做自增（PG 的 BIGSERIAL 语义
      由迁移 0009 在真实数据库上由 CI 验证），测试载体用 INTEGER
      AUTOINCREMENT 等价承载。
    """
    from sqlalchemy import text
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE ai_task_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_type VARCHAR(64) NOT NULL,
                    task_id BIGINT, event_key VARCHAR(160), wanted_id BIGINT,
                    outcome VARCHAR(16) NOT NULL, error_code VARCHAR(64),
                    result_version VARCHAR(64), attempt INT NOT NULL,
                    duration_ms INT, worker_id VARCHAR(128) NOT NULL,
                    worker_version VARCHAR(64) NOT NULL,
                    started_at TIMESTAMP, finished_at TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE worker_heartbeats (
                    worker_id VARCHAR(128) PRIMARY KEY, version VARCHAR(64) NOT NULL,
                    pid INT NOT NULL, started_at TIMESTAMP NOT NULL,
                    last_beat_at TIMESTAMP NOT NULL,
                    runs_total BIGINT NOT NULL DEFAULT 0,
                    runs_failed BIGINT NOT NULL DEFAULT 0
                )
                """
            )
        )
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr("app.db.session.SessionLocal", factory)
    return factory


def _drain(observer: RunObserver) -> None:
    """触发 flusher 排空事件队列（stop 后线程退出前处理完剩余事件）。"""
    observer.stop()


# ---------------------------------------------------------------- /healthz


def _get(path_url: str) -> tuple[int, dict]:
    """GET 并返回 (status, json)。urllib 对 4xx/5xx 抛 HTTPError，需显式接住。"""
    try:
        with urllib.request.urlopen(path_url) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read())


def test_healthz_reports_ok_when_loop_fresh_and_db_reachable(monkeypatch):
    class FakeObserver:
        worker_id = "w-test"
        worker_version = "test-v1"

        def snapshot(self):
            return {
                "workerId": "w-test",
                "workerVersion": "test-v1",
                "startedAt": "2026-10-12T20:00:00+00:00",
                "secondsSinceLastLoopTick": 1.0,
                "runs": {"total": 3, "succeeded": 3},
                "recentRuns": [],
            }

    from app.worker import health as health_mod

    monkeypatch.setattr(
        health_mod,
        "queue_status",
        lambda: {"reachable": True, "pending": 0, "oldestPendingSeconds": None},
    )
    server = start_health_server(0, FakeObserver())
    port = server.server_address[1]
    try:
        status, payload = _get(f"http://127.0.0.1:{port}/healthz")
        assert status == 200
        assert payload["status"] == "ok"
        assert payload["checks"] == {"mainLoopAlive": True, "dbReachable": True}
        assert payload["workerId"] == "w-test"
    finally:
        server.shutdown()
        server.server_close()


def test_healthz_degrades_on_stale_loop_or_db_down(monkeypatch):
    class StaleObserver:
        def snapshot(self):
            return {
                "secondsSinceLastLoopTick": TICK_FRESH_SECONDS + 10,
                "runs": {"total": 0},
                "recentRuns": [],
            }

    from app.worker import health as health_mod

    monkeypatch.setattr(
        health_mod,
        "queue_status",
        lambda: {"reachable": False, "pending": None, "oldestPendingSeconds": None},
    )
    server = start_health_server(0, StaleObserver())
    port = server.server_address[1]
    try:
        status, payload = _get(f"http://127.0.0.1:{port}/healthz")
        assert status == 503
        assert payload["status"] == "degraded"
        assert payload["checks"]["mainLoopAlive"] is False
        assert payload["checks"]["dbReachable"] is False
    finally:
        server.shutdown()
        server.server_close()


# ---------------------------------------------------------------- observer


def test_observer_counts_and_persists_runs(sqlite_session_factory):
    observer = RunObserver(worker_id="w-unit", worker_version="test-v1", beat_interval_seconds=3600)
    try:
        observer(RUN_EVENT)
        observer({"tick": True})
        observer(
            {
                "taskType": "matching",
                "taskId": 8,
                "outcome": "RETRY",
                "errorCode": "SERVICE_DISABLED",
                "attempt": 2,
                "durationMs": 10,
                "startedAt": "2026-10-12T20:00:01+00:00",
                "finishedAt": "2026-10-12T20:00:01.010000+00:00",
            }
        )
        _drain(observer)

        snapshot = observer.snapshot()
        assert snapshot["runs"]["total"] == 2
        assert snapshot["runs"]["succeeded"] == 1
        assert snapshot["runs"]["retryScheduled"] == 1
        assert snapshot["secondsSinceLastLoopTick"] is not None

        with sqlite_session_factory() as db:
            rows = db.scalars(select(AiTaskRun).order_by(AiTaskRun.id)).all()
            assert len(rows) == 2
            assert rows[0].task_type == "matching"
            assert rows[0].outcome == "DONE"
            assert rows[0].result_version == "abc123"
            assert rows[0].worker_id == "w-unit"
            assert rows[1].outcome == "RETRY"
            assert rows[1].error_code == "SERVICE_DISABLED"
            beat = db.get(WorkerHeartbeat, "w-unit")
            assert beat is not None
            assert beat.runs_total == 2
            assert beat.runs_failed == 0
    finally:
        if observer._thread.is_alive():
            observer._stop.set()


def test_observer_never_raises_and_never_blocks(sqlite_session_factory):
    """观测红线：任何异常都不允许外泄到任务执行路径。"""
    observer = RunObserver(worker_id="w-unit", worker_version="test-v1", queue_size=1)
    try:
        observer(RUN_EVENT)  # 正常
        observer({})  # 全字段缺失：容忍
        observer({"outcome": "WEIRD"})  # 未知 outcome：容忍
        for _ in range(5):  # 超过队列容量：丢弃并计数，不阻塞不抛出
            observer(RUN_EVENT)
        assert observer.snapshot()["runs"]["droppedEvents"] >= 1
    finally:
        _drain(observer)


def test_matching_jobs_hook_swallows_bad_observers():
    from app.services import matching_jobs

    calls = []

    def bad(_event):
        raise RuntimeError("观测器故障")

    def good(event):
        calls.append(event)

    matching_jobs.RUN_OBSERVERS.append(bad)
    matching_jobs.RUN_OBSERVERS.append(good)
    try:
        matching_jobs._emit_run({"tick": True})
        assert calls == [{"tick": True}]
    finally:
        matching_jobs.RUN_OBSERVERS.clear()


# ------------------------------------------------------- baseline 绑定校验


def test_resolve_bindings_rejects_malformed_advisory_url():
    """URL 合规校验：scheme/query/凭据等不合规则拒绝启动。"""
    from types import SimpleNamespace

    from scripts.baseline_services import resolve_bindings

    bad = SimpleNamespace(
        m7_service_url="http://baseline:8787?trace=1",
        m8_service_url="http://baseline:8788",
        baseline_rpc_token="x" * 32,
        baseline_bind_host="0.0.0.0",
        baseline_data_dir="",
    )
    host, m7, m8, _dir, error = resolve_bindings(bad)
    assert error, "带 query 的建议服务 URL 必须被拒绝"
    assert host is None and m7 is None and m8 is None


def test_resolve_bindings_accepts_container_mode():
    from types import SimpleNamespace

    from scripts.baseline_services import resolve_bindings

    container = SimpleNamespace(
        m7_service_url="http://baseline:8787",
        m8_service_url="http://baseline:8788",
        baseline_rpc_token="x" * 32,
        baseline_bind_host="0.0.0.0",
        baseline_data_dir="",
    )
    host, m7, m8, _dir, error = resolve_bindings(container)
    assert error is None
    assert (host, m7, m8) == ("0.0.0.0", 8787, 8788)


def test_resolve_bindings_requires_strong_token():
    from types import SimpleNamespace

    from scripts.baseline_services import resolve_bindings

    weak = SimpleNamespace(
        m7_service_url="http://baseline:8787",
        m8_service_url="http://baseline:8788",
        baseline_rpc_token="short",
        baseline_bind_host="0.0.0.0",
        baseline_data_dir="",
    )
    _host, _m7, _m8, _dir, error = resolve_bindings(weak)
    assert error and "32" in error


# ------------------------------------------------------------- 配置兼容


def test_runtime_flags_default_keep_phase3_semantics():
    """默认单进程内嵌：CI 与本地直跑 serve.py 的行为与 phase-3 完全一致。"""
    from app.core.config import Settings

    settings = Settings(AUTH_SIGNING_KEY="x" * 16)
    assert settings.matching_worker_inprocess is True
    assert settings.baseline_inprocess is True
    assert settings.worker_health_port == 8000
    assert settings.worker_id == ""


def test_worker_id_autogen_contains_host():
    ident = default_worker_id()
    assert ident.startswith("worker-") and len(ident) > len("worker-")
