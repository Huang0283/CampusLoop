from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    scope: Mapped[str] = mapped_column(String(128), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("actor_id", "scope", "key"),)


class UploadedObject(Base):
    __tablename__ = "uploaded_objects"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    object_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    purpose: Mapped[str] = mapped_column(String(16), nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatReadCursor(Base):
    __tablename__ = "chat_read_cursors"
    session_id: Mapped[int] = mapped_column(ForeignKey("chat_sessions.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    last_message_id: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
