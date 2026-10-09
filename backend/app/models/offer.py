"""报价模型（Owner: M6 设计 / M9 落库，BP2-07）。

"接受报价 -> 创建订单" 的原子性由 Phase 3 应用层在同一事务内完成
（SELECT ... FOR UPDATE 锁 offer 行 + 插入订单 + 更新状态），
库层保证：一个 offer 只能被接受一次、幂等键防重复提交。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import OfferStatus
from app.models.mixins import TimestampMixin


class Offer(TimestampMixin, Base):
    __tablename__ = "offers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    buyer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    proposer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    countered_by_offer_id: Mapped[int | None] = mapped_column(ForeignKey("offers.id"))
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=OfferStatus.PENDING.value
    )
    # 前端防重复点击的幂等键（客户端生成 UUID）
    idempotency_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED')",
            name="ck_status_enum",
        ),
        CheckConstraint("amount >= 0", name="ck_amount_non_negative"),
        # 幂等：同一买家在同一会话内同一幂等键只允许一条
        UniqueConstraint("session_id", "buyer_id", "idempotency_key", name="uq_offers_idempotency"),
        Index("ix_offers_session_status", "session_id", "status"),
    )
