"""Expose a human resolution note to the reporter without leaking internal audit data."""

import sqlalchemy as sa

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("reports", sa.Column("resolution_note", sa.String(length=1000), nullable=True))


def downgrade():
    op.drop_column("reports", "resolution_note")
