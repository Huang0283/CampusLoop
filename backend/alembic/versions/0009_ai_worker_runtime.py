"""BP4-07/08（M9）：AI 任务运行观测表 + 求购匹配向量索引。

内容：
- ai_task_runs：worker 每次任务执行的观测流水（输入版本/处理运行时/失败原因/
  重试次数/耗时），直接支撑 Issue BP4-08 验收标准；只追加不更新。
- worker_heartbeats：worker 实例心跳与累计计数（每实例一行，UPSERT 维护）。
- ix_products_embedding_hnsw：products.embedding（VECTOR(768)，0001 预留、
  nullable）的 HNSW 余弦距离索引。空列建索引安全（HNSW 忽略 NULL）；
  M7/M8 写入向量后立即被索引覆盖，无需再次迁移。

回滚说明：
- downgrade 按依赖逆序删除两表与索引；vector 扩展是共享资源，不删除
  （与 0001 文件头惯例一致，重建库时由镜像/扩展自动管理）。
- ai_task_runs 是审计数据：downgrade 即放弃观测历史，属预期行为（观测表
  不承载业务事实，删除不影响 MVP 数据——这正是 BP4-09 验收要求的隔离）。
"""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_task_runs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("task_type", sa.String(64), nullable=False),
        sa.Column("task_id", sa.BigInteger()),
        sa.Column("event_key", sa.String(160)),
        sa.Column("wanted_id", sa.BigInteger()),
        sa.Column("outcome", sa.String(16), nullable=False),
        sa.Column("error_code", sa.String(64)),
        sa.Column("result_version", sa.String(64)),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("worker_id", sa.String(128), nullable=False),
        sa.Column("worker_version", sa.String(64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_task_runs_type_created", "ai_task_runs", ["task_type", "created_at"])
    op.create_index("ix_ai_task_runs_task_id", "ai_task_runs", ["task_id"])
    op.create_index("ix_ai_task_runs_outcome", "ai_task_runs", ["outcome"])
    op.create_index("ix_ai_task_runs_event_key", "ai_task_runs", ["event_key"])

    op.create_table(
        "worker_heartbeats",
        sa.Column("worker_id", sa.String(128), nullable=False),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("pid", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_beat_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("runs_total", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column("runs_failed", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.PrimaryKeyConstraint("worker_id"),
    )

    # pgvector HNSW：余弦距离语义（与候选排序的相似度口径一致），固定参数
    # m=16 / ef_construction=64（pgvector 默认，记录在案便于 Phase 5 调优评审）。
    op.create_index(
        "ix_products_embedding_hnsw",
        "products",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
        postgresql_with={"m": "16", "ef_construction": "64"},
    )


def downgrade():
    op.drop_index("ix_products_embedding_hnsw", table_name="products")
    op.drop_table("worker_heartbeats")
    op.drop_index("ix_ai_task_runs_event_key", table_name="ai_task_runs")
    op.drop_index("ix_ai_task_runs_outcome", table_name="ai_task_runs")
    op.drop_index("ix_ai_task_runs_task_id", table_name="ai_task_runs")
    op.drop_index("ix_ai_task_runs_type_created", table_name="ai_task_runs")
    op.drop_table("ai_task_runs")
