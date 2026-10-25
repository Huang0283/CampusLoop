"""Keep a human moderation hold distinct from an owner's ordinary hiding."""

import sqlalchemy as sa

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "products",
        sa.Column("moderation_blocked", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    # Do not downgrade while active holds exist: dropping the flag would allow
    # an owner to republish a listing still under administrator review.
    blocked = op.get_bind().scalar(
        sa.text("SELECT count(*) FROM products WHERE moderation_blocked AND deleted_at IS NULL")
    )
    if blocked:
        raise RuntimeError("Resolve product moderation holds before downgrading 0010.")
    op.drop_column("products", "moderation_blocked")
