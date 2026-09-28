"""评价模型（Owner: M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Review(TimestampMixin, Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="RESTRICT"), nullable=False
    )
    reviewer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    reviewee_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # 1-5 星；0 表示未评分占位（防重复评价用唯一约束，见下）
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
        CheckConstraint("reviewer_id <> reviewee_id", name="ck_not_self_review"),
        # 一单一人一评：双倍唯一，杜绝重复评价（契约 REVIEW_DUPLICATED）
        UniqueConstraint("order_id", "reviewer_id", name="uq_reviews_order_reviewer"),
        Index("ix_reviews_reviewee_created", "reviewee_id", "created_at"),
    )
