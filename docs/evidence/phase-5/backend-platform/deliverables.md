# Phase 5 backend group: M6 and M9 records

2026-10-25: PR #122 conflict resolution retains both members' records below. M6 regression results do not certify M9 deployment, recovery or performance work. M9 pending checks remain pending. No stage approval is implied.

# Phase 5 后端交付清单：M6 部分

2026-10-25，M10 复验更新；原任务 PR #121、修复分支 `fix/m6-p5-acceptance`。候选契约 `0.5.0-rc.1`，版本详情见 handoff.md。

- BP5-03：business-invariant-report.md；auth.py 并发锁、business.py 幂等键、transactions.py 游标；test_auth_locking.py、test_p5_business_contract.py、test_p5_integration.py 及原交易测试。
- BP5-04：realtime-ai-regression.md；保留 main 智能/匹配/监控和 M6 缺失分数字段校验；真实 WS 重连补拉与智能异常事实不变测试，原智能/队列/媒体测试。
- BP5-05：final-api-documentation.md；完整 OpenAPI/自动生成 SDK、examples/m6-api-examples.json、全部路由/枚举/样例测试。管理员路由不再跳过，不再 xfail。
- 复验工具：scripts/m6_phase5/verify.py，严格模式拒绝 skip/xfail；最新日志/JUnit/检查摘要位于 evidence/，详细结果见 verification.md。
- BP5-10 的 M6 部分：verification.md、release-verification.md、handoff.md。发布签收和其他成员范围不由本清单替代。

源码和测试保留所属目录。M5/M9 的完整交付、统一阶段镜像/标签、跨组验收需由最终 P5 集成提交补齐，不据此关闭全组 Issue。


---

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
