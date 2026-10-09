"""pytest 共享夹具。

单元测试不依赖真实 PostgreSQL/Redis；
需要数据库的集成测试统一加 `@pytest.mark.integration`，
未提供可达数据库时自动 skip（CI 通过 services 提供真实容器，则会真正执行）。
"""

from __future__ import annotations

import os

import pytest

# 在导入 app 之前固定测试环境变量（优先尊重外部注入，如 CI service 容器）
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("LOG_JSON", "false")
os.environ.setdefault("LOG_LEVEL", "WARNING")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://campusloop:campusloop@localhost:5432/campusloop_test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")

from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import check_database  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _postgres_reachable() -> bool:
    try:
        return check_database()
    except Exception:
        return False


# CI 里提供 postgres service，集成测试才会真正跑；本地没库则明确 skip
pytestmark_integration = pytest.mark.integration

requires_postgres = pytest.mark.skipif(
    not _postgres_reachable(), reason="需要可达的 PostgreSQL（CI 由 services 提供）"
)


@pytest.fixture(autouse=True)
def isolated_rate_limits(request):
    if request.node.get_closest_marker("integration") is None or not _postgres_reachable():
        return
    from urllib.parse import urlsplit

    from redis import Redis

    from app.core.config import get_settings

    settings = get_settings()
    if urlsplit(settings.redis_url).path not in ("/14", "/15"):
        pytest.fail("Integration tests require dedicated Redis DB 14 or 15.")
    with Redis.from_url(settings.redis_url) as redis:
        for key in redis.scan_iter("auth:*"):
            redis.delete(key)
