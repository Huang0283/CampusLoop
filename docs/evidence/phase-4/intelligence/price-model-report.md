# AI4-07 价格基线与候选评估报告（M8）

## 评估结论

候选因数据门禁 `NO_GO` 未训练。统一评估脚本仍逐条运行 12 个 L0 样本，验证候选请求全部安全回退到 Phase 3，回退后输出一致率为 **100%（12/12）**。

原始逐样本结果：[`evidence/m8-v1/price-comparison.json`](evidence/m8-v1/price-comparison.json)。

| 指标 | Phase 3 基线 | Phase 4 候选 | 说明 |
| --- | --- | --- | --- |
| MAE / NMAE | `NOT_EVALUATED` | `NOT_EVALUATED` | L3=0 |
| MAPE | `NOT_EVALUATED` | `NOT_EVALUATED` | 未用挂牌价代替成交价 |
| 区间覆盖率/宽度 | `NOT_EVALUATED` | `NOT_EVALUATED` | 无真实成交标签 |
| 类别漂移 | `NOT_EVALUATED` | `NOT_EVALUATED` | 无有标签类别切片 |
| 时间漂移 | `NOT_EVALUATED` | `NOT_EVALUATED` | 无有标签时间切片 |
| No-Go 回退一致率 | 100% | 100% | 同一规则输出 |

## 统一口径

`services/m8_phase4/metrics.py` 只接收 `labelLevel=L3_COMPLETED` 且成交金额为正整数的记录。未来基线和候选必须调用同一实现、使用同一封存测试集与过滤条件。NMAE、相对改善和切片恶化门槛沿用 Phase 2 预登记文件，不允许看结果后下调。

## 失败分析

当前失败来自数据与治理前置条件，而不是模型数值：测试集版本错误、未封存、L3 数量为 0、PDS-02 仍受限、M5/M6 授权未归档、类别切片不足。因此合理动作是停止训练并保留规则，而不是补造指标或放宽门槛。

开发机仅测得 No-Go 到规则的路由开销，见 [`evidence/m8-v1/latency-dev.json`](evidence/m8-v1/latency-dev.json)。该数据标记为 `DEV_DIAGNOSTIC_NOT_SLA_EVIDENCE`，不能代替 M10 在冻结环境中的候选 p95/p99 验收。

