"""Keep duplicate protection for open reports while preserving handled history."""

import sqlalchemy as sa

from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("uq_reports_no_duplicate", "reports", type_="unique")
    op.create_index(
        "uq_reports_no_duplicate",
        "reports",
        ["reporter_id", "target_type", "target_id", "reason"],
        unique=True,
        postgresql_where=sa.text("status IN ('PENDING', 'PROCESSING')"),
    )


def downgrade():
    # The old schema cannot represent multiple handled reports; never erase that history.
    repeated = op.get_bind().scalar(
        sa.text(
            "SELECT 1 FROM reports GROUP BY reporter_id, target_type, target_id, reason "
            "HAVING count(*) > 1 LIMIT 1"
        )
    )
    if repeated:
        raise RuntimeError(
            "Cannot restore lifetime report uniqueness without losing report history."
        )
    op.drop_index("uq_reports_no_duplicate", table_name="reports")
    op.create_unique_constraint(
        "uq_reports_no_duplicate",
        "reports",
        ["reporter_id", "target_type", "target_id", "reason"],
    )
