"""举报模型（Owner: M5/M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ReportStatus
from app.models.mixins import TimestampMixin


class Report(TimestampMixin, Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    reporter_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    # 指向 users/products/orders/chat_messages.id，按 target_type 解释
    target_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # 证据：对象存储键列表；仅管理员与处理人可见（M5 字段可见性表）
    evidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ReportStatus.PENDING.value
    )
    handled_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "target_type IN ('USER', 'PRODUCT', 'ORDER', 'CHAT_MESSAGE')",
            name="ck_target_type_enum",
        ),
        CheckConstraint(
            "reason IN ('FAKE_PRODUCT', 'DESCRIPTION_MISMATCH', 'SPAM', "
            "'ABNORMAL_PRICE', 'HARASSMENT', 'VIOLATION')",
            name="ck_reason_enum",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED')",
            name="ck_status_enum",
        ),
        # 同一人对同一目标同一理由只允许一条未处理举报
        UniqueConstraint(
            "reporter_id",
            "target_type",
            "target_id",
            "reason",
            name="uq_reports_no_duplicate",
        ),
        Index("ix_reports_status_created", "status", "created_at"),
    )
