"""Transactional matching outbox/current result and durable notification dedup."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "matching_jobs",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("event_key", sa.String(160), nullable=False),
        sa.Column("wanted_id", sa.BigInteger(), sa.ForeignKey("wanted_posts.id"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column(
            "available_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("last_error", sa.String(64)),
        sa.Column("result_version", sa.String(64)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("event_key", "wanted_id"),
        sa.CheckConstraint(
            "status IN ('PENDING','DONE','SKIPPED','FAILED')", name="matching_job_status"
        ),
    )
    op.create_index("ix_matching_jobs_ready", "matching_jobs", ["status", "available_at", "id"])
    op.create_table(
        "matching_results",
        sa.Column("wanted_id", sa.BigInteger(), sa.ForeignKey("wanted_posts.id"), primary_key=True),
        sa.Column("result_version", sa.String(64), nullable=False),
        sa.Column("facts", JSONB, nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "matching_notifications",
        sa.Column("wanted_id", sa.BigInteger(), sa.ForeignKey("wanted_posts.id"), primary_key=True),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("products.id"), primary_key=True),
        sa.Column(
            "notification_id", sa.BigInteger(), sa.ForeignKey("notifications.id"), nullable=False
        ),
        sa.Column("result_version", sa.String(64), nullable=False),
    )


def downgrade():
    op.drop_table("matching_notifications")
    op.drop_table("matching_results")
    op.drop_index("ix_matching_jobs_ready", table_name="matching_jobs")
    op.drop_table("matching_jobs")
