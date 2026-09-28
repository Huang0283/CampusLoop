# AI2-02 搜索与匹配标注记录

版本：m7-p2-data-v1，2026-09-26。状态：合成试运行集已构建、候选初标及自动一致性校验完成；人工复核/裁决未完成。不得将 assistant 初标写成 M7 本人或 M8/M10 签字。

## 1. 实际资产规模与覆盖

本轮构造 12 个独立小语料：计算器、显示器、自行车、高数教材、键盘、电风扇、台灯、相机、耳机、平板、吉他、网球拍。每个含 6 件当前商品。总计 84 条原始快照，其中 12 条旧版本保留在原始文件并记录淘汰原因；处理后 72 件商品。

38 条请求=24 条搜索（每类精确词与自然语言各一条）+14 条匹配（12 条正常求购、1 条有效但无答案求购、1 条到期边界）。每条请求都判断所属 catalog 的全部 6 件商品，共 228 对标签，没有只挑算法返回的候选。

这是“每场景六件商品”的完整判断，不是全项目库存标注。如果以后将 72 件合为同一检索库，必须补齐查询与其他 catalog 商品的标签；不能直接用当前结果报告全库 Recall。

## 2. 标签与标注过程

| 标签 | 定义 | 本轮数量 |
| --- | --- | --- |
| 2 | 明确对应所求型号/版本，且没有硬条件失败或未知 | 85 |
| 1 | 相关但不完全符合文本目标；例如同类不同型号且未设型号硬条件 | 24 |
| 0 | 不相关或任一硬条件失败，即使文字高度相似 | 117 |
| U | 关键硬条件未知，且没有其他已知失败 | 2 |

合计 228。所有记录 human reviewer/adjudicator=null、reviewStatus=pending_human_review。没有调用检索排序或模型输出生成标签：语义候选判断在 raw/semantic-drafts.jsonl 中逐对保存；程序只规范化字段、枚举硬条件并组合最终候选标签。

[场景卡](../../../../data/m7-phase2/raw/scenario-cards.json) 说明构造意图；[语义初标](../../../../data/m7-phase2/raw/semantic-drafts.jsonl) 保存初标理由和来源；[完整标签](../../../../data/m7-phase2/derived/labels.draft.jsonl) 逐对保存语义标签、最终标签、每项硬条件的 observed/required/outcome。author 固定为 assistant:synthetic-draft，表示本次辅助生成会话。

硬条件包括求购有效性、商品状态/删除、可见性、排除自匹配、类别、预算、成色、地点及必需型号。权限判断是合成条件校验，不是调用真实鉴权服务。

## 3. 代表样本与失败边界

| 请求/商品 | 条件 | 候选结论 |
| --- | --- | --- |
| calculator-matching / 101 | 100 元，下限等值，目标型号 | 标签 2 |
| calculator-matching / 102 | 200 元，上限等值，同义表达 | 标签 2 |
| calculator-matching / 104 | 200.01 元，文本相同 | 标签 0，超预算 |
| calculator-search-exact / 103 | 相关型号 TI-83，搜索未设置型号硬条件 | 标签 1 |
| calculator-matching / 103 | 求购要求 TI-84 Plus | 标签 0，必需型号不符 |
| keyboard-matching / 506 | 商品卖家等于求购发布者 | 标签 0；普通公开搜索可以展示该商品 |
| bicycle-search-exact / 306 | 私有商品，匿名请求 | 标签 0，不可见 |
| lamp-matching / 701 | 售价 0，预算下限 0 | 标签 2；0 不是缺失 |
| lamp-matching / 706 | 要求八成新，商品成色为 null | U，待补信息/裁决 |
| tablet-matching / 1006 | 指定 iPad 9，商品结构化型号为 null | U，不从相似标题猜必需字段 |
| camera-matching-no-answer | 有效求购，预算上限 0，目录无免费相机 | 六项均 0，作为无答案查询单列 |
| tennis-matching-expired | expiresAt=asOf | 六项均 0，作为状态边界，不混入排名质量主指标 |

其他样本覆盖已售、隐藏、已预约、删除、跨校受限可见、交易地点冲突、成色不足、较旧商品，以及中英/同义表达。当前集没有穷尽错别字、任意类别错误、复杂规格、真实隐私文本或长尾需求，后续应按真实错误扩充。

## 4. U、无答案及主指标资格

lamp-matching、tablet-matching 各含一个 U。它们的整条请求从所有方案的主比较中一致排除，不能只删 U 商品再补位。tennis-matching-expired 单独做状态回归，不参与相关性主报告。排除记录在 [exclusions.json](../../../../data/m7-phase2/derived/exclusions.json)。

排除后剩余 35 条结构上可比较的请求，其中 1 条是有效无答案查询；这些仍未通过人工标签审核，因此当前主性能报告可用的“已批准查询数”为 0。主 P/R/MRR 只在有正例且已批准的同一集合计算；无答案单列。

## 5. 人工复核与裁决入口

提供 [review-queue.csv](../../../../data/m7-phase2/derived/review-queue.csv)，有 228 行并保留原始候选标签。reviewer、reviewLabel、reviewReason、reviewedAt、dispute、adjudicator、finalLabel、adjudicatedAt 当前全部留空，表示未执行而非无争议。

建议流程：

1. M7 核对数据来源和每个场景定义；需要独立初判时隐藏 candidateLabel/candidateReason 两列，先按 query、filters、商品事实填写 reviewLabel，再展开对照，避免锚定。
2. M8 独立逐条复核并填写真实姓名/标识、时间、标签与理由。不要直接把候选列复制为通过。
3. 差异进入 dispute，指定裁决者依据业务事实处理。补字段会改变数据，必须更新原始资产版本和哈希；不能只改标签掩盖缺失。
4. M10 抽查硬边界和指标可计算性。只有审批后的标签另存新 labelVersion，才进入正式评估；不得覆盖本轮原始候选记录。

本轮实际复核：程序验证标签对全覆盖、枚举合法、版本选择和硬条件一致性，并运行边界测试。它与初标同属本会话，不能称为独立人工复核。AI2-02 正式验收剩余项就是实际复核、争议裁决与记录确认。
