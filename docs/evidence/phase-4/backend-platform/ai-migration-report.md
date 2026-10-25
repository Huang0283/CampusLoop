# AI 任务/结果迁移报告（ai-migration-report，BP4-09）

> 证据文件：`docs/evidence/phase-4/backend-platform/ai-migration-report.md`
> 维护人：M9 ｜ 对应任务：BP4-09 添加结果/任务迁移并验证升级、回滚和历史数据兼容
> 验收口径：**回滚不破坏 MVP 数据，升级后旧结果可识别版本**。

## 一、本阶段迁移内容（0009）

迁移链：`0001 → 0002 → ... → 0008 → 0009（本阶段，M9）`

| 对象 | 类型 | 说明 |
|---|---|---|
| `ai_task_runs` | 新表（观测） | 任务运行流水：输入版本/处理运行时/失败原因/重试次数/耗时 |
| `worker_heartbeats` | 新表（观测） | worker 实例心跳与累计计数 |
| `ix_products_embedding_hnsw` | 新索引 | `products.embedding`（VECTOR(768)，0001 预留）的 HNSW 余弦索引 |
| `ix_ai_task_runs_*` ×4 | 新索引 | (task_type, created_at) / task_id / outcome / event_key |

范围声明（所有权红线）：
- M9 **未新增/修改任何业务结果 schema**——AI 结果字段由 M7/M8 确认、
  M6 合入业务 API（Issue 口径）；M6 的结果落库迁移如需新表/新列，
  沿用本报告第三节的验证流程执行（需求文件 → 迁移 → 双向验证）。
- `matching_jobs` / `matching_results` / `matching_notifications`
  （phase-3 队列与结果表）**本阶段零改动**——旧结果的版本识别依赖
  `result_version` 列（0006 起）保持原样，即"旧结果可识别版本"的根基。

## 二、与验收口径的对应

1. **"升级后旧结果可识别版本"**
   - `matching_results.result_version`（phase-3 既有）语义不变；
   - 新观测表把同一 `result_version` 记入 `ai_task_runs.result_version`，
     并补充处理运行时（worker_version）与耗时维度，版本链路完整可追溯；
   - `products.embedding` 的 HNSW 索引对既有 NULL 行安全（HNSW 忽略 NULL），
     不改变任何既有行。

2. **"回滚不破坏 MVP 数据"**
   - 0009 的 downgrade 只删除 M9 独占的观测表与索引；
   - MVP 业务表（users/products/wanted/offers/orders/chat/...）与
     队列/结果表不在 downgrade 触及范围内；
   - `vector` 扩展为共享资源不删除（0001 惯例）；
   - worker/baseline 新容器对旧库结构无硬依赖（观测写入失败只计数，
     见 ai-observability.md 第一节），可安全回退到 0008 并继续运行
     phase-3 拓扑（单进程开关默认值未变）。

## 三、验证流程（标准步骤，真实执行记录见 verification.md）

```bash
# 前置：带 phase-3 数据的库（本地 compose 环境已有 MVP+种子数据）
docker compose exec api alembic current          # 期望 0008 (head)→升级前
docker compose exec api alembic upgrade head     # 0008 -> 0009
docker compose exec api alembic current          # 期望 0009 (head)

# 升级后兼容断言（对照 BP4-09 口径）
docker compose exec db psql -U campusloop -d campusloop -c "
  SELECT count(*) AS mvp_products_intact FROM products;          -- 数量与升级前一致
  SELECT count(*) AS results_with_version FROM matching_results
    WHERE result_version IS NOT NULL;                            -- 旧结果全部带版本
  SELECT indexname FROM pg_indexes
    WHERE indexname = 'ix_products_embedding_hnsw';              -- 索引就绪
"

# 回滚验证（CI "Verify rollback then re-migrate" 的本机复演）
docker compose exec api alembic downgrade 0008
docker compose exec db psql -U campusloop -d campusloop -c "
  SELECT count(*) AS mvp_products_intact FROM products;          -- 不变
  SELECT count(*) AS results_intact FROM matching_results;       -- 不变
"
docker compose exec api alembic upgrade head                     # 复升回 0009
```

CI 门禁衔接：`.github/workflows/ci.yml` 的
"Migrate on empty database" + "Verify rollback then re-migrate" 两步
自动覆盖 0009 的空库升级与回滚-复升（本迁移随 0001-0008 同一门禁，
未修改 CI 文件）。

## 四、历史数据兼容矩阵

| 数据 | 升级到 0009 后 | 回滚到 0008 后 |
|---|---|---|
| MVP 业务表（种子/真实数据） | 不变 | 不变 |
| matching_jobs（队列） | 不变 | 不变 |
| matching_results（结果，含 result_version） | 不变、可识别版本 | 不变、可识别版本 |
| matching_notifications | 不变 | 不变 |
| ai_task_runs（观测流水） | 开始累积 | **删除**（预期行为：观测非业务事实） |
| worker_heartbeats | 开始累积 | 删除（同上） |
| products.embedding NULL 行 | 不变（索引忽略 NULL） | 不变 |
| vector 扩展 | 保留 | 保留（共享资源） |

## 五、迁移编写与评审约定（给 M6 的交接）

- 新迁移编号顺延（0010+），`down_revision` 指向当前 head；
- 每个迁移必须有可用 `downgrade()`（CI 回滚门禁强制）；
- 禁止在迁移中写业务数据转换（保持 DDL-only，与 0001-0009 一致）；
- 结果表如新增向量列，索引 DDL 参考 0009 的
  `postgresql_using="hnsw"` + `postgresql_ops` 写法；
- 迁移文件所有权：谁独占的表谁写迁移；共享表的变更需在 PR 中
  由对方负责人确认（Issue"不能由多个成员同时修改同一 schema 或迁移"）。
