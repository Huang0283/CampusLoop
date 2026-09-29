# AI2-08 价格、信誉与风险服务契约

## 契约版本与原则

- 契约版本：`m8-contract-v1`。
- 价格规则：`price-rule-v1.0-phase2`；信誉规则：`trust-rule-v1.0-phase2`；风险规则：`risk-rule-v1.0-phase2`。
- 金额为人民币整数分；时间为带时区 ISO 8601；客户端不得指定权限身份。
- 所有输出包含版本和降级状态。智能服务超时或失败不得阻塞发布、举报或交易。
- 风险信号只是内部人工审核线索，不能自动封禁、下架、取消订单、修改信誉或宣称欺诈概率。

可执行策略和样例位于 `contracts/m8-phase2/`，校验命令为：

```text
python scripts/m8_phase2/contract_check.py
python -m unittest discover -s scripts/m8_phase2 -p test_contracts.py -v
```

## 价格建议：公开接口

请求（认证用户或匿名发布草稿均可；用户身份由网关决定）：

```json
{
  "category": "digital",
  "condition": "good",
  "title": "Example monitor",
  "originalPriceFen": 150000,
  "purchaseAgeMonths": 18
}
```

响应固定字段：`status/currency/lowerFen/upperFen/recommendedFen/basis/sampleSize/dataWindow/factors/ruleVersion/datasetVersion/degraded/degradationReason/disclaimer`。

状态：`AVAILABLE`、`LOW_CONFIDENCE`、`INSUFFICIENT_DATA`、`UNAVAILABLE`。区间不存在时三个价格字段必须同时为 null；不得返回部分区间或伪精确价格。建议只作参考，卖家可手动定价。

当前 OpenAPI 使用元和较少字段，属于待 M3/M6 确认的兼容差异：后端边界必须精确完成元/分转换，SDK 更新前不得宣称契约已冻结。

## 公开信誉

请求只含被查看用户 ID；访问者和权限范围来自会话。公开响应固定为：

```json
{
  "status": "ESTABLISHED",
  "completedTransactions": 6,
  "validReviewCount": 4,
  "smoothedRating": 4.3,
  "summary": "基于 4 条已完成交易评价",
  "ruleVersion": "trust-rule-v1.0-phase2",
  "factsVersion": "orders-reviews-v1",
  "updatedAt": "2026-09-29T00:00:00Z",
  "degraded": false
}
```

新用户返回 `NEW`，计数为 0，`smoothedRating=null`；不得把 4.0 的先验当成真实用户评分。公开信誉只由完成订单和有效评价事实组成，不含取消、举报、风险命中、聊天、内部权重或管理员备注。

## 风险：公开与管理员严格分离

普通用户公开响应只允许：

```json
{"reportingAvailable": true, "message": "如发现问题，请通过举报入口提交，由管理员审核。"}
```

以下字段禁止出现在公开响应及公开解释：`caseId/signals/priority/recommendedAction/decision/rulesetVersion/evidenceRefs/threshold/riskScore/fraudProbability/reporterId/adminNote`。

管理员读取风险案件必须同时满足 `ADMIN` 角色、具体案件范围授权和审计记录。内部响应可含案件 ID、结构化信号、证据引用、队列优先级和 `MANUAL_REVIEW` 建议；`decision` 初始必须为 null。风险服务不能执行治理动作。

## 权限矩阵

| 能力 | 普通用户 | 对象本人 | 案件管理员 | 智能服务 |
| --- | --- | --- | --- | --- |
| 价格建议 | 可请求公开建议 | 同左 | 可诊断版本 | 读批准商品字段 |
| 公开信誉 | 可读最小聚合 | 可读来源计数/申诉入口 | 可查审计事实 | 只聚合批准事实 |
| 举报 | 可提交 | 可看自己的处理通知 | 案件内最小证据 | 不作最终决定 |
| 风险信号/阈值 | 不可读 | 不可读原始内部线索 | 案件授权内可读 | 只创建/更新线索 |
| 封禁/下架/取消 | 无 | 无 | 走 M5/M6 治理接口 | 永久无权限 |

## 超时与降级

| 能力 | 超时预算 | 降级 | 是否阻塞业务 |
| --- | ---: | --- | --- |
| 价格建议 | 300 ms | 手动输入价格 | 否 |
| 公开信誉 | 200 ms | 仅显示事实计数或“暂不可用” | 否 |
| 风险规则 | 500 ms 异步预算 | 举报持久化后进入人工待处理队列 | 否 |

同一请求重试必须使用业务幂等键；不得因重复事件制造重复风险案件。缓存必须携带事实版本和更新时间，过期缓存不得冒充实时结果。

## 样例覆盖

`contracts/m8-phase2/examples/` 包含价格成功/数据不足、新用户/已建立信誉、管理员风险案件、公开安全响应和超时降级。校验器还通过负向测试证明：公开风险字段泄漏、自动决定、新用户伪评分和阻塞式降级均明确失败。

## 交叉确认（不得代签）

| 人员 | 需确认内容 | 当前状态 |
| --- | --- | --- |
| M3 | 页面字段、状态、免责声明和空态 | PENDING |
| M5 | 公开/本人/管理员权限、案件证据与申诉 | PENDING |
| M6 | 商品/订单/评价/争议事实和元分映射 | PENDING |
| M9 | 超时、异步队列、缓存、审计与配置 | PENDING |
| M10 | 负向测试与独立复现 | PENDING |

在相应负责人于 PR 留下明确确认前，AI2-08 是“技术候选可评审”，不是“跨组已冻结”。
