# BP5 验证记录（verification，backend-platform）

> 证据文件：`docs/evidence/phase-5/backend-platform/verification.md`
> 维护人：M9 ｜ 汇集 BP5-06/07/08/09 全部验证证据
> 原则：只记录真实执行过的验证；未执行项明确标注"待执行"，不编造结果。

## 一、静态与脚本校验（开发环境，M9，已执行）

| 验证项 | 命令 | 结果 |
|---|---|---|
| 新增 python 脚本编译 | `py_compile`（verify_restore.py / api_bench.py） | ✅ 全部通过 |
| 新增 shell 脚本语法 | `bash -n`（verify_migrations.sh / db_backup.sh / db_restore.sh） | ✅ 全部通过 |
| ruff format（CI 锁定 0.8.4 口径） | `ruff format --check .`（backend，80 文件） | ✅ 全部已格式化（0.17.0 双口径复核同样通过） |
| ruff lint | `ruff check .` | ✅ 通过 |
| compose 配置语法 | `docker compose config -q` | 待补测（本机执行后打勾） |

## 二、任务验证登记（结果在各报告内，此处汇总状态）

| 任务 | 验证项 | 口径/命令 | 状态 | 报告位置 |
|---|---|---|---|---|
| BP5-06 | 非作者按 deployment-guide 一次完成部署 | 指南第二节步骤 1-4 + 验收清单 | 待执行 | deployment-guide.md |
| BP5-06 | 日志轮转配置核验 | `docker inspect ... LogConfig` | 待执行 | platform-test-report.md 第四节 |
| BP5-07 | 空库升级 + 唯一头 + 回滚复升 | `bash backend/scripts/verify_migrations.sh` | 待执行 | migration-release-report.md 第三节 |
| BP5-08 | 备份 + 恢复 + 26 表行数与状态链核对 | db_backup.sh → db_restore.sh → verify_restore.py --baseline | 待执行 | backup-recovery-report.md 第三、四节 |
| BP5-09 | 并发读基线（10 并发 × 100 请求） | `python backend/scripts/api_bench.py` | 待执行 | platform-test-report.md 第一节 |
| BP5-09 | worker/api 重启恢复 | restart + /healthz 心跳续接 | 待执行 | platform-test-report.md 第二节 |
| BP5-09 | 存储/磁盘水位 | `docker system df` + `df -h` | 待执行 | platform-test-report.md 第三节 |
| BP5-09 | 日志轮转实测 | inspect + 压测后体积 | 待执行 | platform-test-report.md 第四节 |

## 三、执行环境（执行后统一填写）

- 日期：待填
- 机器/系统：待填（Windows / Git Bash + Docker Desktop，与 BP2-09/BP4 同机）
- 检出的分支与提交号：待填（`git rev-parse --branch --short HEAD`）
- 依赖版本：requirements.txt 全锁定（见 deployment-guide.md 第一节）

## 四、已知未验证项声明

- 本阶段四项任务均含"待执行"实测项：脚本/文档已交付，实测在用户机器
  上按各报告步骤执行后回填——在全部回填前，不宣称 BP5-06~09 通过。
- 非作者部署走查（BP5-06 验收标准）需由 M5/M6 或 M10 任一人独立执行，
  M9 提供本指南与答疑。
- MinIO 对象文件不包含在 pg_dump 逻辑备份内（见 backup-recovery-report.md
  第四节）：是否纳入发布流程待 M1 确认范围，未确认前登记为遗留项。
