"""Persist bounded admin operation context without copying private evidence."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("auth_audits", sa.Column("context", JSONB, nullable=False, server_default="{}"))
    op.create_index("ix_uploaded_objects_orphans", "uploaded_objects", ["purpose", "created_at"])
    op.create_index("ix_chat_messages_session_cursor", "chat_messages", ["session_id", "id"])
    op.create_index("ix_notifications_user_cursor", "notifications", ["user_id", "id"])


def downgrade():
    op.drop_index("ix_notifications_user_cursor", table_name="notifications")
    op.drop_index("ix_chat_messages_session_cursor", table_name="chat_messages")
    op.drop_index("ix_uploaded_objects_orphans", table_name="uploaded_objects")
    op.drop_column("auth_audits", "context")
