# BP4 交接记录（handoff，backend-platform）

> 证据文件：`docs/evidence/phase-4/backend-platform/handoff.md`
> 维护人：M9 ｜ 阶段收口时更新接收清单

## 一、本阶段产物接收清单（BP4 → BP5）

| 产物 | 提交号 | 接收人 | 接收动作 | 验收命令/场景 | 结论 |
|---|---|---|---|---|---|
| worker/baseline 容器拓扑 | 待填（任务 PR） | M10 | 阶段集成验收：7 服务全 healthy、模型关闭实验 | `docker compose ps`；`docker compose stop baseline`（worker-runtime.md 第五节） | 待验收 |
| /healthz 契约与取证端点 | 同上 | M10 | 联合测试的观测入口 | `curl localhost:8002/healthz` | 待验收 |
| ai_task_runs / worker_heartbeats（0009） | 同上 | M6 | 确认观测口径与降级语义对齐（ai-observability.md 第五节） | 阅读第五节表格 + SQL 抽查 | 待验收 |
| HNSW 向量索引（0009） | 同上 | M7 | 确认索引参数（m=16/ef_construction=64，余弦）与选型匹配 | `ai-migration-report.md` 第一节 | 待验收 |
| 迁移 0009 + 兼容矩阵 | 同上 | M1/M10 | 冻结范围确认（迁移不可再改，除非走范围变更） | CI rollback 门禁 | 待验收 |

## 二、给下一阶段/其他成员的关键约定

1. **M6（任务编排）**：
   - 新任务类型注册后，`_run_event` 的 `taskType` 字段扩展由 M6 发 PR、
     M9 评审（观测表 M9 独占）；重试/退避沿用 5 次上限 + 2^n 秒。
   - M6 的结果落库迁移（0010+）自附 downgrade；向量列索引参考 0009 写法。
2. **M7/M8（模型服务）**：
   - 真实模型容器化后，在 compose 以新服务接入（建议名 `m7-model`/`m8-model`），
     baseline 容器保留为"关停实验/降级演示"用途或整体替换，走范围变更；
   - 服务契约版本变化必须同步 `contracts/` 样例与 `ai-observability.md` 第五节。
3. **M5（治理）**：ai_task_runs 是审计数据源，人工治理后台如需展示
   任务失败率/重试，直接读该表（M9 独占写入，M5 只读）。
4. **M10（验收）**：BP4-10 联合测试的运行时环境由本套拓扑提供；
   取证脚本建议扩展 [9] 步：`/healthz` + `stop baseline` 实验 + SQL 抽查。

## 三、遗留问题与风险

| 事项 | 影响 | Owner | 期限 |
|---|---|---|---|
| 干净环境 Compose 验证待执行（verification.md 第三节） | BP4-07 验收最后一项 | M9 | 本周 |
| BP4-10 联合测试待小组集成 | Issue 关闭门禁 | M5/M6/M9 | 阶段收口前 |
| M7 真实向量模型列维度（768 vs 1024） | 若改 1024 需一次迁移（product.py 注释预留） | M7 确认 | AI-P4 评估后 |
| 观测表长期保留策略（分区/归档） | 数据量增长（课程规模可忽略） | M9 | Phase 5 评估 |
