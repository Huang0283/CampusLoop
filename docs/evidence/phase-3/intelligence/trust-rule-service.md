# AI3-06 M8 信用聚合规则

实现位于 `services/m8_baseline/engine.py::trust_summary`，版本 `m8-trust-rule-v1`。

只有同时满足以下条件的事件才进入信用聚合：事件类型属于 SALE/PURCHASE/REVIEW、状态为 COMPLETED、`disputed=false`、`invalid=false`，且评分为 1～5 的整数。取消、争议、无效或格式错误事件全部计入 `ignoredEventCount`，不会提高正常信用分。

新用户或没有有效事件的用户返回 `NEW_USER_NEUTRAL` 和中性分 3.5/5。有效事件使用先验分 3.5、先验权重 5 的平滑公式：

`score = (3.5 × 5 + 有效评分总和) / (5 + 有效事件数)`

结果保留两位小数，并返回有效/忽略事件数、平滑参数、解释因素和算法版本。
