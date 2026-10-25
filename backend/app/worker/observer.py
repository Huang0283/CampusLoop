"""任务运行观测器（BP4-08，M9）。

数据流：
    matching_jobs._emit_run(event)          # 队列实现发出任务事件（M9 钩子）
      -> RunObserver.__call__               # 只入内存队列，绝不抛出、绝不阻塞
      -> flusher 线程                        # 独立会话批量写 ai_task_runs
      -> worker_heartbeats UPSERT            # 周期心跳 + 累计计数

红线：
- 观测永远不能影响任务执行：入队失败/写库失败都只计数与记日志；
- 独立短会话写入，与任务执行会话完全隔离（不共享事务/连接）；
- /healthz 的数据（snapshot）直接读内存，不查业务表。

事件结构（由 matching_jobs 发出，字段与 ai_task_runs 列一一对应）：
    {"taskType", "taskId", "eventKey", "wantedId", "outcome",
     "errorCode", "resultVersion", "attempt", "durationMs",
     "startedAt", "finishedAt"}          # startedAt/finishedAt 为 ISO 字符串
    {"tick": true}                       # 主循环存活信号（每次迭代一条）
"""

from __future__ import annotations

import logging
import os
import queue
import socket
import threading
from collections import deque
from datetime import datetime

from app.core.security import utcnow
from app.models import AiTaskRun, WorkerHeartbeat

logger = logging.getLogger("worker.observer")

# 内存环形缓冲里保留的最近任务运行条数（供 /healthz 展示）
RECENT_RUNS_KEPT = 20


class RunObserver:
    """收集任务运行事件：内存即时可见，DB 异步落地。"""

    def __init__(
        self,
        worker_id: str,
        worker_version: str,
        queue_size: int = 2000,
        beat_interval_seconds: float = 10.0,
    ) -> None:
        self.worker_id = worker_id
        self.worker_version = worker_version
        self.beat_interval_seconds = max(1.0, beat_interval_seconds)
        self.started_at = utcnow()
        self._events: queue.Queue[dict] = queue.Queue(maxsize=queue_size)
        self._lock = threading.Lock()
        self._recent: deque[dict] = deque(maxlen=RECENT_RUNS_KEPT)
        self._counters = {
            "total": 0,
            "DONE": 0,
            "SKIPPED": 0,
            "RETRY": 0,
            "FAILED": 0,
            "WORKER_FAILURE": 0,
        }
        self._dropped_events = 0
        self._write_errors = 0
        self._last_tick: datetime | None = None
        self._stop = threading.Event()
        self._thread = threading.Thread(
            target=self._flush_loop, name="worker-observer", daemon=True
        )
        self._thread.start()

    # ------------------------------------------------------------------ 钩子
    def __call__(self, event: dict) -> None:
        """matching_jobs 观察者钩子入口。任何异常都被本方法吞掉。"""
        try:
            if event.get("tick"):
                with self._lock:
                    self._last_tick = utcnow()
                return
            with self._lock:
                for key in ("DONE", "SKIPPED", "RETRY", "FAILED", "WORKER_FAILURE"):
                    if event.get("outcome") == key:
                        self._counters[key] += 1
                self._counters["total"] += 1
                self._recent.append(
                    {
                        "taskId": event.get("taskId"),
                        "eventKey": event.get("eventKey"),
                        "outcome": event.get("outcome"),
                        "errorCode": event.get("errorCode"),
                        "resultVersion": event.get("resultVersion"),
                        "attempt": event.get("attempt"),
                        "durationMs": event.get("durationMs"),
                        "finishedAt": event.get("finishedAt"),
                    }
                )
            try:
                self._events.put_nowait(event)
            except queue.Full:
                with self._lock:
                    self._dropped_events += 1
                logger.warning("观测队列已满，丢弃一条事件（总丢弃=%d）。", self._dropped_events)
        except Exception:  # noqa: BLE001 -- 观测绝不允许影响任务执行
            logger.warning("观测钩子内部错误（已忽略）。", exc_info=True)

    # -------------------------------------------------------------- DB 落地
    def _flush_loop(self) -> None:
        """独立线程：逐条写库 + 节流心跳。独立短会话，与任务会话隔离。"""
        from app.db.session import SessionLocal  # 进程内延迟导入，避免导入期副作用

        next_beat = 0.0
        while not self._stop.is_set() or not self._events.empty():
            try:
                event = self._events.get(timeout=0.5)
            except queue.Empty:
                pass
            else:
                try:
                    with SessionLocal() as db, db.begin():
                        db.add(_run_row(event, self.worker_id, self.worker_version))
                except Exception:  # noqa: BLE001
                    with self._lock:
                        self._write_errors += 1
                    logger.warning("ai_task_runs 写入失败（已计数，不影响任务）。", exc_info=True)
            now = utcnow().timestamp()
            if now >= next_beat:
                self._beat(SessionLocal)
                next_beat = now + self.beat_interval_seconds

    def _beat(self, session_factory) -> None:
        try:
            with self._lock:
                counters = dict(self._counters)
            now = utcnow()
            with session_factory() as db, db.begin():
                row = db.get(WorkerHeartbeat, self.worker_id)
                if row is None:
                    row = WorkerHeartbeat(
                        worker_id=self.worker_id,
                        version=self.worker_version,
                        pid=os.getpid(),
                        started_at=self.started_at,
                        last_beat_at=now,
                        runs_total=counters["total"],
                        runs_failed=counters["FAILED"] + counters["WORKER_FAILURE"],
                    )
                    db.add(row)
                else:
                    row.last_beat_at = now
                    row.runs_total = counters["total"]
                    row.runs_failed = counters["FAILED"] + counters["WORKER_FAILURE"]
        except Exception:  # noqa: BLE001
            with self._lock:
                self._write_errors += 1

    def stop(self) -> None:
        """优雅停止：排空队列后写最终心跳。"""
        self._stop.set()
        self._thread.join(timeout=5)

    # ---------------------------------------------------------------- 快照
    def snapshot(self) -> dict:
        """/healthz 数据源：纯内存，不查库。"""
        with self._lock:
            counters = dict(self._counters)
            recent = list(self._recent)
            dropped = self._dropped_events
            write_errors = self._write_errors
            last_tick = self._last_tick
        seconds_since_tick = (
            (utcnow() - last_tick).total_seconds() if last_tick is not None else None
        )
        return {
            "workerId": self.worker_id,
            "workerVersion": self.worker_version,
            "startedAt": self.started_at.isoformat(),
            "secondsSinceLastLoopTick": seconds_since_tick,
            "runs": {
                "total": counters["total"],
                "succeeded": counters["DONE"],
                "skipped": counters["SKIPPED"],
                "retryScheduled": counters["RETRY"],
                "failed": counters["FAILED"],
                "workerFailure": counters["WORKER_FAILURE"],
                "droppedEvents": dropped,
                "dbWriteErrors": write_errors,
            },
            "recentRuns": recent,
        }


def _run_row(event: dict, worker_id: str, worker_version: str) -> AiTaskRun:
    """事件 -> 表行。字段缺失一律容忍（观测不挑剔业务）。"""
    started = _parse_iso(event.get("startedAt"))
    finished = _parse_iso(event.get("finishedAt"))
    return AiTaskRun(
        task_type=event.get("taskType") or "matching",
        task_id=event.get("taskId"),
        event_key=event.get("eventKey"),
        wanted_id=event.get("wantedId"),
        outcome=event.get("outcome") or "WORKER_FAILURE",
        error_code=event.get("errorCode"),
        result_version=event.get("resultVersion"),
        attempt=event.get("attempt") or 0,
        duration_ms=event.get("durationMs"),
        worker_id=worker_id,
        worker_version=worker_version,
        started_at=started,
        finished_at=finished,
    )


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def default_worker_id() -> str:
    """worker 身份：容器内自动生成；可用 WORKER_ID 固定（便于跨重启追踪）。"""
    return f"worker-{socket.gethostname()}-{os.getpid()}"
