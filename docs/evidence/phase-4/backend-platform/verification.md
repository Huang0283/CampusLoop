# BP4 验证记录（verification，backend-platform）

> 证据文件：`docs/evidence/phase-4/backend-platform/verification.md`
> 维护人：M9 ｜ 汇集 BP4-07/08/09 全部验证证据
> 原则：只记录真实执行过的验证；未执行项明确标注"待执行"，不编造结果。

## 一、静态与单元验证（本地开发环境，M9，已执行）

| 验证项 | 命令 | 结果 |
|---|---|---|
| ruff format | `ruff format .`（后端 80 文件） | ✅ 80 files already formatted（新增/修改文件已按项目风格重排） |
| ruff lint（E/W/F/I/B/UP） | `ruff check .` | ✅ All checks passed!（修复 3 处未用 import 后全绿） |
| worker 运行时单测 | `pytest tests/test_worker_runtime.py`（独立运行模式） | ✅ **10 passed**（17.43s，详见执行记录） |
| 关键文件编译检查 | `py_compile`（迁移 0009 / worker 三模块 / 两脚本 / serve / config / matching_jobs） | ✅ 全部通过 |
| 全量测试套件（含队列集成语义回归） | `pytest`（CI 提供 PostgreSQL/MinIO 容器） | 待 CI（本 PR 触发） |
| 迁移空库升级 + 回滚复升 | `alembic upgrade head && alembic downgrade base && alembic upgrade head`（CI 步骤） | 待 CI |

**执行记录**（M9 本地，开发验证 venv）：

- 日期：2026-10-12（本地会话）
- 环境：Python 3.12.14 / pytest 9.1.1 / sqlalchemy 2.0.x / ruff 0.17.0
- 单测输出摘录：

```
collected 10 items
test_worker_runtime.py ..........                          [100%]
============================= 10 passed in 17.43s ==============================
```

- 说明：本地开发环境未装全 requirements（无 PostgreSQL/MinIO 容器），
  单测以独立模式执行（等价于 CI 中 `pytest tests/test_worker_runtime.py`；
  该测试文件刻意不依赖 PG——观测表无 PG 专有类型、健康端点用标准库）。
  conftest 的集成夹具仅在全量套件中生效，不影响本文件 10 个用例的语义。
- 测试覆盖：/healthz 200/503 契约、observer 内存计数与 sqlite 落地
  （含丢弃上限、坏事件容错、最终心跳）、钩子容错、baseline 绑定校验、
  phase-3 兼容默认值锁定。

## 二、CI 验证（GitHub Actions，PR 触发后填写）

| 验证项 | 结果 | 证据 |
|---|---|---|
| backend / format & lint | 待 CI | run 链接待填 |
| backend / migrations, seed & tests（含 0009 空库升级+回滚+复升） | 待 CI | 同上 |
| frontend / sdk & build | 待 CI | 同上 |

链接：待填（PR 创建后，从 PR Checks 页复制 run 链接）

## 三、干净环境完整 Compose 验证（BP4-07 验收口径，M9 机器）

> 前置：沿用 BP2-09 的干净环境标准流程（startup-guide.md），
> 新增服务的构建走同一 backend/Dockerfile（无新基础镜像、无新外网依赖）。

### 记录表（2026-10-15 已执行）

| 验证项 | 期望结果 | 实际结果 |
|---|---|---|
| `docker compose up -d --build` | 7 服务全部创建：db/redis/minio/minio-init/api/**baseline**/**worker** | ✅ 7 服务全部创建（镜像初建于本机此前会话完成，本轮直接复用） |
| `docker compose ps` | api/baseline/worker 均 healthy；baseline 不发布宿主端口 | ✅ 7 服务全部 Up，api/worker/baseline 均 healthy |
| worker `/healthz`（宿主 8002） | `{"status":"ok",...,"queue":{"reachable":true},...}` | ✅ `status=ok`，checks.mainLoopAlive/dbReachable、queue.reachable 均 true，queue.pending=0；workerId=worker-869aab7f32b6-1（见摘录三） |
| 观测落库 | `SELECT count(*) FROM ai_task_runs;` 随任务执行增长；`worker_heartbeats` 有心跳行 | ✅ ai_task_runs 随网页编辑求购帖逐次增长（见执行记录摘录一）；worker_heartbeats 4 行：3 条历史实例行（容器重建所致）+ 当前实例 worker-869aab7f32b6-1（runs_total=6、runs_failed=0，与 /healthz 一致，见摘录三） |
| **模型关闭实验** | `docker compose stop baseline` → api 仍 healthy、`/health` 依赖 ok；worker 任务**降级而不失败**：RPC 不可达时 `call_baseline` 就地回退内嵌引擎，任务仍 DONE，降级标记写入 `matching_results.metadata`（degraded=true，fallbackReason=SERVICE_UNAVAILABLE）；`docker compose start baseline` 后自动恢复正常路径 | ✅ 完整执行"正常→降级→恢复"三态闭环，matching_results 四条时间线（见执行记录摘录二） |
| SQL 定位能力（BP4-08 口径） | 按 ai-observability.md 第三节 SQL 能回答：输入版本/处理服务/失败原因/重试次数 | ✅ ai_task_runs 可定位 outcome/attempt/duration_ms/result_version；降级原因经 matching_results.metadata 按 wanted_id/updated_at 关联定位 |
| 环境记录 | `uname -a`、`docker --version`、`docker compose version` | ✅ Windows 10（Git Bash / MINGW64，x86_64）、Docker 29.8.2、Docker Compose v5.5.1 |

**执行记录**（2026-10-15 实测）：

- 日期：2026-10-15（本地会话，北京时间）
- 机器/系统：Windows 10（Git Bash / MINGW64，x86_64）+ Docker Desktop（Docker 29.8.2 / Compose v5.5.1），与 BP2-09 同机
- 检出的分支与提交号：`task/m9-p4-worker-runtime` @ `5ccfe03`
- 关键输出摘录：

摘录一：实验 A —— 编辑求购帖触发匹配任务，任务记录（`ai_task_runs`）：

```
 task_id | outcome | attempt | duration_ms | error_code | result_version
---------+---------+---------+-------------+------------+------------------------------------------------------------------
       1 | DONE    |       1 |         428 |            | f45b4cb9d8c4c14b12e5bab72b37e6687e5cd8dc6ad30fba6511530e9e7abdc3
       2 | DONE    |       1 |        7880 |            | 3d0c2222318c465a46c9df20ad3a1b0257c58f3669edd57e5bd572cc75a3a3c1
(2 rows)
```

摘录二：实验 B —— 模型关闭实验降级时间线（`matching_results.metadata`）：

```
 wanted_id | degraded |    fallbackReason    | updated_at
-----------+----------+----------------------+------------
      3006 | false    |                      | 14:36:27   ← start baseline 恢复后：自动回到正常路径
      3005 | true     | SERVICE_UNAVAILABLE  | 14:31:27   ← stop baseline 期间：降级兜底，任务仍成功
      3004 | true     | SERVICE_UNAVAILABLE  | 14:11:01   ← 同上
      3003 | false    |                      | 14:01:33   ← 正常基线
(4 rows)
```

- 说明：摘录按实测终端输出截图整理（时间列仅示时刻部分）；
  stop baseline 期间网页端 API 主链路、注册/发帖等功能全程正常。

摘录三：worker `/healthz` 关键字段（完整 JSON 截图留存）与 `worker_heartbeats`：

```
{"status":"ok","workerId":"worker-869aab7f32b6-1","workerVersion":"bp4-worker-runtime-v1",
 "secondsSinceLastLoopTick":0.113,
 "runs":{"total":6,"succeeded":4,"skipped":2,"retryScheduled":0,"failed":0,
         "workerFailure":0,"droppedEvents":0,"dbWriteErrors":0},
 "queue":{"reachable":true,"pending":0,"oldestPendingSeconds":null},
 "checks":{"mainLoopAlive":true,"dbReachable":true}}
```

```
 worker_id              | version               | runs_total | runs_failed
------------------------+-----------------------+------------+-------------
 worker-574c7778e268-1  | bp4-worker-runtime-v1 |          0 |           0
 worker-9bdee26a6591-1  | bp4-worker-runtime-v1 |          0 |           0
 worker-2f62d6d1df0b-1  | bp4-worker-runtime-v1 |          0 |           0
 worker-869aab7f32b6-1  | bp4-worker-runtime-v1 |          6 |           0
(4 rows)
```

- `/healthz` 的 recentRuns 与 ai_task_runs 一一对应：6 次运行 =
  4 次 DONE（task 1–4，对应 3003–3006）+ 2 次 SKIPPED（求购帖状态
  变更后触发，业务输入不再有效，无需重算——SKIPPED 语义正常）；
  failed=0，droppedEvents=0；
- worker_heartbeats 为按 worker_id UPSERT：3 条 runs_total=0 的行为
  容器重建期间的历史实例（身份含 hostname-pid），当前实例
  worker-869aab7f32b6-1 runs_total=6、runs_failed=0，与 /healthz 一致。

## 四、已知未验证项声明

- 完整 Compose 拓扑验证（第三节）已于 2026-10-15 在 M9 机器全部执行：
  服务编排、worker /healthz、观测落库（ai_task_runs + worker_heartbeats）、
  模型关闭实验、SQL 定位能力、环境记录共 7 项全部通过；其中模型关闭
  实验含"正常→降级→恢复"三态闭环实测。
- BP4-10 联合测试（与 M5/M6/FE/AI 的重复、乱序、超时、权限场景）：
  待小组集成分支合并后执行，M9 负责运行时环境与观测取证部分。
- M6/M7 真实模型服务接入后的观测字段扩展（algorithmVersion 落
  ai_task_runs）：属 M6 结果落库迁移范围，M9 仅预留口径（见
  ai-observability.md 第二节），不提前实现。
