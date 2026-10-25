"""AI 任务运行观测表（BP4-08，M9 独占：监控）。

- ai_task_runs：worker 每次任务执行追加一条流水，直接回答 Issue BP4-08
  验收标准——"定位某任务的输入版本（result_version）、处理服务
  （worker_version + result facts 中的 algorithmVersion）、失败原因
  （error_code）和重试次数（attempt）"。
- worker_heartbeats：每个 worker 实例一行的心跳与累计计数（UPSERT 维护），
  让"哪些 worker 活着、从启动到现在处理了多少任务"可直接用 SQL 回答。

刻意约束：
- 两表只用跨方言标量列（无 JSONB），保证单测可用 sqlite 内存库验证；
- 不设外键：观测是审计数据，业务行删除后历史流水必须保留；
- 表归 M9 独占（监控），业务侧不得向其写入或读取业务语义。
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AiTaskRun(Base):
    """一次任务执行的观测流水（只追加，不更新）。"""

    __tablename__ = "ai_task_runs"
    __table_args__ = (
        Index("ix_ai_task_runs_type_created", "task_type", "created_at"),
        Index("ix_ai_task_runs_task_id", "task_id"),
        Index("ix_ai_task_runs_outcome", "outcome"),
        Index("ix_ai_task_runs_event_key", "event_key"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # 任务类型：phase-4 仅有 matching；M6 的编排任务注册后沿用本表（写入方仍为 M9 运行时）
    task_type: Mapped[str] = mapped_column(String(64), nullable=False)
    task_id: Mapped[int | None] = mapped_column(BigInteger)
    event_key: Mapped[str | None] = mapped_column(String(160))
    wanted_id: Mapped[int | None] = mapped_column(BigInteger)
    # DONE / SKIPPED / RETRY / FAILED / WORKER_FAILURE
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(64))
    # 输入版本（rank_live 稳定输入快照的 sha256；DONE 时与 matching_results 一致）
    result_version: Mapped[str | None] = mapped_column(String(64))
    # 第几次尝试（1 起）；与 matching_jobs.attempts 对账
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    worker_id: Mapped[str] = mapped_column(String(128), nullable=False)
    worker_version: Mapped[str] = mapped_column(String(64), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkerHeartbeat(Base):
    """worker 实例心跳（每实例一行，UPSERT）。"""

    __tablename__ = "worker_heartbeats"

    worker_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    version: Mapped[str] = mapped_column(String(64), nullable=False)
    pid: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_beat_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    runs_total: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    runs_failed: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
