#!/usr/bin/env bash
# BP5-08（M9）：从 pg_dump 自定义格式备份恢复 campusloop 库。
#
# 用法（仓库根目录）：
#   bash backend/scripts/db_restore.sh backups/campusloop-<时间戳>.dump
#
# 警告：
# - 本脚本会 DROP 并重建 campusloop 库（发布验收/演练专用）；
# - 恢复期间 api/worker 的数据库连接会被断开，容器将自动重连；
#   若个别请求短时报错，属预期，待步骤 3/4 通过后即恢复。
# 退出码：0=恢复成功；非 0=失败（输出带 [FAIL] 行）。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

DUMP="${1:?用法: db_restore.sh <dump 文件>}"
[ -f "$DUMP" ] || { echo "[FAIL] 备份文件不存在: ${DUMP}" >&2; exit 1; }

docker compose ps db 2>/dev/null | grep -qE ' Up ' \
  || { echo "[FAIL] db 容器未运行：先 docker compose up -d" >&2; exit 1; }

echo ">>> 0/4 备份完整性自检（pg_restore --list 前 5 行）"
docker compose exec -T db pg_restore --list < "$DUMP" | head -5 \
  || { echo "[FAIL] 备份文件损坏或不完整，停止恢复" >&2; exit 1; }

echo ">>> 1/4 断开现有连接，DROP / CREATE campusloop"
docker compose exec -T db psql -U campusloop -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'campusloop' AND pid <> pg_backend_pid();"
docker compose exec -T db psql -U campusloop -d postgres -v ON_ERROR_STOP=1 \
  -c 'DROP DATABASE IF EXISTS campusloop;' -c 'CREATE DATABASE campusloop;'

echo ">>> 2/4 pg_restore 全量恢复（--no-owner）"
docker compose exec -T db pg_restore -U campusloop -d campusloop --no-owner < "$DUMP"

echo ">>> 3/4 校验迁移版本（应等于发布头，如 0009）"
ALEMBIC_VER="$(docker compose exec -T db psql -U campusloop -d campusloop \
  -tAc 'SELECT version_num FROM alembic_version;')"
echo "alembic_version = ${ALEMBIC_VER}"
[ -n "$ALEMBIC_VER" ] || { echo "[FAIL] 恢复后 alembic_version 为空" >&2; exit 1; }

echo ">>> 4/4 行数快照核对（与备份前基线逐表比对）"
BASELINE="$(ls -t backups/baseline-*.json 2>/dev/null | head -1 || true)"
if [ -z "$BASELINE" ]; then
  echo "[提示] 未找到 backups/baseline-*.json，跳过自动比对。" \
       "完整验收需在备份前先生成基线（deployment-guide 2.4）" >&2
elif python -c 'import psycopg' 2>/dev/null; then
  # 宿主机 python 已具备 psycopg（全局或 venv）
  python backend/scripts/verify_restore.py --baseline "$BASELINE" \
    && echo ">>> 行数与备份前基线一致 ✓" \
    || { echo ">>> 行数核对未通过，请检查上方明细" >&2; exit 1; }
else
  # 宿主机缺 psycopg（例如 Python 3.14 无 3.2.3 预编译包）：回退到 api 容器内核对
  echo "[提示] 宿主机 python 缺 psycopg，改用 api 容器内核对"
  docker compose cp "$BASELINE" api:/tmp/verify-baseline.json
  # MSYS_NO_PATHCONV / MSYS2_ARG_CONV_EXCL：Git Bash (MSYS2) 会把独立参数
  # "/tmp/..." 自动改写成 Windows %TEMP% 路径再传给 docker.exe，导致容器内
  # 打开 C:/Users/.../verify-baseline.json 失败（Linux/Mac 设置无副作用）。
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' \
    docker compose exec -T api python scripts/verify_restore.py --baseline /tmp/verify-baseline.json \
    && echo ">>> 行数与备份前基线一致 ✓" \
    || { echo ">>> 行数核对未通过，请检查上方明细" >&2; exit 1; }
fi

echo ">>> 恢复完成：dump=${DUMP}，alembic_version=${ALEMBIC_VER}"
echo ">>> 建议执行 docker compose restart api worker 使应用侧连接池干净重建。"
