"""Worker 进程装配（BP4-07，M9）。

进程拓扑（phase-4 起，与 phase-3 单进程模式的对照）：
    phase-3:  [api 容器] uvicorn + worker 线程 + 环回内嵌 M7/M8 服务
    phase-4:  [api 容器]      uvicorn（MATCHING_WORKER_INPROCESS=false）
              [worker 容器]  worker_loop + /healthz     ← 本模块
              [baseline 容器] M7/M8 建议服务（内网端口）

主循环沿用 phase-3 的 matching_jobs.worker_loop（队列语义零改动）；
本模块只负责：观测装配、健康服务器、信号与优雅退出。
"""

from __future__ import annotations

import logging
import signal
import threading

from app.core.logging import configure_logging
from app.worker.observer import RunObserver, default_worker_id

# 运行时版本：进 ai_task_runs.worker_version / worker_heartbeats.version，
# 回答"这个任务结果由哪个版本的运行时处理"。M7/M8 算法版本另见
# matching_results.facts.metadata.algorithmVersion（输入版本为 result_version）。
WORKER_RUNTIME_VERSION = "bp4-worker-runtime-v1"

logger = logging.getLogger("worker.runner")


def build_observer() -> RunObserver:
    """按配置构造观测器并安装到队列实现（幂等：只装一次）。"""
    from app.core.config import get_settings
    from app.services import matching_jobs

    settings = get_settings()
    observer = RunObserver(
        worker_id=settings.worker_id or default_worker_id(),
        worker_version=WORKER_RUNTIME_VERSION,
        queue_size=settings.worker_observe_queue_size,
        beat_interval_seconds=settings.worker_beat_interval_seconds,
    )
    if not matching_jobs.RUN_OBSERVERS:
        matching_jobs.RUN_OBSERVERS.append(observer)
    return observer


def main() -> int:
    """进程入口：阻塞于主循环，SIGTERM/SIGINT 优雅退出。"""
    from app.core.config import get_settings
    from app.services.matching_jobs import worker_loop
    from app.worker.health import start_health_server

    settings = get_settings()
    configure_logging(level=settings.log_level, as_json=settings.log_json)
    observer = build_observer()
    stop = threading.Event()

    def _shutdown(signum, _frame):
        logger.info("收到信号 %s，开始优雅退出（等待在跑任务提交完成）。", signum)
        stop.set()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    server = start_health_server(settings.worker_health_port, observer)
    logger.info(
        "Worker 启动：id=%s version=%s health_port=%d",
        observer.worker_id,
        observer.worker_version,
        settings.worker_health_port,
    )
    exit_code = 0
    try:
        worker_loop(stop)  # 阻塞主线程；信号处理只置位 stop
    except Exception:  # noqa: BLE001 -- 主循环本身兜底异常，这里防御进程级错误
        logger.exception("主循环异常退出。")
        exit_code = 1
    finally:
        stop.set()
        observer.stop()  # 排空观测队列 + 最终心跳
        server.shutdown()
        server.server_close()
        logger.info("Worker 已退出。")
    return exit_code
