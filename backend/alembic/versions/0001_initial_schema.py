"""initial schema: all Phase 2 tables (BP2-07)
 
Revision ID: 0001
Revises:
Create Date: 2026-09-22
 
设计依据：
- ER 草图 docs/evidence/phase-1/backend-platform/er-candidate.md
- 契约 openapi/campusloop.v1.yaml v0.2.0-contract
 
回滚说明：
- downgrade 按依赖逆序删除全部本迁移创建的表；
- vector 扩展是共享资源，downgrade 不删除（重建库时由镜像/扩展自动管理）。
 
Review 记录：见 docs/evidence/phase-2/backend-platform/migration-review.md
"""
 
from __future__ import annotations
 
from collections.abc import Sequence
 
import sqlalchemy as sa
from pgvector.sqlalchemy import VECTOR
from sqlalchemy.dialects import postgresql
 
from alembic import op
 
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None
 
 
def upgrade() -> None:
    # pgvector 扩展（Compose 使用 pgvector/pgvector:pg16 镜像；本地需 CREATE EXTENSION）
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
 
    # ---- users（Owner: M5）----
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("nickname", sa.String(length=64), nullable=False),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column(
            "campus_email_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("role", sa.String(length=16), server_default=sa.text("'USER'"), nullable=False),
        sa.Column(
            "status", sa.String(length=16), server_default=sa.text("'ACTIVE'"), nullable=False
        ),
        sa.Column("bio", sa.String(length=500), nullable=True),
        sa.Column("rating_avg", sa.Numeric(2, 1), server_default=sa.text("0"), nullable=False),
        sa.Column("transaction_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
        sa.CheckConstraint("role IN ('USER', 'ADMIN')", name=op.f("ck_users_role_enum")),
        sa.CheckConstraint("status IN ('ACTIVE', 'DISABLED')", name=op.f("ck_users_status_enum")),
        sa.CheckConstraint(
            "rating_avg >= 0 AND rating_avg <= 5", name=op.f("ck_users_rating_range")
        ),
    )
    op.create_index("ix_users_role_status", "users", ["role", "status"])
 
    # ---- refresh_sessions（Owner: M5）----
    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_sessions_token_hash")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_refresh_sessions_user_id_users"),
        ),
    )
    op.create_index(
        "ix_refresh_sessions_user_active", "refresh_sessions", ["user_id", "revoked_at"]
    )
 
    # ---- products（Owner: M6；embedding 归 M7 写入）----
    op.create_table(
        "products",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("owner_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("condition", sa.String(length=16), nullable=False),
        sa.Column("brand", sa.String(length=64), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("original_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("campus_location", sa.String(length=128), nullable=True),
        sa.Column(
            "status", sa.String(length=16), server_default=sa.text("'ON_SALE'"), nullable=False
        ),
        sa.Column("attributes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("view_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("favorite_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("embedding", VECTOR(768), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], ondelete="RESTRICT", name=op.f("fk_products_owner_id_users")
        ),
        sa.CheckConstraint(
            "status IN ('ON_SALE', 'RESERVED', 'SOLD', 'HIDDEN')",
            name=op.f("ck_products_status_enum"),
        ),
        sa.CheckConstraint(
            "condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')",
            name=op.f("ck_products_condition_enum"),
        ),
        sa.CheckConstraint("price >= 0", name=op.f("ck_products_price_non_negative")),
        sa.CheckConstraint(
            "original_price IS NULL OR original_price >= price",
            name=op.f("ck_products_original_price_order"),
        ),
    )
    op.create_index("ix_products_owner_created", "products", ["owner_id", "created_at"])
    op.create_index("ix_products_status_category", "products", ["status", "category"])
 
    # ---- product_images ----
    op.create_table(
        "product_images",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_images")),
        sa.UniqueConstraint("product_id", "sort_order", name=op.f("uq_product_images_sort")),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="CASCADE",
            name=op.f("fk_product_images_product_id_products"),
        ),
    )
    op.create_index("ix_product_images_product", "product_images", ["product_id"])
 
    # ---- favorites ----
    op.create_table(
        "favorites",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_favorites")),
        sa.UniqueConstraint("user_id", "product_id", name=op.f("uq_favorites_user_product")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE", name=op.f("fk_favorites_user_id_users")
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="CASCADE",
            name=op.f("fk_favorites_product_id_products"),
        ),
    )
 
    # ---- wanted_posts ----
    op.create_table(
        "wanted_posts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("owner_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("budget_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("budget_max", sa.Numeric(10, 2), nullable=True),
        sa.Column("requirements", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=16), server_default=sa.text("'OPEN'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_wanted_posts")),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_wanted_posts_owner_id_users"),
        ),
        sa.CheckConstraint(
            "status IN ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED')",
            name=op.f("ck_wanted_posts_status_enum"),
        ),
        sa.CheckConstraint(
            "budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max",
            name=op.f("ck_wanted_posts_budget_order"),
        ),
        sa.CheckConstraint(
            "budget_min IS NULL OR budget_min >= 0",
            name=op.f("ck_wanted_posts_budget_min_non_negative"),
        ),
    )
    op.create_index("ix_wanted_posts_status_category", "wanted_posts", ["status", "category"])
    op.create_index("ix_wanted_posts_owner_created", "wanted_posts", ["owner_id", "created_at"])
 
    # ---- chat_sessions ----
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_type", sa.String(length=16), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=True),
        sa.Column("wanted_id", sa.BigInteger(), nullable=True),
        sa.Column("buyer_id", sa.BigInteger(), nullable=False),
        sa.Column("seller_id", sa.BigInteger(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_chat_sessions")),
        sa.UniqueConstraint(
            "session_type",
            "product_id",
            "buyer_id",
            "seller_id",
            name=op.f("uq_chat_sessions_product_scope"),
        ),
        sa.UniqueConstraint(
            "session_type",
            "wanted_id",
            "buyer_id",
            "seller_id",
            name=op.f("uq_chat_sessions_wanted_scope"),
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="SET NULL",
            name=op.f("fk_chat_sessions_product_id_products"),
        ),
        sa.ForeignKeyConstraint(
            ["wanted_id"],
            ["wanted_posts.id"],
            ondelete="SET NULL",
            name=op.f("fk_chat_sessions_wanted_id_wanted_posts"),
        ),
        sa.ForeignKeyConstraint(
            ["buyer_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_chat_sessions_buyer_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["seller_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_chat_sessions_seller_id_users"),
        ),
        sa.CheckConstraint(
            "session_type IN ('PRODUCT', 'WANTED')", name=op.f("ck_chat_sessions_type_enum")
        ),
        sa.CheckConstraint("buyer_id <> seller_id", name=op.f("ck_chat_sessions_not_self")),
    )
    op.create_index("ix_chat_sessions_buyer_last", "chat_sessions", ["buyer_id", "last_message_at"])
    op.create_index(
        "ix_chat_sessions_seller_last", "chat_sessions", ["seller_id", "last_message_at"]
    )
 
    # ---- chat_messages ----
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.BigInteger(), nullable=False),
        sa.Column("sender_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=16), server_default=sa.text("'TEXT'"), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("image_key", sa.String(length=512), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_chat_messages")),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["chat_sessions.id"],
            ondelete="CASCADE",
            name=op.f("fk_chat_messages_session_id_chat_sessions"),
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_chat_messages_sender_id_users"),
        ),
        sa.CheckConstraint(
            "kind IN ('TEXT', 'IMAGE', 'OFFER', 'ORDER_EVENT', 'SYSTEM')",
            name=op.f("ck_chat_messages_kind_enum"),
        ),
    )
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id", "id"])
 
    # ---- offers ----
    op.create_table(
        "offers",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.BigInteger(), nullable=False),
        sa.Column("buyer_id", sa.BigInteger(), nullable=False),
        sa.Column("seller_id", sa.BigInteger(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=True),
        sa.Column(
            "status", sa.String(length=16), server_default=sa.text("'PENDING'"), nullable=False
        ),
        sa.Column("idempotency_key", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_offers")),
        sa.UniqueConstraint(
            "session_id", "buyer_id", "idempotency_key", name=op.f("uq_offers_idempotency")
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["chat_sessions.id"],
            ondelete="CASCADE",
            name=op.f("fk_offers_session_id_chat_sessions"),
        ),
        sa.ForeignKeyConstraint(
            ["buyer_id"], ["users.id"], ondelete="RESTRICT", name=op.f("fk_offers_buyer_id_users")
        ),
        sa.ForeignKeyConstraint(
            ["seller_id"], ["users.id"], ondelete="RESTRICT", name=op.f("fk_offers_seller_id_users")
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED')",
            name=op.f("ck_offers_status_enum"),
        ),
        sa.CheckConstraint("amount >= 0", name=op.f("ck_offers_amount_non_negative")),
    )
    op.create_index("ix_offers_session_status", "offers", ["session_id", "status"])
 
    # ---- orders ----
    op.create_table(
        "orders",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("offer_id", sa.BigInteger(), nullable=True),
        sa.Column("buyer_id", sa.BigInteger(), nullable=False),
        sa.Column("seller_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default=sa.text("'PENDING_CONFIRM'"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "buyer_confirmed_complete",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "seller_confirmed_complete",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("cancelled_reason", sa.String(length=200), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_orders")),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="RESTRICT",
            name=op.f("fk_orders_product_id_products"),
        ),
        sa.ForeignKeyConstraint(
            ["offer_id"], ["offers.id"], ondelete="RESTRICT", name=op.f("fk_orders_offer_id_offers")
        ),
        sa.ForeignKeyConstraint(
            ["buyer_id"], ["users.id"], ondelete="RESTRICT", name=op.f("fk_orders_buyer_id_users")
        ),
        sa.ForeignKeyConstraint(
            ["seller_id"], ["users.id"], ondelete="RESTRICT", name=op.f("fk_orders_seller_id_users")
        ),
        sa.CheckConstraint(
            "status IN ('PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED', 'COMPLETED', 'CANCELLED', 'DISPUTED')",
            name=op.f("ck_orders_status_enum"),
        ),
        sa.CheckConstraint("amount >= 0", name=op.f("ck_orders_amount_non_negative")),
        sa.CheckConstraint("buyer_id <> seller_id", name=op.f("ck_orders_not_self_trade")),
    )
    op.create_index("ix_orders_buyer_created", "orders", ["buyer_id", "created_at"])
    op.create_index("ix_orders_seller_created", "orders", ["seller_id", "created_at"])
    op.create_index("ix_orders_product_status", "orders", ["product_id", "status"])
 
    # ---- order_events（不可变事件流）----
    op.create_table(
        "order_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.BigInteger(), nullable=False),
        sa.Column("from_status", sa.String(length=16), nullable=True),
        sa.Column("to_status", sa.String(length=16), nullable=False),
        sa.Column("operator_id", sa.BigInteger(), nullable=True),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order_events")),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="CASCADE",
            name=op.f("fk_order_events_order_id_orders"),
        ),
        sa.ForeignKeyConstraint(
            ["operator_id"],
            ["users.id"],
            ondelete="SET NULL",
            name=op.f("fk_order_events_operator_id_users"),
        ),
    )
    op.create_index("ix_order_events_order_id", "order_events", ["order_id", "id"])
 
    # ---- meetups（一单一约，版本化双方确认）----
    op.create_table(
        "meetups",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.BigInteger(), nullable=False),
        sa.Column("place", sa.String(length=128), nullable=False),
        sa.Column("proposed_slots", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("confirmed_slot", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status", sa.String(length=16), server_default=sa.text("'PROPOSED'"), nullable=False
        ),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "buyer_confirmed_version", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "seller_confirmed_version", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_meetups")),
        sa.UniqueConstraint("order_id", name=op.f("uq_meetups_order")),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], ondelete="CASCADE", name=op.f("fk_meetups_order_id_orders")
        ),
        sa.CheckConstraint(
            "status IN ('PROPOSED', 'CONFIRMED', 'COMPLETED', 'CANCELLED')",
            name=op.f("ck_meetups_status_enum"),
        ),
    )
 
    # ---- reviews ----
    op.create_table(
        "reviews",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.BigInteger(), nullable=False),
        sa.Column("reviewer_id", sa.BigInteger(), nullable=False),
        sa.Column("reviewee_id", sa.BigInteger(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reviews")),
        sa.UniqueConstraint("order_id", "reviewer_id", name=op.f("uq_reviews_order_reviewer")),
        sa.ForeignKeyConstraint(
            ["order_id"],
            ["orders.id"],
            ondelete="RESTRICT",
            name=op.f("fk_reviews_order_id_orders"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewer_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_reviews_reviewer_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["reviewee_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_reviews_reviewee_id_users"),
        ),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name=op.f("ck_reviews_rating_range")),
        sa.CheckConstraint("reviewer_id <> reviewee_id", name=op.f("ck_reviews_not_self_review")),
    )
    op.create_index("ix_reviews_reviewee_created", "reviews", ["reviewee_id", "created_at"])
 
    # ---- reports ----
    op.create_table(
        "reports",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("reporter_id", sa.BigInteger(), nullable=False),
        sa.Column("target_type", sa.String(length=16), nullable=False),
        sa.Column("target_id", sa.BigInteger(), nullable=False),
        sa.Column("reason", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "status", sa.String(length=16), server_default=sa.text("'PENDING'"), nullable=False
        ),
        sa.Column("handled_by", sa.BigInteger(), nullable=True),
        sa.Column("handled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reports")),
        sa.UniqueConstraint(
            "reporter_id",
            "target_type",
            "target_id",
            "reason",
            name=op.f("uq_reports_no_duplicate"),
        ),
        sa.ForeignKeyConstraint(
            ["reporter_id"],
            ["users.id"],
            ondelete="RESTRICT",
            name=op.f("fk_reports_reporter_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["handled_by"],
            ["users.id"],
            ondelete="SET NULL",
            name=op.f("fk_reports_handled_by_users"),
        ),
        sa.CheckConstraint(
            "target_type IN ('USER', 'PRODUCT', 'ORDER', 'CHAT_MESSAGE')",
            name=op.f("ck_reports_target_type_enum"),
        ),
        sa.CheckConstraint(
            "reason IN ('FAKE_PRODUCT', 'DESCRIPTION_MISMATCH', 'SPAM', 'ABNORMAL_PRICE', 'HARASSMENT', 'VIOLATION')",
            name=op.f("ck_reports_reason_enum"),
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED')",
            name=op.f("ck_reports_status_enum"),
        ),
    )
    op.create_index("ix_reports_status_created", "reports", ["status", "created_at"])
 
    # ---- notifications ----
    op.create_table(
        "notifications",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_notifications_user_id_users"),
        ),
        sa.CheckConstraint(
            "type IN ('MESSAGE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'MATCH_FOUND', "
            "'ORDER_STATUS_CHANGED', 'MEETUP_REMINDER', 'REVIEW_REQUEST', 'REPORT_RESULT')",
            name=op.f("ck_notifications_type_enum"),
        ),
    )
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "read_at"])
    op.create_index("ix_notifications_user_created", "notifications", ["user_id", "created_at"])
 
 
def downgrade() -> None:
    """按依赖逆序完整回滚（CI 会执行 downgrade 验证）。"""
    op.drop_table("notifications")
    op.drop_table("reports")
    op.drop_table("reviews")
    op.drop_table("meetups")
    op.drop_table("order_events")
    op.drop_table("orders")
    op.drop_table("offers")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("wanted_posts")
    op.drop_table("favorites")
    op.drop_table("product_images")
    op.drop_table("products")
    op.drop_table("refresh_sessions")
    op.drop_table("users")
    # 不删除 vector 扩展：共享资源，见文件头回滚说明
