# AI2-07 价格规则评估集与指标口径

## 当前结论

`m8-price-eval-v1` 含 12 条 L0 合成边界样本，当前 L3 完成交易标签为 **0**。因此本阶段只评估规则覆盖、区间合法性、确定性、解释/降级完整性；MAE、MAPE 和真实区间覆盖率均输出 `NOT_EVALUATED`，不以挂牌价冒充真实值。

## 标签分层

| 层级 | 字段依据 | 可报告内容 |
| --- | --- | --- |
| L0 合成 | 团队构造输入与预期状态 | schema、覆盖、边界、失败与确定性 |
| L1 挂牌 | `listingPriceFen` | 描述性分布；不可称成交误差 |
| L2 接受报价 | `acceptedOfferPriceFen` | 单独实验；不可与 L3 混合 |
| L3 完成交易 | `transactionPriceFen` + 完成时间 + 无未决争议 | MAE、MAPE、区间覆盖和宽度 |

当前样本的挂牌价只用于检查“字段没有被误当标签”。流水线明确要求非 L3 的成交价字段为空。

## 构造方式

- 六个类别均覆盖；四种成色、年龄未知、缺配件、瑕疵、低价和缺少原价均有样例。
- 11 条应返回 `LOW_CONFIDENCE` 的原价规则区间，1 条应返回 `INSUFFICIENT_DATA`。
- 全部来源为 PDS-03，许可用途仅限 schema、规则覆盖和合理性检查。
- 数据按 `sampleId` 排序，输出采用固定 JSON 序列化和 LF 换行，保证跨次重建稳定。

## 当前可执行指标

| 指标 | 定义 | 当前用途 |
| --- | --- | --- |
| `ruleCoverage` | 有合法价格区间的记录数 / 合法输入数 | 验证何时给区间、何时明确降级 |
| `statusConformance` | 实际状态与冻结预期一致的比例 | 检查规则行为没有漂移 |
| `boundsValidRate` | `lower <= recommended <= upper` 的比例 | 阻止非法/反向区间 |
| 确定性 | 同一输入与版本两次生成的文件哈希相同 | 支持干净环境复现 |
| 坏输入拒绝 | 未批准来源、坏 schema 等返回非零 | 防止静默吞错 |

L0 结果不能用于页面或汇报中的“准确率”宣传。

## L3 数据到位后的指标

同一冻结测试集上计算：

```text
MAE = mean(abs(recommendedFen - transactionPriceFen))
MAPE = mean(abs(recommendedFen - transactionPriceFen) / transactionPriceFen)
Coverage = mean(lowerFen <= transactionPriceFen <= upperFen)
NormalizedWidth = mean((upperFen - lowerFen) / transactionPriceFen)
```

正式评估还须满足：

- 基线与候选使用同一数据版本、过滤、时间窗和指标实现。
- 按类别、成色、价格段和月份报告样本数；不足 30 条的切片不作通过/失败结论。
- 低价样本不得为美化 MAPE 被静默删除；如预先设阈值，必须同时报告被排除数。
- 同一商品/订单链和近重复记录不得跨集合；测试集不得用于调参。
- 逐样本输出、失败样例、环境、提交号、起止时间和原始日志必须保留。

## 生成物

- `data/m8-phase2/derived/price-evaluation.jsonl`：逐样本规则结果，挂牌/成交字段分列。
- `data/m8-phase2/derived/metrics.json`：当前 L0 指标与 `NOT_EVALUATED` 声明。
- `data/m8-phase2/derived/manifest.json`：版本、数量和输入哈希。

运行：

```text
python scripts/m8_phase2/pipeline.py build
python scripts/m8_phase2/pipeline.py verify
```

## 限制与下一步

当前结果只能证明规则骨架可运行、数据口径没有混淆，不能证明建议价格准确或模型可上线。M5/M6 批准真实数据口径后，M8 才能建立 L3 时间切分；M10 独立复现并由 M8/M10/M1 通过预先冻结的门槛后，候选模型才可能进入 Phase 4。
