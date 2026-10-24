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
