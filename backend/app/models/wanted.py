"""求购模型（Owner: M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import WantedStatus
from app.models.mixins import TimestampMixin


class WantedPost(TimestampMixin, Base):
    __tablename__ = "wanted_posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    budget_min: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    budget_max: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    # 硬性要求（成色、校区、配件等），供 M7 求购匹配使用
    requirements: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=WantedStatus.OPEN.value)

    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED')", name="ck_status_enum"
        ),
        CheckConstraint(
            "budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max",
            name="ck_budget_order",
        ),
        CheckConstraint("budget_min IS NULL OR budget_min >= 0", name="ck_budget_min_non_negative"),
        Index("ix_wanted_posts_status_category", "status", "category"),
        Index("ix_wanted_posts_owner_created", "owner_id", "created_at"),
    )
