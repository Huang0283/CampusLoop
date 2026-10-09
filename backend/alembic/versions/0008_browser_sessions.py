"""HttpOnly browser credentials; existing JSON-refresh families remain unchanged."""

import sqlalchemy as sa

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("auth_session_families", sa.Column("browser_token_hash", sa.String(64)))
    op.create_unique_constraint(
        "uq_browser_session_token", "auth_session_families", ["browser_token_hash"]
    )


def downgrade():
    op.drop_constraint("uq_browser_session_token", "auth_session_families", type_="unique")
    op.drop_column("auth_session_families", "browser_token_hash")
