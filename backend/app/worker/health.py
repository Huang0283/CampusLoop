"""Worker /healthz 探针（BP4-07/08，M9）。

要求与取舍：
- 只用标准库 http.server：worker 进程不加载 FastAPI/模型栈，
  探针的存活与业务栈的存活互相独立；
- /healthz 聚合三类事实：主循环心跳（observer.tick）、队列状态（DB 直查）、
  最近任务运行摘要（observer 内存快照）；
- 200=健康（心跳新鲜且 DB 可达）；503=异常（附原因）。Compose healthcheck
  与取证脚本都只依赖这个端点。

端点：
    GET /healthz -> {"status": "ok" | "degraded", ...}
"""

from __future__ import annotations

import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

logger = logging.getLogger("worker.health")

# 主循环每轮至少 tick 一次（worker_loop 最长阻塞 stop.wait(1)）；
# 超过该阈值视为主循环失去响应。
TICK_FRESH_SECONDS = 15.0


def queue_status() -> dict:
    """队列实时状态。DB 不可达时返回 reachable=False，绝不抛出。"""
    from sqlalchemy import func, select

    from app.db.session import SessionLocal
    from app.models import MatchingJob

    try:
        with SessionLocal() as db:
            pending = db.scalar(
                select(func.count()).select_from(MatchingJob).where(MatchingJob.status == "PENDING")
            )
            oldest = db.scalar(
                select(func.min(MatchingJob.available_at)).where(MatchingJob.status == "PENDING")
            )
        oldest_seconds = None
        if oldest is not None:
            from app.core.security import utcnow

            oldest_seconds = max(0, int((utcnow() - oldest).total_seconds()))
        return {"reachable": True, "pending": pending or 0, "oldestPendingSeconds": oldest_seconds}
    except Exception:  # noqa: BLE001 -- 健康端点不能因 DB 抖动而崩溃
        logger.warning("队列状态查询失败（DB 不可达？）。", exc_info=True)
        return {"reachable": False, "pending": None, "oldestPendingSeconds": None}


def health_payload(observer) -> tuple[int, dict]:
    """聚合健康状态。返回 (http_status, payload)。"""
    snapshot = observer.snapshot()
    queue = queue_status()
    tick_age = snapshot.get("secondsSinceLastLoopTick")
    loop_alive = tick_age is not None and tick_age <= TICK_FRESH_SECONDS
    healthy = loop_alive and queue["reachable"]
    payload = {
        "status": "ok" if healthy else "degraded",
        **snapshot,
        "queue": queue,
        "checks": {
            "mainLoopAlive": loop_alive,
            "dbReachable": queue["reachable"],
        },
    }
    return (200 if healthy else 503), payload


def start_health_server(port: int, observer) -> ThreadingHTTPServer:
    """启动 /healthz 服务器（后台线程）。失败端口占用时抛出并由入口负责退出。"""

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802 -- 标准库命名约定
            if self.path not in ("/healthz", "/"):
                self.send_response(404)
                self.end_headers()
                return
            try:
                status, payload = health_payload(observer)
            except Exception:  # noqa: BLE001
                logger.exception("健康数据聚合失败。")
                status, payload = 503, {"status": "degraded", "error": "health_aggregation_failed"}
            body = json.dumps(payload, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):  # 静默访问日志：/healthz 会被周期探测
            return

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    thread = threading.Thread(target=server.serve_forever, name="worker-health", daemon=True)
    thread.start()
    return server
