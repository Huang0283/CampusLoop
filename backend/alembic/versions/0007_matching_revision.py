"""Authoritative catalog/authorization revision for conditional result writes."""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "matching_revision",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("value", sa.BigInteger(), nullable=False),
    )
    op.execute("INSERT INTO matching_revision (id, value) VALUES (1, 1)")


def downgrade():
    op.drop_table("matching_revision")
