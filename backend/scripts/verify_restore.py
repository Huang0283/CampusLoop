"""BP5-08（M9）：恢复后数据核对脚本。

输出关键表行数快照（JSON），并可与备份前保存的基线逐表比对：

    备份前（保存基线）：
        python backend/scripts/verify_restore.py > backups/baseline-<ts>.json
    恢复后（比对）：
        python backend/scripts/verify_restore.py --baseline backups/baseline-<ts>.json

- 默认连接 DATABASE_URL 环境变量（容器内已注入；宿主机默认 localhost:5432）；
- 覆盖任务书要求核对的对象：用户、商品、订单事件、消息、智能结果，
  以及认证/幂等/匹配运行时等其余核心表；
- 退出码：0=一致（或未提供基线，仅打印快照）；1=行数不一致；2=连接失败。
仅使用项目已锁定依赖（psycopg），不新增依赖。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys

# 与任务书 BP5-08 验收口径对应的核对清单（26 张表按域分组，全覆盖）。
TABLES: list[str] = [
    # 认证与用户
    "users",
    "auth_session_families",
    "auth_audits",
    "refresh_sessions",
    # 商品与求购
    "products",
    "product_images",
    "wanted_posts",
    "favorites",
    "uploaded_objects",
    # 交易
    "offers",
    "orders",
    "order_events",
    "meetups",
    "reviews",
    "notifications",
    "reports",
    # 消息
    "chat_sessions",
    "chat_messages",
    "chat_read_cursors",
    # 匹配与智能结果（BP4）
    "matching_jobs",
    "matching_results",
    "matching_notifications",
    "matching_revision",
    "ai_task_runs",
    "worker_heartbeats",
    # 运行时
    "idempotency_records",
]

DEFAULT_URL = "postgresql+psycopg://campusloop:campusloop@localhost:5432/campusloop"


def digest(value) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def fetch_snapshot() -> dict:
    """连接数据库并返回 {alembic_version, tables: {表: 行数}} 快照。"""
    import psycopg

    url = os.environ.get("DATABASE_URL", DEFAULT_URL)
    # 归一化：compose 注入的 DATABASE_URL 为 SQLAlchemy 风格 scheme
    # （postgresql+psycopg://），psycopg.connect 需要标准 libpq scheme，
    # 剥离驱动段后两种形态均可连接。
    url = url.replace("postgresql+psycopg://", "postgresql://", 1)
    # 宿主机直连用 5432 端口的 psycopg URL；容器内 DATABASE_URL 同为 psycopg scheme。
    try:
        with psycopg.connect(url) as conn, conn.cursor() as cur:
            cur.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
            cur.execute("SELECT version_num FROM alembic_version;")
            row = cur.fetchone()
            version = row[0] if row else None
            tables: dict[str, int | None] = {}
            content_hashes = {}
            for table in TABLES:
                cur.execute(
                    "SELECT count(*) FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = %s;",
                    (table,),
                )
                if cur.fetchone()[0] == 0:
                    raise ValueError(f"Required recovery table missing: {table}")
                cur.execute(f'SELECT count(*) FROM "{table}";')  # noqa: S608（表名白名单）
                tables[table] = int(cur.fetchone()[0])
                cur.execute(f'SELECT row_to_json(t)::text FROM "{table}" AS t;')
                # Hash each complete row, then sort hashes: identity and state changes
                # are detected without saving private row contents in the evidence.
                content_hashes[table] = digest(sorted(digest(json.loads(row[0])) for row in cur))
            cur.execute(
                "SELECT c.relname, x.conname, pg_get_constraintdef(x.oid) "
                "FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid "
                "JOIN pg_namespace n ON n.oid=c.relnamespace "
                "WHERE n.nspname='public' ORDER BY c.relname,x.conname"
            )
            constraints = cur.fetchall()
            cur.execute(
                "SELECT tablename,indexname,indexdef FROM pg_indexes "
                "WHERE schemaname='public' ORDER BY tablename,indexname"
            )
            schema_hash = digest({"constraints": constraints, "indexes": cur.fetchall()})
    except Exception as exc:  # noqa: BLE001（命令行工具需打印可读错误）
        print(f"[FAIL] 数据库连接失败：{exc}", file=sys.stderr)
        raise SystemExit(2) from exc
    return {
        "formatVersion": 2,
        "alembic_version": version,
        "tables": tables,
        "contentHashes": content_hashes,
        "schemaSha256": schema_hash,
    }


def compare(snapshot: dict, baseline: dict) -> list[str]:
    """逐表比对，返回差异描述列表（空列表 = 一致）。"""
    diffs: list[str] = []
    if baseline.get("formatVersion") != 2 or snapshot.get("formatVersion") != 2:
        diffs.append("Recovery baseline must be regenerated with snapshot formatVersion=2.")
    if not baseline.get("schemaSha256") or baseline.get("schemaSha256") != snapshot.get(
        "schemaSha256"
    ):
        diffs.append("Constraint/index definitions differ or are missing.")
    if snapshot.get("alembic_version") != baseline.get("alembic_version"):
        diffs.append(
            f"alembic_version: 备份前={baseline.get('alembic_version')} "
            f"恢复后={snapshot.get('alembic_version')}"
        )
    base_tables: dict = baseline.get("tables", {})
    for table in TABLES:
        before = base_tables.get(table)
        after = snapshot.get("tables", {}).get(table)
        if before is None or after is None:
            diffs.append(f"Required table absent from recovery/baseline: {table}")
        if before != after:
            diffs.append(f"{table}: 备份前={before} 恢复后={after}")
        expected_hash = baseline.get("contentHashes", {}).get(table)
        if not expected_hash or expected_hash != snapshot.get("contentHashes", {}).get(table):
            diffs.append(f"{table}: complete-row content hash differs or is missing.")
    return diffs


def main() -> None:
    parser = argparse.ArgumentParser(description="恢复后关键表行数核对")
    parser.add_argument(
        "--baseline",
        help="备份前保存的基线 JSON 文件路径；提供则逐表比对并按结果设置退出码",
    )
    args = parser.parse_args()

    snapshot = fetch_snapshot()
    print(json.dumps(snapshot, ensure_ascii=False, indent=2))

    if not args.baseline:
        # 提示走 stderr：stdout 仅输出 JSON，保证 `> baseline.json` 重定向
        # 得到可被 json.load 直接解析的纯 JSON。
        print(
            "[提示] 未提供 --baseline，仅输出快照。备份前请保存本输出作为基线。",
            file=sys.stderr,
        )
        return

    with open(args.baseline, encoding="utf-8") as fh:
        baseline = json.load(fh)

    diffs = compare(snapshot, baseline)
    if diffs:
        print(f"[FAIL] 恢复后与备份前不一致（{len(diffs)} 项差异）：", file=sys.stderr)
        for line in diffs:
            print(f"  - {line}", file=sys.stderr)
        raise SystemExit(1)
    print(f"[OK] {len(TABLES)} tables: counts, content, constraints/indexes and migration match.")


if __name__ == "__main__":
    main()
