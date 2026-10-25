# M5 Phase 4 接收与遗留项

输入与实现 SHA 见 deliverables.md。输出位于本目录及对应 backend 源码/测试。
M5 的 BP4-01/BP4-02 已实现并通过作者本地验证；M6/M9 同组 Review、
BP4-10 联合验收及阶段收口待完成。以下日期均为 M5 建议核对期限，不是队友承诺。

## 统一契约交给 M6

共享 `openapi/campusloop.v1.yaml` 和生成 SDK 由 M6 统一修改；本次未代改。
M6 在自己的 PR 前从已评审合入的最新 `phase4/backend-integration` 同步并完成：

| 变更 | 准确接口/字段需求 |
|---|---|
| 新增本人信誉 | GET /users/me/trust，getMyTrust，Bearer；TrustSummaryResponse |
| 新增管理员信誉 | GET /admin/users/{userId}/trust，adminGetUserTrust，ADMIN；reason 可选、默认 manual_review，1–500 非空白 |
| 信誉 DTO | visibility PUBLIC/SELF/ADMIN、explanation 字符串；smoothing/ignoredEventCount 对 PUBLIC 缺省；factors 仅信誉白名单 |
| 管理员举报 DTO | 保持列表 data 数组；新增 handledBy 整数/null、handledAt date-time/null；仅管理员 DTO 包含 evidence，格式应为 uri-reference，不能当匿名图片地址 |
| 举报处理 | resolveReport 请求 required=[resolution,note]，note 1–1000 且非全空白；Idempotency-Key 必填非空、最长64 |
| 新增人工覆盖 | POST /admin/reports/{reportId}/override，overrideReport；继承 resolution/note，required expectedStatus（RESOLVED/REJECTED）、expectedHandledAt（带时区date-time）；ADMIN，幂等键；200/401/403/404/409/422/423/503 |
| 敏感读取 reason | admin reports 默认 report_queue_review、risk 默认 manual_review、evidence 默认 report_evidence_review；参数1–500非空白 |
| 冲突语义 | 新的终态处理 REPORT_ALREADY_HANDLED；陈旧覆盖 REPORT_STALE；复用键不同体 IDEMPOTENCY_CONFLICT；均409 |

现有 Report 公共 schema 应保留普通举报人 DTO 的最小字段，建议新增 AdminReport，
避免把 handledBy/证据错误推广到 `/reports/mine`。FastAPI 运行时 OpenAPI 可用于核对，
但不能代替 M6 维护的统一 YAML/SDK。现有 SDK 检查通过不代表新增路由已生成 SDK。

## 接收清单与截止检查

| ID | 上游 Owner → 接收者 | 影响 / 接收动作 | 当前结论 / 下一核对时间 |
|---|---|---|---|
| H4-01 | M5 → M6/M9 | Review 治理代码与47项后端测试；至少一名同组通过后合入组分支 | 待 Review；建议2026-10-15 18:00 |
| H4-02 | M5 → M6 → M2/M3/M10 | 同步上述统一契约/SDK，否则新本人/管理员信誉和覆盖功能缺少类型化入口 | 待 M6 接收；建议2026-10-15 18:00，且必须在 M6 任务 PR 合入前 |
| H4-03 | M8 → M5/M6/M10 | #98 仍未合入基线；RPC 无效响应加固与上游语义待跨组确认，合入后复跑信誉/风险降级 | 待上游 Review/集成；建议2026-10-15 18:00 |
| H4-04 | M6/M9/M2/M3 → M5/M10 | 组内编排、Worker和Phase4页面联合检查后补 BP4-10 签字；当前只能验收M5局部链路 | 待相关Owner交付；建议2026-10-15 18:00核对，阶段冻结前完成 |
| H4-05 | M5/M6/M9 → M1/M10 | 按M5→M6→M9合并，M5再发组汇总到phase4/integration；M10/M1独立验收与最终收口 | 未发组汇总；建议2026-10-15 18:00核对，按M1最终DDL |
| H4-06 | M6/M9 → M10/M1 | 既有 ReportWrite.description 最大2000但数据库String(1000)，超长输入可能失败；由schema/迁移Owner明确修正或缺陷冻结 | 已修复：请求 schema 与 OpenAPI 统一为1000；1000字符创建通过、1001字符在写库前返回422；无需迁移 |

H4-06 已在修复提交中关闭：请求 schema、OpenAPI 与现有 `reports.description VARCHAR(1000)` 一致，
并由 `test_report_description_matches_database_limit` 覆盖边界。超长输入不会进入数据库，
也不会被错误包装为 503；与新增处理 note 的校验无关。
M9 不需要为本次治理接口新增表，需在自己的运行基线复验现有事务/审计。
M10 按 verification.md 命令从实际阶段集成 SHA 检出，并记录其复测提交与结论。

## Phase 5 接收

M1/M10 接收冻结的代码、上述证据与遗留清单；M5 继续负责治理缺陷修复与安全复验；
M6 接收契约/编排，M9 接收运行、监控与迁移，M2/M3 接收字段消费。
接收结论当前均待团队确认，Phase 5 不新增未经范围变更批准的功能。
个人任务 PR 并不直接合入 main，也不自动关闭整个阶段 Issue。
---

以下保留 M9 分支原始交接记录；本次联合验收结论以管理质量组 2026-10-20 的阶段审计为准。
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
