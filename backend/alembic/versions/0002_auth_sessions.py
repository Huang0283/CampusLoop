"""BP3-01/02: refresh families, private profile and transactional audit.

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name in ("school", "college", "major"):
        op.add_column("users", sa.Column(name, sa.String(80)))
    # Fail rather than silently merge users if normalization collides.
    op.execute("UPDATE users SET email = lower(trim(email))")
    op.create_index(
        "uq_users_normalized_email", "users", [sa.text("lower(trim(email))")], unique=True
    )
    op.create_table(
        "auth_session_families",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("revocation_reason", sa.String(32)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("refresh_window_started_at", sa.DateTime(timezone=True)),
        sa.Column("refresh_window_count", sa.Integer(), server_default="0", nullable=False),
        sa.UniqueConstraint("id", "user_id", name="uq_auth_family_user"),
    )
    op.create_index(
        "ix_auth_families_user_active", "auth_session_families", ["user_id", "revoked_at"]
    )
    op.add_column("refresh_sessions", sa.Column("family_id", sa.String(36)))
    op.add_column("refresh_sessions", sa.Column("consumed_at", sa.DateTime(timezone=True)))
    op.add_column("refresh_sessions", sa.Column("parent_id", sa.BigInteger()))
    op.create_foreign_key(
        "fk_refresh_family_user",
        "refresh_sessions",
        "auth_session_families",
        ["family_id", "user_id"],
        ["id", "user_id"],
    )
    op.create_foreign_key(
        "fk_refresh_parent", "refresh_sessions", "refresh_sessions", ["parent_id"], ["id"]
    )
    op.create_unique_constraint("uq_refresh_parent", "refresh_sessions", ["parent_id"])
    op.execute("UPDATE refresh_sessions SET revoked_at = now() WHERE revoked_at IS NULL")
    op.create_check_constraint(
        "ck_refresh_family_or_revoked",
        "refresh_sessions",
        "family_id IS NOT NULL OR revoked_at IS NOT NULL",
    )
    op.create_index(
        "uq_refresh_active_family",
        "refresh_sessions",
        ["family_id"],
        unique=True,
        postgresql_where=sa.text("consumed_at IS NULL AND revoked_at IS NULL"),
    )
    op.create_table(
        "auth_audits",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("actor_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("target_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("event", sa.String(48), nullable=False),
        sa.Column("request_id", sa.String(64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_auth_audit_created", "auth_audits", ["created_at"])


def downgrade() -> None:
    op.drop_table("auth_audits")
    op.drop_index("uq_refresh_active_family", "refresh_sessions")
    op.drop_constraint("ck_refresh_family_or_revoked", "refresh_sessions", type_="check")
    op.drop_constraint("uq_refresh_parent", "refresh_sessions", type_="unique")
    op.drop_constraint("fk_refresh_parent", "refresh_sessions", type_="foreignkey")
    op.drop_constraint("fk_refresh_family_user", "refresh_sessions", type_="foreignkey")
    for name in ("parent_id", "consumed_at", "family_id"):
        op.drop_column("refresh_sessions", name)
    op.drop_table("auth_session_families")
    op.drop_index("uq_users_normalized_email", "users")
    for name in ("school", "college", "major"):
        op.drop_column("users", name)
