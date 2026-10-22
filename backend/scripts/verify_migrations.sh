#!/usr/bin/env bash
# BP5-07（M9）：发布前迁移验证——空库升级、迁移头唯一性校验、全链回滚、复升。
#
# 约定（沿用 phase-3 database-performance-review）：回滚只在专用临时库
# campusloop_p5_migcheck 上执行，绝不触碰开发/演示/用户数据库。
# 临时库与正式库同实例（compose db 容器），脚本结束时自动删除。
#
# 用法（仓库根目录）：
#   bash backend/scripts/verify_migrations.sh
# 保存完整输出供报告引用：
#   bash backend/scripts/verify_migrations.sh 2>&1 | tee migration-verify.log
# 前置：docker compose up -d 且 api/db 容器 healthy。
# 退出码：0=全部通过；非 0=对应步骤失败（输出中带 [FAIL] 行）。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

DB_SERVICE="db"
APP_SERVICE="api"
CHECK_DB="campusloop_p5_migcheck"
DB_USER="campusloop"
CHECK_URL="postgresql+psycopg://campusloop:campusloop@db:5432/${CHECK_DB}"

log() { printf '\n===== %s =====\n' "$*"; }
fail() { printf '\n[FAIL] %s\n' "$*" >&2; exit 1; }

docker compose ps "$APP_SERVICE" 2>/dev/null | grep -q running \
  || fail "api 容器未运行：先执行 docker compose up -d 并等 healthy"

cleanup() {
  log "清理：删除临时库 ${CHECK_DB}"
  docker compose exec -T "$DB_SERVICE" \
    psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${CHECK_DB};" \
    >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "0/5 重建专用迁移验证库 ${CHECK_DB}"
docker compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${CHECK_DB};" -c "CREATE DATABASE ${CHECK_DB};" \
  || fail "临时库创建失败"

run_alembic() {
  docker compose exec -T -e DATABASE_URL="$CHECK_URL" "$APP_SERVICE" alembic "$@"
}

current_rev() {
  # alembic current/heads 输出形如 "0009 (head)"；提取纯 revision id。
  run_alembic "$@" 2>/dev/null | grep -oE '^[0-9a-f]+' | head -1 || true
}

log "1/5 空库升级 alembic upgrade head"
run_alembic upgrade head || fail "空库升级失败（检查迁移链 0001..head 是否可从零构建）"

log "2/5 迁移头唯一性校验"
HEADS_OUT="$(run_alembic heads)"
HEAD_COUNT="$(printf '%s\n' "$HEADS_OUT" | grep -c . || true)"
[ "$HEAD_COUNT" -eq 1 ] || fail "存在 ${HEAD_COUNT} 个迁移头（要求恰好 1 个）：${HEADS_OUT}"
HEAD_ID="$(current_rev heads)"
[ -n "$HEAD_ID" ] || fail "未能从 heads 输出解析 revision id：${HEADS_OUT}"
CURRENT_ID="$(current_rev current)"
[ "$CURRENT_ID" = "$HEAD_ID" ] || fail "current(${CURRENT_ID}) != head(${HEAD_ID})"
echo "单头通过：current = ${HEAD_ID}（唯一迁移头）"

log "3/5 全链回滚 alembic downgrade base"
run_alembic downgrade base || fail "回滚失败（检查 downgrade 路径是否完整实现）"
LEFT_ID="$(current_rev current)"
[ -z "$LEFT_ID" ] || fail "回滚后仍有版本残留：${LEFT_ID}"
echo "回滚后 current 为空 ✓（表结构应已全部清除）"

log "4/5 复升 alembic upgrade head"
run_alembic upgrade head || fail "复升失败"
RERAISE_ID="$(current_rev current)"
[ "$RERAISE_ID" = "$HEAD_ID" ] || fail "复升后 current(${RERAISE_ID}) != head(${HEAD_ID})"

log "5/5 结论"
echo "迁移验证全部通过："
echo "  空库 upgrade head ✓   唯一迁移头 ${HEAD_ID} ✓"
echo "  downgrade base ✓      复升到 ${HEAD_ID} ✓"
echo "请将本输出全文粘贴进 docs/evidence/phase-5/backend-platform/migration-release-report.md。"
