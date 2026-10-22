#!/usr/bin/env bash
# BP5-08（M9）：PostgreSQL 全库逻辑备份（pg_dump 自定义格式 + sha256 校验和）。
#
# 用法（仓库根目录）：
#   bash backend/scripts/db_backup.sh [输出文件]
#   默认输出 backups/campusloop-<时间戳>.dump（目录自动创建）
#
# 说明：
# - 备份为逻辑全库（含观测表 ai_task_runs / worker_heartbeats），不中断服务；
# - 恢复用 db_restore.sh；恢复后行数核对用 verify_restore.py；
# - 备份前建议先保存行数基线：
#     python backend/scripts/verify_restore.py > backups/baseline-<时间戳>.json
# 退出码：0=成功；非 0=失败（输出带 [FAIL] 行）。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${1:-backups/campusloop-${TS}.dump}"
mkdir -p "$(dirname "$OUT")"

docker compose ps db 2>/dev/null | grep -q running \
  || { echo "[FAIL] db 容器未运行：先 docker compose up -d" >&2; exit 1; }

echo ">>> pg_dump（自定义格式 -Fc）-> ${OUT}"
docker compose exec -T db pg_dump -U campusloop -d campusloop -Fc > "$OUT"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT" > "$OUT.sha256"
  cat "$OUT.sha256"
fi
du -h "$OUT" 2>/dev/null || ls -lh "$OUT"

echo ">>> 备份完成：${OUT}"
echo ">>> 下一步（恢复演练）："
echo "    bash backend/scripts/db_restore.sh \"${OUT}\""
echo "    python backend/scripts/verify_restore.py --baseline backups/baseline-*.json"
