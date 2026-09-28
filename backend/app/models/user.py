"""用户与会话模型（Owner: M5 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import Role, UserStatus
from app.models.mixins import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    # 敏感字段：任何响应/日志不得返回（见 M5 user-field-visibility.md）
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str] = mapped_column(String(64), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # 教学模拟校园邮箱域名白名单（如 stu.edu.cn）；Phase 3 由 M5 校验
    campus_email_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    # 与 OpenAPI Role 枚举一致：USER / ADMIN
    role: Mapped[str] = mapped_column(String(16), nullable=False, default=Role.USER.value)
    # 契约用 423 表达禁用；库层显式存 ACTIVE/DISABLED
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=UserStatus.ACTIVE.value)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # 冗余聚合字段：评价写入时由应用层在同一事务维护
    rating_avg: Mapped[float] = mapped_column(Numeric(2, 1), nullable=False, default=0)
    transaction_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        CheckConstraint("role IN ('USER', 'ADMIN')", name="ck_role_enum"),
        CheckConstraint("status IN ('ACTIVE', 'DISABLED')", name="ck_status_enum"),
        CheckConstraint("rating_avg >= 0 AND rating_avg <= 5", name="ck_rating_range"),
        Index("ix_users_role_status", "role", "status"),
    )


class RefreshSession(Base):
    """刷新令牌会话（Owner: M5 BP2-02 设计；M9 落库）。

    只存 token 的 SHA-256 哈希，绝不明文；登出即软删除。
    """

    __tablename__ = "refresh_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (Index("ix_refresh_sessions_user_active", "user_id", "revoked_at"),)
