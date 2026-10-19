> 2026-10-19：228条审核已补录归档，当前新标签版本m7-label-reviewed-20261018-v1，状态HUMAN_REVIEWED_UNSEALED。使用 --review-archive 的实际新结果和命令见 [审核更新](human-review.md)。以下旧记录及默认草稿路径保持原语义；正式评估仍未通过。

> 2026-10-17 共同交付续版：当前准备技术基点为 `45acf879bf41c18baae4f89584c9e1732f848c97`，已整合未合并的 Phase4 PR #107。最新环境、联合命令、运行结果与接收状态以 [共同交付入口](joint-delivery/README.md) 为准；下方原个人基点与结果保留为历史，不是新冻结版本。原“坏响应统一降级未覆盖”问题已在该 P4 修复并由本轮诊断重放通过，正式阶段仍待接收。

# AI5-04 搜索与供需匹配：失败分析与适用限制

文档版本：`m7-p5-limitations-v0.1`；日期：2026-10-17；Owner：M7。
范围：基于集成基线 `6df25176866a6b1df2c1da5dcd28229b965f73ff` 和实验候选 `e4dc076d7a589f41b3d8cd61c246dabe67e9c39d` 的个人交付说明。最终阶段冻结和发布验收尚待完成，不把“最终说明文档”写成“已获最终上线批准”。

## 1. 保留基线与 NO_GO

当前保留关键词搜索 `m7-keyword-v0` 和规则供需匹配 `m7-match-v0` 路径。BGE + `m7-hybrid-rrf-v1` 已做真实推理和复现，仍为私有实验，`deploymentEnabled=false`，不进入正式语义服务。

在固定 test_candidate 的 12 条请求上，严格标签 label>=2 的搜索/匹配 MRR@10，基线与候选均为 1.0，相对提升为 0；搜索严格 P@5 均为 0.5。候选门槛要求 MRR 相对提升至少 10%、搜索 P@5 至少 0.7，因此候选未达标。门槛本身仍待正式批准，不能将其改低后声称达标。
当前基线 MRR 已达 1.0，上述提升会要求 1.1；8 个搜索请求只有 2 或 3 个严格正例，按固定分母 5 算，平均 P@5 上限就是 0.5。这是当前数据的评估限制，不靠继续调参解决。Phase 5 保持数据、划分、标签、参数和评估口径，不换集追逐数字。

## 2. 失败类别与边界样例完整保留

[limitations-audit.json](evidence/limitations-audit.json) 保存所有原始失败行、逐 split 计数、零计数类别、门槛失败和来源 SHA256；原始 [failure-analysis.json](evidence/author-reproduction-v1/candidate-eval/failure-analysis.json) 不覆盖。all/dev/test_candidate 的行会重复包含同一请求，不能把三份计数相加当独立样本量。

| 类别 | 当前证据与解释 | 处理/限制 |
| --- | --- | --- |
| 效果未优于基线 | 严格 MRR 无提升、搜索 P@5=0.5；Recall@10=1.0 不抵消前两项失败 | 保留 NO_GO；不把技术验证 PASS 当效果门槛通过 |
| 关键词同义词漏召回 | bicycle-search-natural 的商品 303，基线未召回，候选补回；label>=1 搜索 Recall@10 从 0.958333 到 1.0 | 303 仅为 label=1 弱相关，不是严格正例收益；不据此宣传模型显著提升 |
| 关键事实未知 | lamp-matching、tablet-matching 各含 U，主比较整条请求排除；all 共 2 条，dev/test_candidate 各 1 条 | U 不当负例，也不填成已知；真实使用中需用户补充成色/型号等事实后重算 |
| 求购过期 | tennis-matching-expired 返回 WANTED_INACTIVE；all/dev 均保留排除原因与错误码 | 属于应拒绝的状态边界，不算相关性失败，也不删除来美化成功率 |
| 无答案 | camera-matching-no-answer：基线和候选均返回空结果 | 保留空答案用例；该单个合成用例不足以证明真实无答案识别可靠 |
| 有正例却返回空 / 正例非首位 / 无答案误推荐 | 原报告 POSITIVE_NO_RESULT、POSITIVE_NOT_FIRST、NO_ANSWER_FALSE_RECOMMENDATIONS 当前观察为 0 | 零计数类别仍保留；每池仅 6 商品、样本过少，不能断言真实问题已消失 |
| 硬约束违规 | 当前报告 HARD_CONSTRAINT_VIOLATION=0，使用与基线相同的过滤 | 不以模型相似度覆盖预算、可见性、状态、发布者身份等硬约束 |
| 模型/索引不可用 | 正常评估的 candidateFallbackCount=0；缺模型/不兼容索引/旧事实等通过现有负向单测验证 | 无降级样例的正常评估不能代表已测尽故障；单测 fixture 与真实 BGE 运行分别标注 |
| RPC 坏返回 | 既有 client 对断连/超时等有降级，但没有覆盖所有坏 JSON/响应数据结构的统一安全降级；上游 M10 有坏返回诊断 | 不能声称“任何服务错误都能降级”；保留为发布门禁，见第 6 节 |

原失败生成器主要记录排除、正例空返/非首位、无答案误推荐、硬约束违规和 fallback，空 categories 不能推出 P@5 已达标。本文件另外保留聚合门槛失败，避免 MRR 很高掩盖低精度。

## 3. 可用范围与数据偏差

支持范围是结构化商品文本的关键词/型号检索、显式筛选以及求购条件匹配，不支持用结果承诺成交、价格合理或卖家可信，也没有图像检索、行为个性化或成交概率模型。

| 限制 | 实际影响 |
| --- | --- |
| 合成小样本 | 84 原始快照归并为 72 商品，38 请求、228 标签对；每 catalog 6 商品。与真实全量库、流行品类、长尾商品、自然用户查询分布不同 |
| 非独立封存测试 | dev=26、test_candidate=12 请求，后者仅 8 搜索/4 匹配且其中 1 匹配被 U 排除；小于任务门槛所需规模。作者已见标签，不能称正式盲测 |
| 人工复核归档 | 用户已确认 228/228 全对，保留这一事实；实际结构化有效记录仍为 0，labelSource=PENDING_HUMAN_REVIEW，testSetSealed=false；不能用人工改数代替归档 |
| 字典与桥接 | 合成词典与 live-dictionary-v1 分开；当前真实桥接的 categoryNames 使用类别 ID，可能削弱中文类别词命中。校区映射当前为 campusloop 常量，不能称已验证真实多校区隔离 |
| 权限与校园范围 | 搜索仅按公共可见性；匹配按调用者身份和事实可见性处理。hard_constraints 没有独立的“商品与求购必须同校区”规则，校区参与 campus 可见性判断；不能宣称存在未实现的同校区硬筛选 |
| 文本与语言 | 关键词词元/字段权重固定，拼写错误、口语、多义词、混合语言、型号别称覆盖有限；模型最多 512 token，长文本尾部截断，中文模型在其他语言或新领域未验证 |
| 事实缺失 | 有要求时，未知成色/地点/型号会成为 needs_info，不能猜测符合。地点匹配使用已有交集规则，不是距离排序或所有地点同时满足 |
| 商品池容量 | live 桥接最多 5000 商品，超过容量返回 SEARCH_CAPACITY_EXCEEDED，不静默截取为完整召回。候选是 SQLite 精确余弦扫描，不是已经验证的大规模 ANN 服务 |
| 模型/硬件偏差 | CPU float32 单机条件；没有 GPU/并发/多平台字节一致保证，也没有证明无预训练语料重叠 |

无点击、曝光或成交日志的独立统计，不能用这份样本推断群体公平性或用户满意度。真实数据引入和重新封存需经上游范围与许可确认，不在本次文档中擅自替换。

## 4. 新实体与进程冷启动

新商品/新求购没有行为历史时仍可按已知文本和显式约束运行基线；字段不足时只给条件匹配或空结果，不虚构语义证据。空查询及价格/最新排序保持基线路径，不为了演示候选强行赋语义分。

实验 Encoder 第一次 encode 才读取并核验模型文件、导入运行库、加载 tokenizer/model；运行时只从本地加载，不自动下载，不把缺权重问题当作已预热。私有 CLI 首次建库需要模型加载与文档编码，增量事件还要遵守 identity、事实哈希、实体版本和删除 tombstone。

本次补测一个新 Python 进程的首次查询，实际结果见 [first-query.json](evidence/limitations-v1/first-query.json)：

- 首次 encode（包含延迟加载/文件核验/相关导入）：5507.677 ms。
- 同一进程随后 5 次相同查询 encode：30.922, 29.170, 30.285, 28.163, 26.914 ms；向量一致性核对通过。
- 该进程峰值工作集：382.793 MiB。

这是单一 calculator-search-exact 编码探针，不含商品索引构建、HTTP、数据库或队列；操作系统文件缓存并未清空，不是重启机器后的冷缓存实验，也不足以给出首请求 SLA。测量过程没有调参或更换模型。

## 5. 延迟与资源：单机诊断，不是 SLA

下表固定引用此前 author-reproduction-v1 的同一 CPU 评估进程，模型已预热、逐个执行 24 搜索/14 匹配；不是本节首次编码探针，也不是端到端响应时间。

| 路径 | 搜索 P95 / P99（ms） | 匹配 P95 / P99（ms） |
| --- | --- | --- |
| 基线 | 2.388 / 2.393 | 2.311 / 2.311 |
| 实验候选 | 34.423 / 35.053 | 33.960 / 33.960 |

该评估进程峰值工作集 413.508 MiB；模型文件约 91.939 MiB；临时索引约 0.676 MiB。原 modelLoadAndTwoCorpusEncodingsMs=10701.184 ms，是“加载加两次语料编码”的混合计时，不能写成纯冷启动时间。

完整逐请求计时与测量范围见 [timings.json](evidence/author-reproduction-v1/candidate-eval/timings.json)。不同轮次/环境的结果单独保留，不择优拼接。尚未测并发、排队、持续压力、发布容器资源上限、数据库查询/重读、worker/outbox 和页面渲染，因此不能声明发布 SLA、峰值容量或内存配额达标。
内部基线 HTTPServer 为串行处理；后端 RPC timeout=1.5 秒不是端到端服务承诺，也不等于对本地降级计算设置了同等总耗时预算。

## 6. 降级与拒绝矩阵

| 触发条件 | 固定版本的行为 | 证据/验收边界 |
| --- | --- | --- |
| 服务未启用 | 后端本地基线，degraded=true，SERVICE_DISABLED | 后端源码；发布开关/页面仍需 AI5-09 联调 |
| 通过启用的 RPC 请求 semantic/hybrid | 当前桥接转基线 semantic，MODEL_DISABLED；服务未启用时按上一行标记 SERVICE_DISABLED；没有启动 BGE 正式服务 | 基线单测及本次真实 RPC smoke |
| 连接失败、HTTP 503/504、超时等已捕获传输异常 | client 运行同硬过滤的本地基线，记录 SERVICE_UNAVAILABLE / SERVICE_TIMEOUT，再校验输入时效和 wanted 状态 | 本次真实停服务回退；现有 client 相关单测；不是所有坏返回的保证 |
| 401/403/409/422 等非可降级错误 | 传递错误，不降级绕过权限、求购失效或旧快照 | 真实未认证请求 401、错误 token 不回退、已有边界单测 |
| RPC schema 标识错误或缺 data | INVALID_SERVICE_RESPONSE；目前并非统一转成本地基线 | client 固定源码；作为已知未覆盖恢复路径保留 |
| 坏 JSON、非对象 JSON、损坏的 data/items 结构 | 仍可能出现未统一处理的异常或不完整结果；后端依赖正确响应结构 | 上游 M10 坏返回诊断及当前未修改的 client/adapter；不能据正常 smoke 宣称已修复 |
| experimental=false / 缺 encoder/index | MODEL_DISABLED / DEPENDENCY_UNAVAILABLE，保留基线 | 仅实验 hybrid 分支；不是正式页面已验证 |
| 模型文件不匹配、加载/推理失败 | MODEL_ARTIFACT_MISMATCH / MODEL_LOAD_FAILURE / MODEL_INFERENCE_FAILURE 等候选不可用错误回退基线 | 实际模型校验 + 现有负向单测；故障注入 fixture 不充作真实模型推理 |
| 索引未就绪/不兼容/事实变旧 | INDEX_NOT_READY / INDEX_VERSION_MISMATCH / INDEX_FACTS_STALE 等明确回退；不返回旧向量结果 | 现有索引/混合负向单测，真实增量/删除检查 |
| 空查询、显式非相关性排序、无符合约束商品 | 返回基线/空结果，不伪装语义成功 | 现有混合单测和固定查询 |

预算、状态、可见性、发布者身份等校验先于候选故障回退；不会为模型可用性放宽权限。评分和解释保留真实 algorithm/model/dictionary/fallback 信息，模型不可用时不能继续挂语义模型已生效标记。

## 7. 分数与展示口径

keyword_v0、rule_match_v0、向量 cosine 与 rrf_v1 都是各自排序分，彼此不直接比较。RRF 是按名次加权，不是校准概率；前端将规则分换算成百分比或限制在 0～1，也不会使其成为成交率、准确率或模型置信度。
无查询时 relevanceScore 可能为 null、scoreType 为 unscored/constraints_only；必须展示为浏览/条件匹配，不能补写“100% 匹配”。本阶段未实现自动交易、自动惩罚、定价保证或成交预测。

## 8. 本次技术验证及正式接收

网络权限恢复后，保留此前 v1/v2 的失败，新增 v3：基线完整 verify、真实 RPC 认证/分页/参数拒绝、语义关闭及停服务回退均通过。候选固定提交的完整 semantic.verify 也已重新运行，具体测试数量、两次模型评估、独立重算与真实更新/tombstone 结果见 [verification.md](verification.md) 与 limitations-v1/candidate-verify。

这是作者技术验证，不能替 M8 互审、M3/M6/M9 发布环境联调、M10 从正式阶段提交全新安装独立复现或 M1 冻结签署。正式 Phase 5 分支尚无输入，当前仍是 prep；用户复核归档、数据许可接收和未批准门槛继续按 [handoff.md](handoff.md) 跟踪。
本文件不删除旧失败，不修改测试集，不因重新验证通过而将模型 NO_GO 改为 GO。
