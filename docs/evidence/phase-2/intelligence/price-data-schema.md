# AI2-06 价格数据 schema、来源与质量门禁

## 状态与范围

- Owner：M8；版本：`m8-price-raw-v1`；数据集：`m8-price-eval-v1`。
- 当前只提交 12 条团队自建 L0 合成边界样本，用于 schema、规则覆盖和异常处理验证。
- 仓库没有经批准的真实成交数据。任何来源或含义无法证明的记录均被脚本拒绝，不进入评估。

机器可读内容位于：

- `schemas/m8-phase2/price-dataset.schema.json`
- `data/m8-phase2/raw/source-register.json`
- `data/m8-phase2/raw/price-samples.jsonl`
- `scripts/m8_phase2/pipeline.py`

## 一条记录的字段

| 字段 | 规则 | 含义 |
| --- | --- | --- |
| `sampleId` | 唯一，`m8-` 前缀 | 去标识评估 ID，不复用用户/订单 ID |
| `sourceId` / `sourceType` | 必须与来源登记一致 | 来源可追溯，禁止自由填写 |
| `licenseStatus` | `approved/restricted/unknown` | 只有 `approved` 能进入当前评估 |
| `labelLevel` | L0/L1/L2/L3 | 合成、挂牌、接受报价、完成交易四层严格分开 |
| `category` | 六个冻结枚举 | `digital/books/household/clothing/sports/other` |
| `condition` | 四个冻结枚举 | `new/like_new/good/fair` |
| `originalPriceFen` | 正整数分或 null | 卖家声明原价，不是真实标签 |
| `listingPriceFen` | 正整数分或 null | 挂牌价，不是真实成交价 |
| `acceptedOfferPriceFen` | 正整数分或 null | 被接受报价，订单仍可能取消 |
| `transactionPriceFen` | 仅 L3 可非空 | 双方完成且无未决争议的最终价格 |
| `purchaseAgeMonths` | 0–600 或 null | 未知保持 null，不能以 0 代替 |
| `accessoryState` / `defectTags` | 枚举/去重数组 | 只保存结构化事实，不收自由文本证据 |
| `listedAt/completedAt/extractedAt` | 带时区时间 | 检查未来时间、时间切分和有效窗口 |

金额始终以人民币“分”的整数存储和运算；接口展示时再转为元。禁止用二进制浮点比较金额。

## 来源与许可

| 来源 | 当前状态 | Phase 2 处理 |
| --- | --- | --- |
| PDS-03 团队合成边界样本 | approved | 可验证 schema、规则覆盖、确定性；不得声称预测准确率 |
| PDS-01 CampusLoop 挂牌记录 | restricted | 等 M5 授权及脱敏规则；不能自动当成交标签 |
| PDS-02 CampusLoop 完成订单 | restricted | 等 M5/M6 冻结授权、完成/争议口径后才能形成 L3 |
| PDS-05 未批准第三方平台 | unknown | 禁止收集、训练、评估和再分发 |

来源登记必须包含许可证据、允许用途、禁止用途、敏感性和 Owner。`approved` 但没有证据会整批失败。

## 清洗与异常规则

1. 严格拒绝未知字段、缺字段、重复 `sampleId`、未知枚举、负数/零金额、无时区时间和未来记录。
2. 来源类型、许可状态必须与来源登记完全一致；不得在数据行自行升级许可。
3. L0/L1/L2 的 `transactionPriceFen` 必须为 null；L3 必须同时有完成时间和成交价。
4. 原价、挂牌价、接受报价、成交价始终分列，缺失保持 null，禁止互相填充。
5. 同一订单链、重复发布或近重复商品在正式数据切分前必须分组；不得跨训练/测试集合。
6. 精确地点、姓名、邮箱、学号、聊天原文、举报证据、管理员备注和设备标识不得进入数据集。

异常值不静默删除：价格超出 schema 上限、时间顺序错误或字段语义冲突直接失败；合法但极端的价格保留并在切片/失败分析中计数。

## 时间有效性

- 规则参考样本只允许使用建议时点之前、最近 180 天内的合格记录。
- `listedAt <= extractedAt`；正式 L3 还必须满足 `listedAt <= completedAt <= extractedAt`。
- 正式评估按时间切分，测试集冻结后不得用于调参。
- 数据清单保存提取时点、行数、输入 SHA-256、schema 和规则版本；任何输入字节变化产生新哈希。

## 验收

在仓库根目录执行：

```text
python -m unittest discover -s scripts/m8_phase2 -p test_pipeline.py -v
python scripts/m8_phase2/pipeline.py verify
```

脚本应验证确定性重建，且对未批准来源、重复 ID、非 L3 成交标签、未知字段和缺少完成事实明确以非零退出码失败。

## 待外部确认

- M5：内部数据授权、脱敏、保留与访问角色。
- M6：订单完成、最终金额、争议和评价资格事实口径。
- M9：导出、密钥、运行目录及审计日志。
- M10：独立干净环境复现。

这些确认尚未发生；本文不得被理解为替相关成员签字。
