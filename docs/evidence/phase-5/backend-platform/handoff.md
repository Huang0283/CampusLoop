# Phase 5 backend group: M6 and M9 records

2026-10-25: PR #122 conflict resolution retains both members' records below. M6 regression results do not certify M9 deployment, recovery or performance work. M9 pending checks remain pending. No stage approval is implied.

# M6 交接与验收边界

2026-10-25，M10。原任务 PR #121 已合并 `phase5/backend-release`，合并提交 `9bf23ff57d86b6c8b7c69a686a679f298e52c791`；本修复分支 `fix/m6-p5-acceptance` 合入 main `1b3385ac0df557ddf34d7d9d52d608a9c26e7df7` 的既有阶段成果。契约候选 `0.5.0-rc.1`，以修复 PR 最终 HEAD 为准。

## 已处理的旧缺口

- M5 管理员路由已从 main 接回；不再列为等待组员实现，过期 xfail 与路由跳过均移除。
- 真实数据库、双用户并发、WebSocket 重连和智能异常事实不变均已执行；最新严格检查见 verification.md。旧的无数据库结果只属历史，不用于本次结论。
- 原证据中的基线指纹/作者本地路径和死锁 before/after 为历史记录；本次内容指纹见 evidence/m6-acceptance-source-sha256.json。

## 接收清单

- M5/M10：读取 business-invariant-report.md，复验并发接受/完成/评价及同用户互斥，核对数据库事实数量。
- M7/M8/M9/M10：读取 realtime-ai-regression.md，确认错误/降级语义、陈旧事件过滤和专用发布环境重连。
- M2/M3/M4：使用本次 OpenAPI/SDK 编译和联调；核对登录会话、治理字段、价格与匹配显示，不以仅编译替代浏览器验收。
- M1/M9/M10：按 verification.md 在统一 P5 候选执行严格检查，再核对发布镜像、迁移、备份恢复、性能和版本标签。

## 仍需最终阶段接收

- 本修复 PR 评审并合并到后端组分支；整组汇总到 phase5/integration，再按阶段门禁进入 main。此时不关闭全组 Issue。
- M9 负责最终镜像/Compose/迁移/恢复/性能；本次未修改他的部署或迁移实现，只复用了 main 已验收文件。
- 前端与智能消费者在统一候选验收，最终上线数据/正式模型质量不由本次 fixture/RPC 注入证明。
- M1/M10 在课程最终提交前签署发布范围和缺陷清单；本报告不捏造“P0/P1=0”或代签。上一版提议的 10 月 24 日检查时间已过期，不再作为有效期限；实际截止以团队/课程为准。


---

# BP5 交接记录（handoff，backend-platform）

> 证据文件：`docs/evidence/phase-5/backend-platform/handoff.md`
> 维护人：M9 ｜ 对应任务：BP5-06/07/08/09 交付交接
> 原则：交接不依赖未合并分支；接收清单逐项可复现。

## 一、输入确认（阶段门禁）

| 输入 | 来源 | 状态 |
|---|---|---|
| BP-P4 功能冻结 | phase-4 收口（`phase4/*` 合并到 `main`） | 待填冻结提交号：`git rev-parse --short main` |
| 数据库/智能/前端最终契约与缺陷列表固定 | 各组 phase-4 handoff | 待 M1 汇总确认 |
| 小组集成分支 `phase5/backend-release` | M5 从 `phase5/integration` 创建 | 分支链接已登记于 Issue（见任务书） |

## 二、输出（接收人：M1/M10 与课程提交人）

| 输出 | 位置 | 提交号（合并后填写） |
|---|---|---|
| 发布部署指南 | `docs/evidence/phase-5/backend-platform/deployment-guide.md` | 待填 |
| 迁移验证脚本与报告 | `backend/scripts/verify_migrations.sh`、`migration-release-report.md` | 待填 |
| 备份/恢复/核对脚本与报告 | `backend/scripts/db_backup.sh`、`db_restore.sh`、`verify_restore.py`、`backup-recovery-report.md` | 待填 |
| 并发基线脚本与平台测试报告 | `backend/scripts/api_bench.py`、`platform-test-report.md` | 待填 |
| Compose 发布固化（含日志轮转） | `docker-compose.yml` | 待填 |
| 最终镜像/依赖/迁移版本记录 | `deployment-guide.md` 第一节、`migration-release-report.md` 第一节 | 迁移头 `0009` |

## 三、接收清单

| 接收动作 | 验收命令/场景 | 接收人 | 结论 |
|---|---|---|---|
| 干净环境按指南部署 | deployment-guide.md 第二节步骤 1-4 | M10（独立部署） | 待填 |
| 迁移验证复现 | `bash backend/scripts/verify_migrations.sh` | M10 | 待填 |
| 备份恢复复现 | db_backup.sh → db_restore.sh → verify_restore.py --baseline | M10 | 待填 |
| 并发/重启/磁盘/日志轮转复核 | platform-test-report.md 一至四节 | M10 | 待填 |
| 范围复核（冻结外零新增） | 对照 deliverables.md 与 `git diff main...phase5/backend-release --stat` | M1 | 待填 |

## 四、遗留与风险

| 项 | Owner | 影响 | 下一动作 | 截止 |
|---|---|---|---|---|
| MinIO 对象文件不在 pg_dump 范围 | M9 | 对象存储灾难恢复缺口 | 与 M1 确认是否纳入（mc mirror 方案）或登记为已知限制 | 最终提交前 |
| 各报告实测项待回填 | M9 | 未回填前不宣称通过 | 按 verification.md 第二节逐项执行 | 最终提交前 |
| 非作者部署走查 | M5/M6/M10 任一 | BP5-06 验收 | 独立执行 deployment-guide.md | 最终提交前 |

## 五、最终接收口径

- 证据、提交号和交接记录不依赖未合并分支（阶段收口 PR 合并 `main` 后统一填提交号）；
- MQ-P5 制作最终标签使用与本阶段验证相同的版本（compose 镜像 + 迁移头 0009 + requirements 锁定集）。
