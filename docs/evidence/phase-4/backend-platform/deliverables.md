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
