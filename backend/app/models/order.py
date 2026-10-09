"""订单、订单事件与见面约定模型（Owner: M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import MeetupStatus, OrderStatus
from app.models.mixins import TimestampMixin


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    offer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("offers.id", ondelete="RESTRICT"), nullable=True
    )
    buyer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=OrderStatus.PENDING_CONFIRM.value
    )
    # 成交价快照：下单时从被接受的 offer 复制，后续改价不影响历史订单
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    # 乐观锁版本号：双方确认/取消用 version 防并发冲突（契约 409 场景）
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    buyer_confirmed_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    seller_confirmed_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # 取消原因快照（仅 CANCELLED/DISPUTED 时填写；与迁移 0001 String(200) 对齐）
    cancelled_reason: Mapped[str | None] = mapped_column(String(200), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED', "
            "'COMPLETED', 'CANCELLED', 'DISPUTED')",
            name="ck_status_enum",
        ),
        CheckConstraint("buyer_id <> seller_id", name="ck_not_self_deal"),
        CheckConstraint("amount >= 0", name="ck_orders_amount_non_negative"),
        # 一个商品只能有一单未取消/未纠纷：部分唯一索引（见 0001 迁移）
        Index("ix_orders_buyer_status", "buyer_id", "status"),
        Index("ix_orders_seller_status", "seller_id", "status"),
    )


class OrderEvent(Base):
    """不可变事件流：只 INSERT，应用层承诺不 UPDATE/DELETE（Phase 5 评估加触发器）。"""

    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    from_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_status: Mapped[str] = mapped_column(String(32), nullable=False)
    operator_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_order_events_order_id", "order_id", "created_at"),)


class Meetup(TimestampMixin, Base):
    """见面约定：双方各自确认同一 version 才算敲定（契约 MEETUP_VERSION_CONFLICT）。"""

    __tablename__ = "meetups"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    place: Mapped[str] = mapped_column(String(128), nullable=False)
    # 候选时间段（ISO 时间串数组）；M6 定义结构
    proposed_slots: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confirmed_slot: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=MeetupStatus.PROPOSED.value
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    buyer_confirmed_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    seller_confirmed_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        CheckConstraint(
            "status IN ('PROPOSED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')",
            name="ck_status_enum",
        ),
        # 一个订单最多一条约定
        UniqueConstraint("order_id", name="uq_meetups_order"),
    )
