# Phase 2：M7 个人任务交付清单

2026-10-08 状态更新：用户确认 228/228 对标签已完成人工复核且全部正确，无需修改原标签；逐条复核记录由用户稍后提供。当前状态为“人工复核完成，记录待归档校验”，不等同跨组签字、数据封存或阶段验收。详情见 [复核状态](human-review-status.md)。

更新：2026-09-28。AI2-01/02/03 数据交付已修订为 m7-synthetic-p2-v1.1，修复换行与 Git 检出造成的字节复现问题；数据语义不变。AI2-04/05 候选契约保留。PR #71 已更新到最新 phase2/integration 基线，但仍未获得 M8/M10/M1 或相关接口负责人的签字。修订说明见 [portability-review.md](portability-review.md)。

| 任务 | 交付 | 本地结果 | 正式验收剩余条件 |
| --- | --- | --- | --- |
| AI2-01 | [search-data-schema.md](search-data-schema.md)、JSON Schema、字典、校验与规范化代码 | 可执行、坏输入明确失败 | M6/M5/M3 确认原始/处理字段、实验补充项与业务映射 |
| AI2-02 | [search-labeling-record.md](search-labeling-record.md)、84 快照、38 请求、228 对候选标签及复核表 | 语料、候选初标与自动校验完成；用户确认 228/228 人工复核全部正确 | 用户提供逐条复核记录并归档校验；正式验收确认待完成 |
| AI2-03 | [search-split-manifest.md](search-split-manifest.md)、dev/test_candidate 清单、哈希与泄漏报告 | 固定分组/种子、确定性重建、违规计数 0 | 非作者复现及团队冻结；候选测试集不等于已封存测试集 |
| AI2-04 | [search-service-contract.md](search-service-contract.md)、contracts.schema.json、HTTP 形态样例 | 请求/响应/解释/版本/超时/降级候选及可执行检查 | M3/M6/M9 签字、统一 OpenAPI/SDK 和页面适配 |
| AI2-05 | [matching-task-contract.md](matching-task-contract.md)、事件/任务/结果/通知样例、生命周期规格测试 | 幂等/乱序/租约/版本/周期/去重规则与顺序模拟 | M6/M9/M4 接收；真实持久化与故障注入在 Phase 3 执行 |

配套：[verification.md](verification.md)、[handoff.md](handoff.md)。实现目录 scripts/m7_phase2；数据目录 data/m7-phase2；schema 目录 schemas/m7-phase2。

新增契约证据见 [contract-verification.md](contract-verification.md)，最新上游差异和待签字清单见 [contract-handoff.md](contract-handoff.md)。处理与校验代码不代替 AI2-09 的通用评估运行器。2026-09-28 个人交付当时不包含通用指标运行器；2026-10-08 联合候选已补齐指标骨架与复现材料，见 [joint-verification.md](joint-verification.md)。正式效果评估、模型比较和 AI2-10 本人批准尚未完成。

输入依据：

- [M7 Phase 1 交付提交](https://github.com/Huang0283/CampusLoop/commit/8d70d78555b7d3534293d35fdccee872d39cd708)。
- [Phase 2 任务文件](https://github.com/Huang0283/CampusLoop/blob/d6e61b6806b48ccf67e5ae64b2d36b5f6b7a6548/docs/issues/intelligence-phase-2-data-evaluation-contracts.md)。
- [当前前端 OpenAPI 草案](https://github.com/Huang0283/CampusLoop/blob/ea152239886293e41cfa469070b5c080dd4fe568/openapi/campusloop.v1.yaml)。
- 用户提供的《CampusLoop_M7_技术与任务进度文档》第 3.2、9 节。
