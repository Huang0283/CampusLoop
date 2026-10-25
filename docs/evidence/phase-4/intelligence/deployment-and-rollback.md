本文件保留 M8 原部署说明。M7/M8 最新联合步骤、坏返回修复与实际回滚证据见 [联合部署与回滚](joint-delivery/deployment-and-rollback.md)。

---

# AI4-09 M8 部署与回退说明

## 当前部署决策

候选功能保持关闭；有效路径为 `m8-price-phase4-router-v1 -> m8-price-rule-v1`。没有模型包、模型加载动作或新外部依赖。

机器可读服务契约：`contracts/m8-phase4/service-contract.json`。

## 回退矩阵

| 情形 | 行为 |
| --- | --- |
| 候选开关关闭 | 直接使用 Phase 3 规则 |
| 数据/审批门禁 No-Go | 不调用候选，使用 Phase 3 规则 |
| 模型缺失 | 使用 Phase 3 规则 |
| 调用超时 | 使用 Phase 3 规则 |
| 候选异常 | 使用 Phase 3 规则 |
| 无结果 | 使用 Phase 3 规则 |
| 低置信度 | 使用 Phase 3 规则 |
| 模型/特征版本不匹配 | 使用 Phase 3 规则 |
| 区间反向、非整数或解释缺失 | 使用 Phase 3 规则 |

回退输出携带 `fallbackReason`，但不包含异常正文、凭据或用户数据。路由和模型都不得执行业务写入。

## 回滚步骤

1. 将 `candidate_enabled` 设为 `false`；无需重新训练或迁移数据。
2. 确认 `selectedEngine=PHASE3_RULE_BASELINE`。
3. 运行 M8 Phase 4 单元测试，确认启用失败路径与关闭路径的 `data` 完全一致。
4. 若集成服务仍异常，沿用 Phase 3 客户端的 `MANUAL_PRICE_ENTRY` 降级，不阻塞发布。

自动测试已经覆盖上述候选失败类型和“关闭即恢复 Phase 3”一致性。M6/M9 仍需在实际部署环境确认配置来源、健康检查、审计日志和回滚权限。
