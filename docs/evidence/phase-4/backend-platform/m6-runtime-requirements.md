# M6 → M9：任务、持久化与运行接收要求

沿用现有 matching_jobs、matching_results、matching_notifications、matching_revision，
本次不新增表/列/枚举，未编辑 Alembic、Compose、Worker入口或监控配置。
matching_results.facts 新增 inputRevision/wantedVersion 是可选 JSON 字段，无需结构迁移。
老结果不回填，新业务 API 不直接公开旧缓存；M9负责实际升级/回滚与历史兼容验证。

请 M9 从 M6 PR 合入后的组分支接收，保留以下约束：

- 唯一索引 `(event_key, wanted_id)`；结果 wanted_id 主键；通知 `(wanted_id, product_id)` 主键。
- matching_revision 必须预先有 id=1 的行；沿用0006/0007迁移，不能跳过迁移。
- PostgreSQL为任务/结果/通知事实源。Redis等仅辅助，队列重投不得绕过数据库幂等。
- Worker领取与领域处理同一事务；SKIP LOCKED、崩溃回滚、所有重试路径五次上限。
- 延迟旧事件重算当前事实；监测FAILED、STALE_INPUT、attempts、available_at、result_version。
- 新事件键与历史事件键可同时存在；通知唯一身份继续抑制部署重放带来的重复提醒。
- 实际核验数据库/Redis/MinIO、服务开关、断网及并发多Worker；运行测试必须连接专用测试库。

M9接收命令：仓库 backend 中 `python -m pytest tests/test_matching_jobs.py tests/test_live_intelligence.py -ra`。
前置环境变量与迁移步骤依照既有 `.github/workflows/ci.yml`；不在共享/生产库运行测试。
建议接收核对期限：2026-10-16 18:00（M6建议，须M1/M9确认；实际阶段DDL优先）。
没有新增迁移不等于已经完成真实运行环境验收。
