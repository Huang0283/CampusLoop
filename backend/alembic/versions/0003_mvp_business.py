"""BP3-04 through BP3-11: durable writes, idempotency and transaction invariants."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("deleted_at", sa.DateTime(timezone=True)))
    op.add_column("wanted_posts", sa.Column("expires_at", sa.DateTime(timezone=True)))
    op.add_column("offers", sa.Column("proposer_id", sa.BigInteger(), sa.ForeignKey("users.id")))
    op.add_column(
        "offers", sa.Column("countered_by_offer_id", sa.BigInteger(), sa.ForeignKey("offers.id"))
    )
    op.execute("UPDATE offers SET proposer_id=buyer_id")
    op.alter_column("offers", "proposer_id", nullable=False)
    op.create_check_constraint(
        "ck_offer_proposer_participant", "offers", "proposer_id IN (buyer_id, seller_id)"
    )
    op.create_unique_constraint("uq_order_offer", "orders", ["offer_id"])
    op.create_index(
        "uq_order_active_product",
        "orders",
        ["product_id"],
        unique=True,
        postgresql_where=sa.text("status NOT IN ('CANCELLED', 'DISPUTED')"),
    )
    op.add_column("chat_messages", sa.Column("client_msg_id", sa.String(36)))
    op.execute(
        "UPDATE chat_messages SET client_msg_id = md5('legacy-message-' || id::text)::uuid::text"
    )
    op.alter_column("chat_messages", "client_msg_id", nullable=False)
    op.create_unique_constraint(
        "uq_message_client_id", "chat_messages", ["sender_id", "client_msg_id"]
    )
    for name in ("description_accuracy", "communication", "punctuality"):
        op.add_column("reviews", sa.Column(name, sa.Integer()))
        op.execute(f"UPDATE reviews SET {name}=rating")
        op.alter_column("reviews", name, nullable=False)
        op.create_check_constraint(f"ck_review_{name}", "reviews", f"{name} BETWEEN 1 AND 5")
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("actor_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("scope", sa.String(128), nullable=False),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("input_hash", sa.String(64), nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("actor_id", "scope", "key"),
    )
    op.create_table(
        "uploaded_objects",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("owner_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("object_key", sa.String(512), unique=True, nullable=False),
        sa.Column("purpose", sa.String(16), nullable=False),
        sa.Column("content_type", sa.String(32), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "chat_read_cursors",
        sa.Column(
            "session_id", sa.BigInteger(), sa.ForeignKey("chat_sessions.id"), primary_key=True
        ),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("last_message_id", sa.BigInteger(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    for table in ("chat_read_cursors", "uploaded_objects", "idempotency_records"):
        op.drop_table(table)
    for name in ("description_accuracy", "communication", "punctuality"):
        op.drop_constraint(f"ck_review_{name}", "reviews", type_="check")
        op.drop_column("reviews", name)
    op.drop_constraint("uq_message_client_id", "chat_messages", type_="unique")
    op.drop_column("chat_messages", "client_msg_id")
    op.drop_index("uq_order_active_product", "orders")
    op.drop_constraint("uq_order_offer", "orders", type_="unique")
    op.drop_constraint("ck_offer_proposer_participant", "offers", type_="check")
    op.drop_column("offers", "countered_by_offer_id")
    op.drop_column("offers", "proposer_id")
    op.drop_column("wanted_posts", "expires_at")
    op.drop_column("products", "deleted_at")
