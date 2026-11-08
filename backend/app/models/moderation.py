"""User-visible decisions are separate from private reports and internal audits."""

from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AccountDecision(Base):
    __tablename__ = "account_decisions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    facts: Mapped[str] = mapped_column(String(2000), nullable=False)
    basis: Mapped[str] = mapped_column(String(500), nullable=False)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Only a deliberately disclosed snapshot; never copy raw reporter/private chat data.
    reference: Mapped[dict | None] = mapped_column(JSONB)
    evidence: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    revocation_reason: Mapped[str | None] = mapped_column(String(1000))

    __table_args__ = (
        CheckConstraint("action IN ('WARNING', 'DISABLE')", name="ck_action_enum"),
        Index("ix_account_decisions_user_created", "user_id", "created_at"),
    )


class AccountAppeal(Base):
    __tablename__ = "account_appeals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    decision_id: Mapped[int] = mapped_column(ForeignKey("account_decisions.id"), unique=True)
    explanation: Mapped[str] = mapped_column(String(2000), nullable=False)
    evidence: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    review_reason: Mapped[str | None] = mapped_column(String(1000))

    __table_args__ = (
        CheckConstraint("status IN ('PENDING', 'UPHELD', 'REVOKED')", name="ck_status_enum"),
        Index("ix_account_appeals_status_created", "status", "created_at"),
    )
