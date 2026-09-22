# MQ1-03 需求追踪矩阵

完整候选矩阵见 [`docs/management/m1/requirements-traceability.md`](../../../management/m1/requirements-traceability.md)。矩阵字段固定为：需求 ID、候选描述、层级/优先级、主责、协作者、依赖、页面/服务、数据、正向场景、异常/权限场景、计划周次、最终证据和状态。

## 追踪门禁

1. 纳入范围的每行必须填写 Owner、依赖、验收场景和周次。
2. `todo`、`in-progress`、`blocked`、`review`、`done` 的含义采用 M10 工作流定义；`review` 不代表功能已经实现。
3. 需求变更必须记录价值、工作量、依赖、风险、被替换工作和复核人。
4. Phase 2 接收人按本矩阵把候选需求映射到页面/API/数据契约；Phase 3 才验证真实实现。
