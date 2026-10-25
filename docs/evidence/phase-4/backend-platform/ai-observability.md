# AI 任务可观测性说明（ai-observability，BP4-08）

> 证据文件：`docs/evidence/phase-4/backend-platform/ai-observability.md`
> 维护人：M9 ｜ 对应任务：BP4-08 任务耗时、队列、失败率、版本和资源监控/日志
> 验收口径：能定位某任务的**输入版本、处理服务、失败原因和重试次数**。

## 一、观测架构（三层，全部 M9 独占表）

```
任务执行（matching_jobs.run_one）
  └─ _emit_run(event)                     观察者钩子（phase-3 队列语义零改动）
      └─ RunObserver.__call__             入内存队列（上限 2000，满则丢弃计数）
          ├─ 内存快照：计数器 + 最近 20 条  → /healthz 即时可见
          └─ flusher 线程（独立短会话）    → ai_task_runs 逐条落地
worker_heartbeats                          每 10s UPSERT（身份/版本/计数）
```

红线：观测永远不影响任务——入队/写库任何失败只计数（`droppedEvents` /
`writeErrors`）与告警日志，任务执行路径无感知；观测表与业务表无外键耦合。

## 二、数据模型（迁移 0009）

### ai_task_runs（每次任务执行一条，只追加）

| 列 | 说明 |
|---|---|
| `task_type` | 任务类型（当前 `matching`；M6 新任务类型注册后扩展） |
| `task_id` | matching_jobs.id |
| `event_key` | 触发事件键（幂等键，同 matching_jobs） |
| `wanted_id` | 求购帖（无外键：业务行删除后流水保留） |
| `outcome` | `DONE` / `SKIPPED` / `RETRY`（已排期重试）/ `FAILED`（最终失败）/ `WORKER_FAILURE` |
| `error_code` | 失败原因（如 `STALE_INPUT` / `VALIDATION_ERROR` / `WORKER_FAILURE`；服务不可用属降级兜底，任务仍 DONE，原因见 matching_results.metadata，不落本列） |
| `result_version` | **输入版本**（结果输入快照 sha256，同 matching_results.result_version） |
| `attempt` | **重试次数**（第几次尝试，从 1 计） |
| `duration_ms` | 本次执行耗时（claim 到 commit，含 RPC） |
| `worker_id` / `worker_version` | **处理服务**（哪个 worker 实例、哪个运行时版本处理） |
| `started_at` / `finished_at` / `created_at` | 时间线 |

### worker_heartbeats（每实例一行，UPSERT）

`worker_id`（PK）、`version`、`pid`、`started_at`、`last_beat_at`、
`runs_total`、`runs_failed`。

### "处理服务"与算法版本的对应关系

- `worker_version = bp4-worker-runtime-v1`：M9 运行时版本（本表）；
- `matching_results.facts->metadata.algorithmVersion`：M7/M8 算法版本
  （业务结果表，M6/M7 所有）；
- 两者通过 `task_id`/`wanted_id` + `result_version` 关联定位。

## 三、运维 SQL 手册（验收场景逐条对应）

```sql
-- ① 定位某任务的输入版本、处理服务、失败原因、重试次数（BP4-08 验收）
SELECT task_type, task_id, event_key, outcome, error_code,
       result_version, attempt, duration_ms,
       worker_id, worker_version, started_at, finished_at
FROM ai_task_runs
WHERE task_id = :任务ID
ORDER BY id;

-- ② 按触发事件键追溯（跨重试的完整历史）
SELECT outcome, error_code, attempt, duration_ms, finished_at, worker_id
FROM ai_task_runs
WHERE event_key = :事件键
ORDER BY id;

-- ③ 失败率（最近 1 小时，按结果类型）
SELECT outcome, count(*) FROM ai_task_runs
WHERE created_at > now() - interval '1 hour'
GROUP BY outcome ORDER BY count(*) DESC;

-- ④ 最终失败清单（进入 FAILED 的任务，需人工关注）
SELECT task_id, wanted_id, error_code, attempt, finished_at
FROM ai_task_runs WHERE outcome = 'FAILED'
ORDER BY finished_at DESC LIMIT 50;

-- ⑤ 队列深度与最老积压（任务表实时视角）
SELECT count(*) AS pending,
       coalesce(max(extract(epoch FROM (now() - available_at))), 0) AS oldest_pending_seconds
FROM matching_jobs WHERE status = 'PENDING';

-- ⑥ 当前存活的 worker 实例（心跳超过 30s 视为失联）
SELECT worker_id, version, pid, started_at, last_beat_at,
       runs_total, runs_failed,
       extract(epoch FROM (now() - last_beat_at)) AS seconds_since_beat
FROM worker_heartbeats
ORDER BY last_beat_at DESC;

-- ⑦ 平均/最大耗时（按结果类型，用于容量观察）
SELECT outcome, count(*) AS runs,
       round(avg(duration_ms)) AS avg_ms, max(duration_ms) AS max_ms
FROM ai_task_runs WHERE duration_ms IS NOT NULL
GROUP BY outcome;
```

## 四、日志与资源监控

- **结构化日志**：worker 进程复用全局 `LOG_JSON=true` 行式 JSON 日志；
  关键行：观测写入失败（warning，含异常栈）、优雅退出（SIGTERM 收到）。
  API/worker/baseline 三容器日志统一 `docker compose logs <服务>` 查看。
- **资源监控**：容器级资源（CPU/内存/网络）用 Docker 原生手段观测：
  `docker stats campusloop-worker-1 campusloop-baseline-1`（实时）；
  Phase 5 如需时序留档，接入 cAdvisor/Prometheus 属加固范围（BP-P5），
  本阶段不引入额外监控栈（保持依赖最小）。
- **健康探针**：`/healthz` 聚合"主循环心跳 + 队列状态 + 最近运行摘要"，
  契约见 worker-runtime.md 第六节；Compose healthcheck 每 10s 自动探测，
  异常时容器转 `unhealthy`（`docker compose ps` 直接可见）。

## 五、降级场景下的观测语义（与 M6 降级编排的衔接）

| 场景 | 任务 outcome | error_code | 说明 |
|---|---|---|---|
| M7/M8 服务容器停止（RPC 不可达） | DONE | （空） | RPC 超时/5xx/连接拒绝 → `call_baseline` 就地回退内嵌引擎，任务照常成功；降级标记落 matching_results.metadata（degraded=true，fallbackReason=SERVICE_UNAVAILABLE/SERVICE_TIMEOUT）。实测 2026-10-15，见 verification.md 第三节 |
| 配置禁用（BASELINE_SERVICES_ENABLED=false） | DONE | （空） | 不发起 RPC，直接走内嵌引擎；metadata 标记 fallbackReason=SERVICE_DISABLED |
| 降级回退时输入过期（asOf 超 60s / 求购已关闭） | RETRY → FAILED | `STALE_INPUT` / `WANTED_INACTIVE` | 降级路径的业务校验仍生效：2^n 秒有界重试（60s 封顶），第 5 次进 FAILED |
| 任务执行中 revision 变化 | RETRY | `STALE_INPUT` | 输入过期，下一轮以新输入重算 |
| worker 进程异常 | WORKER_FAILURE | `WORKER_FAILURE` / `JOB_RELEASED` | 事务回滚、锁释放、无部分结果 |
| 竞态（另一 worker 抢占） | WORKER_FAILURE | `JOB_RELEASED` | 重试计数未知，如实记录 |

## 六、单测覆盖

`backend/tests/test_worker_runtime.py`（无 PG 依赖，CI 与本地均可跑）：
- 健康端点 200/503 聚合与 JSON 契约；
- 观测器内存计数/丢弃上限/sqlite 落地/最终心跳；
- 钩子容错（坏钩子不影响 `_emit_run` 调用方）；
- baseline 绑定校验（弱 token、不合规 URL 拒绝）；
- 兼容默认值锁定（phase-3 单进程语义不变）。
