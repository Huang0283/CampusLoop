"""聊天会话与消息模型（Owner: M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ChatMessageKind
from app.models.mixins import TimestampMixin


class ChatSession(TimestampMixin, Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # PRODUCT 会话绑定商品；WANTED 会话绑定求购；对应目标删除后会话保留审计
    session_type: Mapped[str] = mapped_column(String(16), nullable=False)
    product_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    wanted_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("wanted_posts.id", ondelete="SET NULL"), nullable=True
    )
    buyer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # 冗余排序列：新消息写入时同事务维护（对应迁移 0001 的 last_message_at 与双索引）
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("session_type IN ('PRODUCT', 'WANTED')", name="ck_session_type_enum"),
        CheckConstraint("buyer_id <> seller_id", name="ck_not_self_session"),
        # 同一买家在同一个商品会话里只开一条（契约 POST /chat/sessions 幂等）
        UniqueConstraint("product_id", "buyer_id", name="uq_chat_sessions_product_buyer"),
        UniqueConstraint("wanted_id", "buyer_id", name="uq_chat_sessions_wanted_buyer"),
        Index("ix_chat_sessions_buyer_updated", "buyer_id", "updated_at"),
        Index("ix_chat_sessions_seller_updated", "seller_id", "updated_at"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    # 自增 PK 同时作为契约 afterId 游标（拉取"大于某 id"的消息）
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    sender_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ChatMessageKind.TEXT.value
    )
    # TEXT 存内容；IMAGE 存对象键；OFFER/ORDER_EVENT/SYSTEM 存 JSONB 快照
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    client_msg_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "kind IN ('TEXT', 'IMAGE', 'OFFER', 'ORDER_EVENT', 'SYSTEM')",
            name="ck_kind_enum",
        ),
        # 补拉/分页核心索引：按会话顺序扫描
        Index("ix_chat_messages_session_id", "session_id", "id"),
    )
