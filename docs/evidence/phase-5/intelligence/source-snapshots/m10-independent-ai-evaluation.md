# MQ4-03 独立智能评估
执行日期：2026-10-12。由 Codex 根据 M10 陈梓弘授权实际执行，不冒充真人签署。候选检出固定为 `e4dc076d7a589f41b3d8cd61c246dabe67e9c39d`，远端 prep/m7-p4-semantic-matching；生产 main 仍为 `829ffbfc7f5c310917b2ff7c9627fe98b117824a`，没有把候选合入业务。

## 输入与方法
同一 m7-synthetic-p2-v1.1 数据，72 个商品、38 个请求（搜索 24、匹配 14），dev 26、test_candidate 12；m7-label-draft-v1/PENDING_HUMAN_REVIEW。标签逐条记录未归档 humanReviewedPairs=0、testSetSealed=false，不表示用户从未看过数据，也不捏造 reviewer/time。
真实 BAAI/bge-small-zh-v1.5，revision 7999e1d3359715c523056ef9478215996d62a620，512 维；权重 SHA256 354763b9b1357bc9c44f62c6be2276321081ed2567773608c0d0785b61d5a026。Windows Python3.12.14/CPU，按候选锁文件安装32个依赖。权重只在本机缓存，不进 Git。
关键词基线与 hybrid RRF 候选在同一输入上实际推理两次；严格相关 label>=2，MRR/Recall@10 与 Precision@5，无测试标签调参。全/开发/候选测试逐样本和汇总在 ai-evaluation/；input/rankings 俱全。archive_evaluation.py 校验候选源码哈希、用原计算器重算所有指标，再以独立公式重新核对严格 MRR/Recall/Precision。比较完整逐请求、failure-analysis、输入、汇总与向量/索引身份，两次完全一致；允许误差1e-12。独立核对 PASS，不等于正式模型效果 PASS。

## 实际结果与结论
test_candidate 搜索：基线 MRR@10=1.0，候选=1.0，相对提升=0；Recall@10=1.0；Precision@5=0.5。匹配：基线与候选 MRR@10 均1.0，提升0，Recall@10=1.0。
候选门槛要求相对提升至少0.1、Recall@10>=0.8，搜索 Precision@5>=0.7；目前提升和搜索精度不通过。12个测试请求少于100、切片少于30、未冻结/复核的标签，不能据此说模型优于基线。正式结论 NO_GO，仅实验展示。阈值本身是 CANDIDATE_NOT_APPROVED，不声称 M1/M10 已正式批准。
单进程预热、一次请求通道：搜索候选 p95 28.8098ms/p99 29.3853ms，匹配 p95/p99 28.8136ms；峰值进程内存433.53125MiB。这不是并发/SLA证据。原始 timing 范围说明与逐请求值保留。
向量 SHA718110cf20b775b9778a6eaf4d1848b225961eb0dfeca3760365d5ea9d72e0ed；逻辑索引 SHA a4cf2f21b16614d56a175c8d72ae17dad138e75f38d2c8f2832af64da4790cfb。只承诺同机实测一致。

## 其他能力与环境差异
本次搜索与匹配两个能力的基线/候选均独立运行，满足 MQ4-03 的“至少两个”诊断执行要求。M8 main 的价格/信誉/风险规则另独立验证17单测、9固定样例全部通过，两次字节一致，见 m8-rule-verification/；没有 Phase4 M8 学习候选，所以不伪造候选比较或预测精度。
候选完整 Windows verify 的33个 Phase4单测通过，但 Phase3 的31项回归出现4个loopback网络错误和1个超时原因差异，总脚本FAIL。相同候选源在 Linux 容器31项全通过，不能把平台差异隐藏或把完整Windows verify写PASS。

## 复现
在候选干净检出安装候选锁依赖、下载并校验固定模型；模型目录不得进仓库。分别运行两次：
```text
python -m services.m7_semantic.evaluate --model-dir <pinned-model-dir> --output-dir <empty-run1>
python -m services.m7_semantic.evaluate --model-dir <pinned-model-dir> --output-dir <empty-run2>
python scripts/quality_phase4/archive_evaluation.py --candidate <candidate-checkout> --first <run1> --repeat <run2> --output <archive-dir>
python scripts/quality_phase4/check_archived_evidence.py
```
最后一条无需模型下载，验证已提交证据哈希与独立严格公式，不替代最新代码的实时评估。输入未批准仍保留 NO_GO，不改标签来满足门槛。
