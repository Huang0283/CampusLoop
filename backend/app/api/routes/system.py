"""系统级接口：/health 与 /ready（BP2-06，契约 x-campusloop-phase: BP2-06）。

对齐 openapi/campusloop.v1.yaml HealthResponse：
{ "code": 0, "message": "ok",
  "data": { "status": "ok"|"degraded",
            "dependencies": { "<name>": "ok"|"unavailable", ... } } }

依赖不可用时仍返回 200 + degraded（契约语义）；
/ready 供 Compose/K8s 探针使用：degraded 时返回 503，避免把流量打进坏实例。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Response, status
from redis import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.envelope import ok
from app.db.session import check_database

router = APIRouter(tags=["System"])


def check_redis() -> bool:
    settings = get_settings()
    try:
        client = Redis.from_url(
            settings.redis_url,
            socket_timeout=settings.redis_socket_timeout_seconds,
        )
        return bool(client.ping())
    except (RedisError, OSError, ValueError):
        return False


def collect_dependency_status() -> dict[str, str]:
    dependencies = {
        "database": "ok" if check_database() else "unavailable",
        "redis": "ok" if check_redis() else "unavailable",
        # Phase 4 接入智能服务后追加 intelligence 项
    }
    return dependencies


@router.get("/health")
def health() -> dict[str, Any]:
    dependencies = collect_dependency_status()
    overall = "ok" if all(v == "ok" for v in dependencies.values()) else "degraded"
    return ok(data={"status": overall, "dependencies": dependencies})


@router.get("/ready")
def ready(response: Response) -> dict[str, Any]:
    dependencies = collect_dependency_status()
    overall = "ok" if all(v == "ok" for v in dependencies.values()) else "degraded"
    if overall != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ok(data={"status": overall, "dependencies": dependencies})
