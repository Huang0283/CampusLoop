# AI3-07 M8 风险线索规则

实现位于 `services/m8_baseline/engine.py::risk_clues`，版本 `m8-risk-clue-rule-v1`。候选线索包括 24 小时支付失败、1 小时集中发布、24 小时交易对手集中、7 天共享设备账号和 7 天举报聚集。

每条命中线索包含规则代码、字段、观察值、阈值和中文解释。命中任一线索时只返回 `manualReviewRecommended=true` 与 `recommendedAction=MANUAL_REVIEW`。

安全边界：

- `enforcementExecuted` 永远为 `false`。
- 函数只读输入并通过测试验证不修改输入对象。
- 不执行封禁、处罚、下架、订单变更或账号状态变更。
- 线索不代表违规结论，必须由人工或后端授权流程复核。
- 对外公开接口不得暴露线索、阈值、设备聚类等内部字段。
