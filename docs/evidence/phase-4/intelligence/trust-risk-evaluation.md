# AI4-08 信誉与风险规则评估（M8）

## 结论

Phase 4 继续采用版本化规则，不训练“信誉模型”或“欺诈概率模型”。固定用例全部满足以下安全性质：

- 新用户保持 `NEW_USER_NEUTRAL`，没有把中性先验当已验证信誉事实；
- 取消、争议及无效事件不增加信誉；
- 风险输出只有 `NONE` 或 `MANUAL_REVIEW`；
- `enforcementExecuted` 始终为 `false`；
- 输出不包含 `fraudProbability` 或 `riskScore`，不宣称欺诈识别。

原始结果：[`evidence/m8-v1/trust-risk-evaluation.json`](evidence/m8-v1/trust-risk-evaluation.json)。

## 边界

当前服务是 trusted-backend-only。公开 DTO 的最终字段过滤属于 M6 边界，不能由 M8 代签；M8 的结果只能作为内部人工复核线索。举报持久化、权限校验、去重与审计链仍须由 M6/M9/M10 在集成环境独立验证。

由于没有经批准的风险真值标签，本阶段没有运行可选风险模型实验。这避免把规则命中率包装成“欺诈准确率”。

