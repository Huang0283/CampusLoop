# Worker 运行时说明（worker-runtime，BP4-07）

> 证据文件：`docs/evidence/phase-4/backend-platform/worker-runtime.md`
> 维护人：M9 ｜ 对应任务：BP4-07 部署 Worker、队列、pgvector/索引和模型服务依赖
> 原则：只记录真实实现与真实执行过的验证；未执行项标注"待执行"。

## 一、phase-4 运行拓扑（与 phase-3 对照）

```
phase-3（单进程）：
  [api 容器] uvicorn ── worker 线程（matching_jobs.worker_loop）
                     └─ M7/M8 建议服务内嵌于进程、仅绑 127.0.0.1

phase-4（本阶段，M9）：
  [api 容器]       uvicorn（MATCHING_WORKER_INPROCESS=false，
                                BASELINE_INPROCESS=false）
  [worker 容器]    python scripts/worker.py
                   ├─ matching_jobs.worker_loop（队列语义零改动）
                   └─ /healthz 独立健康探针（宿主 8002 -> 容器 8000）
  [baseline 容器]  python scripts/baseline_services.py
                   ├─ M7 关键词基线 RPC :8787（内网）
                   └─ M8 价格/风险基线 RPC :8788（内网）
  [db] pgvector/pgvector:0.8.6-pg16（HNSW 索引就绪，见迁移 0009）
```

拆分动因：worker 独立成容器后，任务处理与 API 请求路径的资源互不挤占；
建议服务跨进程可达（环回内嵌对 worker 不可见）；"模型关闭不拖垮 API"
从代码级降级升级为容器级隔离，可用 `docker compose stop baseline` 直接演示。

## 二、职责边界（对应 Issue 文件所有权）

| 范围 | 归属 | 说明 |
|---|---|---|
| `matching_jobs.py` 队列语义 | M9（phase-3 已冻结，本阶段零改动+观测钩子） | PostgreSQL 权威、SKIP LOCKED、行锁租约、有界重试不变 |
| `app/worker/*` 运行时 | M9 独占 | 装配、健康探针、观测器；不碰业务语义 |
| 建议服务调用/降级编排 | M6 | worker/API 只消费 `intelligence.rank_live` 既有降级路径 |
| AI 结果字段/迁移 | M7/M8 确认字段，M6 合入 API，M9 管运行依赖 | M9 未单方面新增任何业务结果 schema |

## 三、Compose 服务与配置（BP4-07 交付）

新增服务（`docker-compose.yml`）：

- **baseline**：与 api 同镜像，`python scripts/baseline_services.py`；
  仅监听 compose 内网（不发布宿主端口）；`BASELINE_RPC_TOKEN`（≥32）必需；
  M7 快照挂 `baseline-data` 卷（跨重启保留 snapshotVersion 语义）；
  healthcheck 用内建 python socket 探测 8787/8788。
- **worker**：与 api 同镜像，`python scripts/worker.py`；
  依赖 `db healthy` 与 `api healthy`（迁移由 api 统一执行，职责单一）；
  healthcheck 探 `http://localhost:8000/healthz`；
  发布 `${CAMPUSLOOP_WORKER_PORT:-8002}:8000` 供宿主取证。

api 服务环境变量新增：`BASELINE_INPROCESS=false`、
`MATCHING_WORKER_INPROCESS=false`、`M7_SERVICE_URL=http://baseline:8787`、
`M8_SERVICE_URL=http://baseline:8788`。

安全口径（与 phase-3 等价，作用域从进程变为容器网络）：
- 建议服务不发布宿主端口，仅内网可达；
- RPC token 必需（与 phase-3 相同的 ≥32 校验，`resolve_bindings` 统一拒绝非法配置）；
- baseline 容器不持有 `AUTH_SIGNING_KEY`（最小权限，认证域隔离不变）。

兼容性：`MATCHING_WORKER_INPROCESS`/`BASELINE_INPROCESS` 默认 `true`——
CI 与本地直跑 `scripts/serve.py` 的 phase-3 单进程语义完全不变
（单测 `test_runtime_flags_default_keep_phase3_semantics` 锁定该契约）。

## 四、pgvector 与索引就绪状态

- 扩展：0001 已 `CREATE EXTENSION IF NOT EXISTS vector`（共享资源，downgrade 不删）；
- 列：`products.embedding VECTOR(768)` 自 0001 预留（nullable，M7/M8 写入）；
- **索引：迁移 0009 新增 `ix_products_embedding_hnsw`（HNSW +
  `vector_cosine_ops`，m=16 / ef_construction=64）**——空列建索引安全
  （HNSW 忽略 NULL），M7/M8 写入向量后立即被索引覆盖，无需再次迁移；
- 维度变更预案：M7 选型如改 1024 维，需一次迁移重建列+索引
  （product.py 注释已预留该口径）。

## 五、"模型关闭不会拖垮 API" 验证步骤（BP4-07 验收项）

```bash
# 1) 全量启动：7 服务（db/redis/minio/minio-init/api/worker/baseline）
docker compose up -d --build
docker compose ps                 # 期望：api/worker/baseline 均 healthy

# 2) 关闭模型（实验开关）
docker compose stop baseline

# 3) 断言一：API 主链路存活
curl -fsS http://localhost:8001/health
# 期望 200：{"code":0,...,"status":"ok","dependencies":{"database":"ok","redis":"ok"}}

# 4) 断言二：触发一次求购更新（产生匹配任务），worker 进入有界重试而非崩溃
docker compose logs worker --tail 50
# 期望：任务 outcome=RETRY/FAILED，errorCode=SERVICE_DISABLED，重试有 2^n 上限（60s 封顶）

# 5) 恢复
docker compose start baseline
```

> 执行记录：见 verification.md 第四节（在用户机器上实际执行后填写）。

## 六、Worker /healthz 契约

```
GET /healthz  -> 200 {"status":"ok",   "workerId", "version", "uptimeSeconds",
                      "secondsSinceLastTick", "queue":{pending, oldestPendingSeconds, reachable},
                      "runs":{total,DONE,SKIPPED,RETRY,FAILED,WORKER_FAILURE,droppedEvents,writeErrors},
                      "lastRuns":[...] }
              -> 503 {"status":"degraded", ...同结构}   # 心跳过期或 DB 不可达
```

- 判定：主循环 tick 超过 15s 未更新，或 DB 不可达 → 503；
- 只用标准库 `http.server`：探针存活与业务栈/模型栈完全独立；
- 端口：容器内 `WORKER_HEALTH_PORT`（默认 8000），compose 发布宿主 8002。

## 七、运行配置清单（与 .env.example 一一对应）

| 变量 | 默认 | 说明 |
|---|---|---|
| `MATCHING_WORKER_INPROCESS` | `true` | false=worker 由独立容器承担 |
| `BASELINE_INPROCESS` | `true` | false=M7/M8 由独立容器承担 |
| `WORKER_HEALTH_PORT` | `8000` | worker /healthz 容器内端口 |
| `WORKER_ID` | 空 | 固定身份（跨重启追踪）；空=hostname-pid 自动生成 |
| `BASELINE_BIND_HOST` | `127.0.0.1` | baseline 容器内为 0.0.0.0 |
| `BASELINE_DATA_DIR` | 空 | M7 快照目录；容器挂卷设 /data |
