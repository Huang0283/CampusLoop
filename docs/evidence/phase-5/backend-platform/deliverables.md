# BP5 交付物登记（deliverables，backend-platform）

> 证据文件：`docs/evidence/phase-5/backend-platform/deliverables.md`
> 维护人：M9 ｜ 对应任务：BP5-06/07/08/09（安全、恢复与部署交付）
> 原则：只登记真实存在的交付物；状态与验证结论以 verification.md 为准。

## 一、任务与交付物对照

| 任务 | 交付物 | 位置 | 状态 |
|---|---|---|---|
| BP5-06 部署固化 | 干净环境部署指南（发布版） | `docs/evidence/phase-5/backend-platform/deployment-guide.md` | 已交付，非作者走查待执行 |
| BP5-06 部署固化 | Compose 固化：镜像 tag/端口/卷/健康检查 + 全服务日志轮转配置 | `docker-compose.yml` | 已交付 |
| BP5-06 部署固化 | 依赖全锁定（19 运行 + 3 开发，全部 `==`） | `backend/requirements.txt` | 已交付（BP2-06 起维持） |
| BP5-07 迁移验证 | 迁移验证脚本（空库升级/唯一头/回滚/复升，专用临时库） | `backend/scripts/verify_migrations.sh` | 已交付，实测待执行 |
| BP5-07 迁移验证 | 迁移发布报告（含失败恢复步骤） | `docs/evidence/phase-5/backend-platform/migration-release-report.md` | 骨架就绪，结果待实测 |
| BP5-08 备份恢复 | 全库备份脚本（pg_dump -Fc + sha256） | `backend/scripts/db_backup.sh` | 已交付，实测待执行 |
| BP5-08 备份恢复 | 恢复脚本（自检/重建/恢复/版本核对） | `backend/scripts/db_restore.sh` | 已交付，实测待执行 |
| BP5-08 备份恢复 | 恢复核对脚本（26 表行数快照 + 基线比对） | `backend/scripts/verify_restore.py` | 已交付，实测待执行 |
| BP5-08 备份恢复 | 备份与恢复报告（含状态链抽样 SQL） | `docs/evidence/phase-5/backend-platform/backup-recovery-report.md` | 骨架就绪，结果待实测 |
| BP5-09 平台测试 | API 并发读基线脚本（标准库，10×100 口径） | `backend/scripts/api_bench.py` | 已交付，实测待执行 |
| BP5-09 平台测试 | 平台测试报告（并发/重启/磁盘/日志轮转） | `docs/evidence/phase-5/backend-platform/platform-test-report.md` | 骨架就绪，结果待实测 |

## 二、阶段说明

- 本阶段为发布候选加固：**不新增业务能力、不新增表和接口**；
  全部新增物为部署/验证脚本与文档，均在 M9 独占范围
  （迁移、Compose、备份恢复、磁盘与性能脚本）。
- 新增脚本零新增依赖：python 脚本仅用标准库与已锁定依赖（psycopg），
  shell 脚本仅用 Docker/Git Bash 自带工具（date/sha256sum/du 等）。
- 日志轮转为 compose 配置变更（BP5-09 前置），影响面：日志磁盘占用上限。

## 三、交接

输入确认、输出与接收清单见 `handoff.md`；验证结果汇总见 `verification.md`。
