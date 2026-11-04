"""Persist account decisions and appeals without exposing internal reports."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

OLD_TYPES = "'MESSAGE','OFFER_RECEIVED','OFFER_ACCEPTED','OFFER_REJECTED','MATCH_FOUND','ORDER_STATUS_CHANGED','MEETUP_REMINDER','REVIEW_REQUEST','REPORT_RESULT'"


def upgrade():
    op.create_table(
        "account_decisions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("actor_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("facts", sa.String(2000), nullable=False),
        sa.Column("basis", sa.String(500), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True)),
        sa.Column("reference", JSONB),
        sa.Column("evidence", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("revocation_reason", sa.String(1000)),
        sa.CheckConstraint("action IN ('WARNING','DISABLE')", name="ck_action_enum"),
    )
    op.create_index(
        "ix_account_decisions_user_created", "account_decisions", ["user_id", "created_at"]
    )
    op.create_table(
        "account_appeals",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "decision_id",
            sa.BigInteger(),
            sa.ForeignKey("account_decisions.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("explanation", sa.String(2000), nullable=False),
        sa.Column("evidence", JSONB, nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("reviewed_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("review_reason", sa.String(1000)),
        sa.CheckConstraint("status IN ('PENDING','UPHELD','REVOKED')", name="ck_status_enum"),
    )
    op.create_index(
        "ix_account_appeals_status_created", "account_appeals", ["status", "created_at"]
    )
    op.drop_constraint(op.f("ck_notifications_type_enum"), "notifications", type_="check")
    op.create_check_constraint(
        op.f("ck_notifications_type_enum"),
        "notifications",
        f"type IN ({OLD_TYPES},'ACCOUNT_ACTION','APPEAL_RECEIVED','APPEAL_RESULT')",
    )
    # Old disabled accounts must also have an appealable record. Unknown facts/time
    # stay explicitly unknown rather than being invented from the processing time.
    op.execute("""
        INSERT INTO account_decisions
            (user_id, actor_id, action, reason, facts, basis, evidence, created_at)
        SELECT u.id, a.actor_id, 'DISABLE',
            left(coalesce(nullif(a.context->>'reason', ''), '历史账号禁用，原处理说明未记录。'), 500),
            '历史禁用未记录具体行为，请由管理员补充核实。',
            '历史人工处理记录，未记录详细规则依据。', '[]'::jsonb,
            coalesce(a.created_at, u.updated_at, now())
        FROM users u LEFT JOIN LATERAL (
            SELECT actor_id, context, created_at FROM auth_audits
            WHERE target_id=u.id AND event='admin_user_disabled'
            ORDER BY id DESC LIMIT 1
        ) a ON true
        WHERE u.role='USER' AND u.status='DISABLED'
    """)


def downgrade():
    if op.get_bind().scalar(sa.text("SELECT count(*) FROM account_decisions")):
        raise RuntimeError("Archive account decisions and appeals before downgrading 0012.")
    # Preserve the delivery and read state of existing notices when removing new types.
    op.execute(
        "UPDATE notifications SET type='REPORT_RESULT' WHERE type IN ('ACCOUNT_ACTION','APPEAL_RECEIVED','APPEAL_RESULT')"
    )
    op.drop_constraint(op.f("ck_notifications_type_enum"), "notifications", type_="check")
    op.create_check_constraint(
        op.f("ck_notifications_type_enum"), "notifications", f"type IN ({OLD_TYPES})"
    )
    op.drop_table("account_appeals")
    op.drop_table("account_decisions")
