# AI3-05 M8 价格规则服务

实现位于 `services/m8_baseline/engine.py::price_advice`，版本 `m8-price-rule-v1`。规则沿用 Phase 2 已冻结的品类折旧、成色区间、年龄衰减、缺陷/配件折减和整数分单位。

## 输出语义

- 有原价锚点时只返回 `intervalFen.lower/upper`，状态为 `LOW_CONFIDENCE`。
- 无原价锚点时返回 `INSUFFICIENT_DATA`，上下界均为 `null`。
- 返回影响因素、规则版本、样本数和降级原因。
- 固定中文提示明确“仅供参考、不保证成交、自主定价”。
- 不返回“保证成交价”或伪造的精准预测值。

Phase 2 数据中合格 L3 成交标签为 0，因此本阶段只验证范围有序、边界状态、因素解释和确定性，不报告 MAE、MAPE 或区间覆盖率。
