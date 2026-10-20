# M5 Phase 4 交付清单

Owner：M5 胡可铭（Tomori-na）。2026-10-15。
个人任务 PR：[#100](https://github.com/Huang0283/CampusLoop/pull/100)，
目标 `phase4/backend-integration`；待同组交叉 Review，尚未合并。
任务来源：[BP-P4 Issue #30](https://github.com/Huang0283/CampusLoop/issues/30)，按五个 Phase 执行。
阶段输入：main `829ffbfc7f5c310917b2ff7c9627fe98b117824a`；
个人/小组创建基线：phase4/integration `cdf814364eec988e0d197c0a0098a92eb5db4d6e`，包含 M8 #97。
源码与测试提交：`c4687d5a44eb18d5a96af4bec03b85ec933da0be`。

| 任务 | 实际输出 | 作者自检 |
|---|---|---|
| BP4-01 | governance 服务的信誉白名单投影、self/admin 路由；intelligence 公共视图；trust-api.md | 通过 |
| BP4-02 | 举报列表/处理/带版本比较的人工覆盖；风险、账号及证据访问审计；moderation-api.md | 通过 |
| BP4-10 的 M5 部分 | 正常、重复、并发、乱序、越权、模型关闭/超时、审计原子性测试；ai-integration-signoff.md / handoff.md | 本地通过，联合签字待完成 |

代码位于 `backend/app/api/routes/governance.py`、`backend/app/services/governance.py`；
现有 `auth.py`、`intelligence.py`、`media.py` 与 `main.py` 做必要接入。
测试位于 `backend/tests/test_governance_api.py`、`test_governance_projection.py`，
并更新 `test_realtime_media.py` 的证据审计断言。
设计和执行记录位于 `docs/superpowers/specs/2026-10-15-m5-p4-governance-design.md`
及 `docs/superpowers/plans/2026-10-15-m5-p4-governance.md`。

复用现有 Report/AuthAudit/IdempotencyRecord，无新增数据库迁移。
统一 OpenAPI/SDK 修改归 M6，逐项需求见 handoff.md；本次 SDK 漂移检查仅验证现有契约稳定。
M8 #98 的 RPC 响应加固仍是上游独立 PR，本次不重复修改其客户端。

合并路径：`task/m5-p4-governance-api` → `phase4/backend-integration`
→ `phase4/integration` → `main`。同组 M6/M9 至少一人 Review；M1 复核范围、M10 独立复测。
M5 先合入，M6 再从最新组分支接续，随后 M9；阶段最终合入 main 由 M1 执行。
本文件不宣称后端组或整个 Phase 4 已完成，也不关闭 #30。

独立定位交付提交：

```sh
git log -1 --format=%H -- backend/app/api/routes/governance.py
git log -1 --format=%H -- docs/evidence/phase-4/backend-platform/deliverables.md
```

原始逐用例成功结果经去除本机路径/主机名后归档于 `evidence/m5-api-results.json`。
验证命令、运行环境和剩余接收工作见 verification.md / handoff.md。

H4-06 后续修复：`fix/m5-p4-h4-06` 将举报描述输入上限收窄至数据库现有的 1000 字符，
同步 OpenAPI 并增加 1000/1001 字符边界测试；该修复无需数据库迁移。
---

以下保留 M9 分支原始交付记录；本次联合验收结论以管理质量组 2026-10-20 的阶段审计为准。
# BP4 交付清单（deliverables，backend-platform）

> 证据文件：`docs/evidence/phase-4/backend-platform/deliverables.md`
> 维护人：M9 ｜ 阶段：Phase 4 智能任务、治理与冻结（BP-P4）
> 任务范围：BP4-07 / BP4-08 / BP4-09（M9 个人任务）+ BP4-10 小组共同任务（M9 部分）

## 一、个人交付物对照（Issue 原文 → 实际交付）

| 任务 | Issue 要求交付 | 实际交付 | 状态 |
|---|---|---|---|
| BP4-07 | Compose/配置 | `docker-compose.yml` 新增 `worker`/`baseline` 服务与 `baseline-data` 卷；`.env.example` 运行时配置 6 项；`backend/app/core/config.py` 对应字段 | ✅ |
| BP4-07 | worker-runtime.md | `docs/evidence/phase-4/backend-platform/worker-runtime.md`（拓扑/边界/健康契约/验证步骤） | ✅ |
| BP4-08 | 监控配置 | `ai_task_runs` + `worker_heartbeats`（迁移 0009）；`app/worker/observer.py`（异步落库+心跳+快照）；`app/worker/health.py`（/healthz）；结构化 JSON 日志 | ✅ |
| BP4-08 | ai-observability.md | `docs/evidence/phase-4/backend-platform/ai-observability.md`（含 7 段运维 SQL 手册，逐条对应验收口径） | ✅ |
| BP4-09 | 迁移/报告 | `backend/alembic/versions/0009_ai_worker_runtime.py`（含可逆 downgrade）；`ai-migration-report.md`（兼容矩阵+验证流程） | ✅ |

## 二、代码交付清单（全部 M9 独占范围）

**新增：**
- `backend/app/worker/__init__.py` — 运行时包（设计红线与边界声明）
- `backend/app/worker/observer.py` — 任务观测器（内存快照 + 异步落库 + 心跳）
- `backend/app/worker/health.py` — /healthz 标准库探针
- `backend/app/worker/runner.py` — 进程装配（信号/优雅退出/观测挂载）
- `backend/app/models/ai_runs.py` — AiTaskRun / WorkerHeartbeat 模型
- `backend/scripts/worker.py` — worker 容器入口
- `backend/scripts/baseline_services.py` — M7/M8 建议服务独立容器入口
- `backend/alembic/versions/0009_ai_worker_runtime.py` — 观测表 + HNSW 索引
- `backend/tests/test_worker_runtime.py` — 运行时单元测试（无 PG 依赖）

**修改（最小侵入，均为 M9 独占或明示协作范围）：**
- `backend/app/services/matching_jobs.py` — 新增 `RUN_OBSERVERS` 观察者钩子 +
  `run_one` 计时/事件发射 + 主循环 tick（队列语义零改动，不装钩子时行为与
  phase-3 完全一致）
- `backend/scripts/serve.py` — 以两个新开关包裹既有逻辑（默认行为不变）
- `backend/app/core/config.py` — worker/advisory 运行配置 6 项
- `backend/app/models/__init__.py` — 导出新模型（机械性两行）
- `docker-compose.yml` — 新增两服务 + 卷 + api 环境变量（拓扑切换）
- `.env.example` — 与 config.py 一一对应的运行配置

**未修改（边界声明）：**
- CI workflow（既有三门禁自动覆盖新迁移与全部单测）
- `matching_jobs.py` 的队列/重试/通知语义、`intelligence.py` 降级路径（M6/M7 范围）
- 前端、SDK、业务结果 schema（M7/M8 未确认字段，M9 不抢先定义）

## 三、BP4-10（小组共同任务）M9 承担部分

- 提供联合测试的运行时环境（worker/baseline 容器化）与健康取证端点；
- 参与正常/重复/乱序/超时/权限联合测试的执行与记录（待小组集成后补签）。

## 四、验收标准自查（Issue 原文）

| 验收标准 | 实现支撑 | 状态 |
|---|---|---|
| 服务可独立健康检查 | worker `/healthz`（心跳+队列+摘要）；baseline 容器 healthcheck（双端口探测）；compose `ps` 可见 | ✅ 实现，实机记录见 verification.md |
| 模型关闭不会拖垮 API | `docker compose stop baseline` 实验步骤（worker-runtime.md 第五节）；API 降级路径 phase-3 已实证；观测/重试兜底有界 | ✅ 实现，实机记录见 verification.md |
| 能定位任务的输入版本/处理服务/失败原因/重试次数 | `ai_task_runs` 一表四答 + SQL 手册（ai-observability.md 第三节①②） | ✅ 实现 |
| 回滚不破坏 MVP 数据 | 0009 downgrade 仅删观测对象；兼容矩阵（ai-migration-report.md 第四节）；CI 回滚门禁覆盖 | ✅ 实现 |
| 升级后旧结果可识别版本 | `result_version` 语义零改动 + 观测表同版本落库 | ✅ 实现 |
