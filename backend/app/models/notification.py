"""站内通知模型（Owner: M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    # 通知体：跳转目标、快照摘要等（契约 Notification.payload）
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # NULL = 未读（未读数可用 Redis 缓存，失效时回退 count 查询）
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('MESSAGE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', "
            "'MATCH_FOUND', 'ORDER_STATUS_CHANGED', 'MEETUP_REMINDER', "
            "'REVIEW_REQUEST', 'REPORT_RESULT')",
            name="ck_type_enum",
        ),
        # 未读列表 / 未读数核心索引
        Index("ix_notifications_user_read", "user_id", "read_at"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )
