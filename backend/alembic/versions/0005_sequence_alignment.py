"""Repair sequences for existing Phase 2 explicit-ID seeds (no row changes)."""

from alembic import op
from app.db.sequences import align_sequences

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    align_sequences(
        op.get_bind(),
        [
            "users",
            "products",
            "product_images",
            "favorites",
            "wanted_posts",
            "chat_sessions",
            "chat_messages",
            "offers",
            "orders",
            "order_events",
            "meetups",
            "reviews",
            "reports",
            "notifications",
        ],
    )


def downgrade():
    # Lowering a sequence could collide with persistent user-created rows.
    pass
