# AI3-04 固定基线诊断报告

固定数据 m7-synthetic-p2-v1.1，种子 20260926，标签 m7-label-draft-v1，字典 m7-fixture-dictionary-v1；历史 asOf=2026-09-26。参数固定 4/2/2/1，无随机模型、无 test_candidate 调优。72 商品、38 请求、228 对待人工复核标签，每请求使用所属 catalog 的完整六商品池；catalog 分组 dev/test_candidate 分开运行并保留 all 诊断，不将 all 当作封存测试。

状态 DIAGNOSTIC_ONLY，人工复核 0/228，模型效果未评估。以下数值是草稿数据上的确定输出，绝非真实交易效果、线上全库召回或获批 Phase 4 基准。

| 范围（all，草稿 label>=2） | 正样本查询 | P@5 | 池内 R@5 | MRR@10 | 硬条件违规 |
| --- | --- | --- | --- | --- | --- |
| search | 24 | 0.500 | 1.000 | 1.000 | 0 |
| matching | 10 | 0.420 | 1.000 | 1.000 | 0 |

P@5 分母固定为 5；候选不足 5 的空位仍计入分母。Recall 只对该完整六商品池的已有标签计算。匹配三请求排除：lamp/tablet 含未解决 U，tennis 到期是状态边界；另有一个合法无答案查询，空结果准确率 1、误推荐 0。无答案不混入正样本 MRR/Recall。全部返回候选仍接受硬约束审计。

原始结果见 evidence/m7-v0/autocrlf-false/evaluation/per-query.json，所有 split 的 evaluation-input 与 metrics 文件可用统一脚本独立重算。两个干净检出及同一检出两次计算结果字节一致。指标程序和数据 schema 未改动。

三类实际失败记录在 evidence/m7-v0/failure-cases.json：

1. 词面召回遗漏：bicycle-search-natural 未召回 303，草稿 label=1；影响 label>=1 敏感性 Recall，而非 label>=2 主口径。
2. 软目标过召回：calculator-search-exact 召回 TI-83（103）作为第三项，属于同类弱相关，不满足查询里 TI-84 的完整意图；未显式填 requiredModel，不能偷偷把文本变硬约束。
3. 排序倒置：calculus-search-exact 的下册 403 排在真正上册的改写标题 402 前；分别为草稿 label=1/2。首项命中带来的 MRR=1 未揭示该缺陷。

三类均依据既有草稿标签，仍待真人确认。当前模板化合成集合过于简单，MRR=1 没有“相对提升 10%”的空间；它适合复现与边界检查，不能作为模型上线公平效果评估的充分数据。应由 M7/M10 收集授权、独立复核、数量足够的正式数据后封存，不能根据本次测试结果修改候选标签或测试集。
