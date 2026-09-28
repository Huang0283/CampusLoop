"""商品、图片与收藏模型（Owner: M6 设计 / M9 落库，BP2-07）。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ProductStatus
from app.models.mixins import TimestampMixin


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    condition: Mapped[str] = mapped_column(String(16), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # 金额一律 NUMERIC(10,2)，禁止浮点
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    original_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    campus_location: Mapped[str] = mapped_column(String(128), nullable=False, default="主校区")
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ProductStatus.ON_SALE.value
    )
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Phase 4 语义检索列（Owner: M7/M8 写入；M9 只负责扩展与列）
    # 维度 768 为候选，M7 选型后如改 1024 需要一次迁移
    embedding: Mapped[Any] = mapped_column(Vector(768), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('ON_SALE', 'RESERVED', 'SOLD', 'HIDDEN')", name="ck_status_enum"
        ),
        CheckConstraint("price >= 0", name="ck_price_non_negative"),
        Index("ix_products_owner_created", "owner_id", "created_at"),
        Index("ix_products_status_category", "status", "category"),
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    # MinIO 对象键（不含公共前缀），URL 由 API 层拼接 s3_public_base_url
    object_key: Mapped[str] = mapped_column(String(512), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("product_id", "sort_order", name="uq_product_images_sort"),
        Index("ix_product_images_product", "product_id"),
    )


class Favorite(TimestampMixin, Base):
    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        # 防重复收藏：应用层捕获唯一冲突返回 409（契约 FAVORITE_DUPLICATED）
        UniqueConstraint("user_id", "product_id", name="uq_favorites_user_product"),
    )
