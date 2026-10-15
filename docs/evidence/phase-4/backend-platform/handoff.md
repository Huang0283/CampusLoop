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
| H4-06 | M6/M9 → M10/M1 | 既有 ReportWrite.description 最大2000但数据库String(1000)，超长输入可能失败；由schema/迁移Owner明确修正或缺陷冻结 | 本次未修改共享schema/迁移；建议2026-10-15 18:00确认归属 |

H4-06 是读取既有源码发现的长度不一致，本次未提交2000字符复现测试，
不得声称该缺陷已验证/修复；与新增处理 note 的校验无关。
M9 不需要为本次治理接口新增表，需在自己的运行基线复验现有事务/审计。
M10 按 verification.md 命令从实际阶段集成 SHA 检出，并记录其复测提交与结论。

## Phase 5 接收

M1/M10 接收冻结的代码、上述证据与遗留清单；M5 继续负责治理缺陷修复与安全复验；
M6 接收契约/编排，M9 接收运行、监控与迁移，M2/M3 接收字段消费。
接收结论当前均待团队确认，Phase 5 不新增未经范围变更批准的功能。
个人任务 PR 并不直接合入 main，也不自动关闭整个阶段 Issue。
