from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MatchingJob(Base):
    __tablename__ = "matching_jobs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    event_key: Mapped[str] = mapped_column(String(160), nullable=False)
    wanted_id: Mapped[int] = mapped_column(ForeignKey("wanted_posts.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_error: Mapped[str | None] = mapped_column(String(64))
    result_version: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    __table_args__ = (UniqueConstraint("event_key", "wanted_id"),)


class MatchingResult(Base):
    __tablename__ = "matching_results"
    wanted_id: Mapped[int] = mapped_column(ForeignKey("wanted_posts.id"), primary_key=True)
    result_version: Mapped[str] = mapped_column(String(64), nullable=False)
    facts: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class MatchingNotification(Base):
    __tablename__ = "matching_notifications"
    wanted_id: Mapped[int] = mapped_column(ForeignKey("wanted_posts.id"), primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), primary_key=True)
    notification_id: Mapped[int] = mapped_column(ForeignKey("notifications.id"), nullable=False)
    result_version: Mapped[str] = mapped_column(String(64), nullable=False)
