# AI2-03 数据划分与泄漏检查

版本：m7-p2-data-v1.1，2026-09-28。修订只统一 JSON/JSONL 输出为 LF、固定 Git 字节检出并更新 manifest，划分/种子/标签语义不变。验证范围见 [portability-review.md](portability-review.md)。不是封存、未见或团队已冻结的测试集。

## 1. 划分对象与结果

本轮不训练模型，采用 dev / test_candidate 两部分；没有把无用途的 train 集硬拆出来。语料单位为 catalog，语义/模板家族、实体与近重复关系以连通分量整组划分。

| 集合 | 场景库 | 当前商品 | 请求 | 标签对 |
| --- | --- | --- | --- | --- |
| dev | 8 | 48 | 26 | 156 |
| test_candidate | 4 | 24 | 12 | 72 |
| 总计 | 12 | 72 | 38 | 228 |

精确 ID 清单见 [dev.json](../../../../data/m7-phase2/derived/splits/dev.json) 与 [test_candidate.json](../../../../data/m7-phase2/derived/splits/test_candidate.json)。两集合的商品、请求和标签对互不重叠；12 条旧快照跟随其当前商品所属组，不另外参与排名。

## 2. 确定性规则

固定 seed="20260926"。先对全部输入排序并构建关系图：

- 同 entityId 的商品必须同组；相同产品的多个版本首先归约到当前快照。
- 同 nearDuplicateGroup 的商品同组；本轮每个明确的产品/语义家族整体归组，包含正例及难负例。
- 同 templateGroup 的请求同组；精确与自然语言改写、匹配请求不跨组拆开。
- 跨 catalog 文本用 NFKC、casefold、仅保留字母数字规范化。完全相同的非空文本连边；长度均至少 8 时，SequenceMatcher(autojunk=False) 相似度≥0.90 也连边。商品比较 title+description，请求比较 queryText。

取连通分量，用 SHA256(seed + "|" + 排序后的 catalog IDs) 排序；前 floor(组件数×2/3) 组进 dev，其余进 test_candidate，至少各有一组。数据过度关联只剩一个组件时明确失败，不能为了凑比例切断泄漏关系。

本轮实际得到 12 个组件、跨集合违规计数 0。比例按组数而非样本数，所以请求和标签对不是严格 2:1。划分不使用标签分布调优；样本覆盖有限，不据此宣称统计代表性。

## 3. 文件与哈希

[manifest.json](../../../../data/m7-phase2/derived/manifest.json) 保存数据/schema/标签/字典版本、seed、每个原始文件和处理后文件的 SHA-256，以及 schema、处理脚本和依赖锁文件哈希。清单不对自身递归计算哈希。外层交付包另给完整文件清单。

[leakage-report.json](../../../../data/m7-phase2/derived/leakage-report.json) 保存分组方法、组件、跨 catalog 关系、违规项、阈值及限制。[snapshot-audit.jsonl](../../../../data/m7-phase2/derived/snapshot-audit.jsonl) 保存 12 条旧快照的归约原因。

verify 校验输入/输出及脚本哈希，并在临时目录从 raw 重新构建，要求整个 manifest 字节一致。追加、删除、篡改标签或拆分文件会失败。变更原始数据、代码、字典或依赖后应产生新版本，不只更新一个哈希让旧报告继续通过。

## 4. 实际验证与边界

本次验证覆盖：输入顺序颠倒后组归属不变；人为制造跨 catalog 模板重复会先合组；制造跨 catalog 相同文本会先合组；原始或处理文件篡改会被发现；从同一原始资产重建字节一致。执行详情见 [verification.md](verification.md)。

这些检查只能发现声明的实体/模板关系与当前文本启发式相似，不能证明不存在所有语义近重复，更不能证明预训练模型没见过相关商品知识。真人复核时应检查遗漏家族并更新关系图。

## 5. 候选测试集与正式封存

本轮标签对创建者可见，review-queue.csv 也包含 test_candidate，因此不能称“从未看过的测试集”。当前用途是验证数据、标注与划分流程，不可用于挑模型后再对外声称未见测试结果。

M8/M10 实际复核与裁决后，M7/M10 确定最终分组和文件哈希，由指定保管人记录冻结提交、时间、访问范围和标签版本；开发期间不查看保留集标签调权重。若已经依据候选测试结果调整方案，应另外构造并封存未用于调参的评估集。

AI2-03 的本地技术交付已经具备；团队签署冻结和真实独立复现仍待执行。由于现有 Phase 1 输入接收未全部闭合，本文件不宣称 Phase 2 阶段验收完成。
