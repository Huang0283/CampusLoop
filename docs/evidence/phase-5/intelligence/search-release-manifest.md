# AI5-01 搜索与供需匹配版本清单

清单版本：`m7-p5-inventory-v0.1`；记录日期：2026-10-17；状态：`PREPARED_NOT_FINAL_RELEASE`。
机器清单见 [release-inventory.json](release-inventory.json)。固定的是可检出的代码和资产，最终冻结提交、标签及发布环境版本尚待 M1/M10 确认。

## 1. 三类版本及其用途

| 范围 | 固定提交/版本 | 用途与结论 |
| --- | --- | --- |
| 当前集成代码 | `6df25176866a6b1df2c1da5dcd28229b965f73ff` | Phase 4 集成快照；已包含 PostgreSQL 事实桥接、基线 RPC、业务匹配任务和页面消费者；不等于最终发布冻结 |
| M7 实验候选 | `e4dc076d7a589f41b3d8cd61c246dabe67e9c39d` | 独立检出才有 `services/m7_semantic`；真实 BGE + 混合检索实验，`NO_GO`，不接入正式服务 |
| M1 冻结证据 | `ae79224f418aafaaa9620a17a5dd8e64a9fef689` | 2026-10-12 任务分支记录 `BLOCKED`，freeze commit/tag 均为 null；不是冻结批准 |
| M10 独立诊断证据 | `1cc5cbf7633017ea69560cc2f43e0e308658b1da` | 独立排序/指标核对通过；Windows 完整候选 verify 曾失败；不是最终阶段签署 |

以上不是拼接出的单一部署版本。原始证据与哈希见 [source-snapshots/provenance.json](source-snapshots/provenance.json)。正式阶段分支和最终页面核对完成后，应追加新清单版本，保留本次出处。

## 2. 保留的基线路径

| 组件 | 固定内容 |
| --- | --- |
| 搜索算法 | `m7-keyword-v0`；词元版本 `m7-tokenizer-v0`；NFKC、小写、中文二元词/索引单字、字母数字词；去重词元 |
| 字段权重 | title=4，model=2，categoryDisplayName=2，description=1；关键词得分按 `9 × 查询词数` 归一；不是成交概率 |
| 匹配算法 | `m7-match-v0`；先执行状态/可见性/类别/预算/成色/地点/卖家与求购发布者等硬约束，再排序；校区仅参与 campus 可见性判断，没有独立的同校区筛选规则；具体边界以 pipeline 和 engine 固定源码为准 |
| 关键词索引 | `KeywordIndex` 从传入的权威商品池构建内存倒排索引；分页结果持久于 SQLite `store.py`；不复用语义向量库 |
| RPC/result schema | `m7-baseline-rpc-v1` / `m7-baseline-result-v1`；内部契约 `schemas/m7-phase3/rpc.schema.json`；商品/请求 `schemas/m7-phase2/dataset.schema.json` |
| 词典 | 合成评估 `m7-fixture-dictionary-v1`；真实后端桥接 `live-dictionary-v1`；两者用途不同，不能互换作同一评估输入 |
| 数据 | `m7-synthetic-p2-v1.1` / `m7-label-draft-v1`，未封存；详见 AI5-02 |
| 服务 | `python -m services.m7_baseline`；仅 loopback；Bearer token 至少 32 字符；`POST /v1/rank`、`POST /v1/page` |
| 后端桥接 | `backend/app/services/intelligence.py` 从 PostgreSQL 读取最多 5000 条满足状态的真实商品，RPC 后再检查可见性/版本；业务事实不由离线 CSV 代替 |
| 业务任务 | `backend/app/services/matching_jobs.py`；实际触发、落库、通知与页面验证属于 AI5-09，不能仅凭此清单验收 |
| 降级 | 服务关闭走本地基线；连接失败/超时等按 client 处理；semantic/hybrid 请求在基线路径标记 `MODEL_DISABLED`；不得宣称实际运行 BGE |

HTTP 的当前时间/TTL 与离线历史 asOf 分开：历史评估使用 `2026-09-26T00:00:00Z`，实时 RPC 使用当前时间新请求。

## 3. 未采用的真实语义候选

| 组件 | 固定内容 |
| --- | --- |
| 模型 | `BAAI/bge-small-zh-v1.5`，revision `7999e1d3359715c523056ef9478215996d62a620`，官方模型卡 MIT；完整文件许可和 SHA256 见 source-provenance 快照 |
| 权重 | `model.safetensors`，95,827,648 字节，SHA256 `354763b9b1357bc9c44f62c6be2276321081ed2567773608c0d0785b61d5a026`；不提交权重到 Git |
| 编码 | CPU float32，512 维，maxTokens=512，CLS + L2，batchSize=16，seed=0，intraOpThreads=1，trustRemoteCode=false，离线本地加载 |
| 预处理 | `m7-semantic-text-v1`，NFKC、空白折叠；document 字段顺序 title/model/categoryDisplayName/description；仅查询前缀“为这个句子生成表示以用于检索相关文章：” |
| 向量索引 | `m7-vector-index-v1`，SQLite exact cosine；模型配置/词典/文件哈希绑定 identity，实体版本和事实哈希约束更新，事务与 tombstone 防止旧实体复活 |
| 混合排序 | `m7-hybrid-rrf-v1`，RRF k=60，keywordWeight=1，vectorWeight=1，候选深度=100；先硬过滤，私有实验开关才运行 |
| 服务状态 | deploymentEnabled=false；没有正式语义 HTTP 服务或正式页面调用；candidate CLI 实验不能算最终上线 |
| 依赖 | `services/m7_semantic/requirements.windows-cpu.lock.txt`；基线的六依赖锁另行保留，不能混成一个环境 |

不同 CPU/库环境的浮点和向量文件哈希不保证跨机器字节相等。比较同环境重复排序和指标，记录各自环境、文件哈希及差异；不能用此条掩盖真实排序差异。

## 4. 结果和页面一致性门禁

M10 已对候选的 38 条请求重复运行并独立重算，test_candidate 12 条。基线和候选 MRR 均为 1.0；严格搜索 P@5 为 0.5；不满足提升门槛，保留 `NO_GO`。当前 test_candidate 的基线 MRR 已达上限，10% 相对提升会要求 1.1，数学上无法满足；正例数量也使 P@5 上限为 0.5。Phase 5 不调整门槛或替换测试集。

当前消费者出处已列入机器清单：`backend/app/api/routes/intelligence.py`、`backend/app/schemas/business.py`、`frontend/src/sdk/generated/types.gen.ts`、`frontend/src/live/MarketPages.tsx`、`frontend/src/pages/wanted/MatchResultPage.tsx`。
这是源码追溯，尚无最终发布环境响应与页面证据，`pageServiceReleaseVersionVerified=false`。不能把“页面显示匹配百分比”解释成模型上线、准确率或成交概率。

最终核对由 M3/M6/M9 提供同一发布提交上的请求、结果 ID、algorithm/schema/dictionary/entity 版本和页面证据，M10 重放，M1 确认。M1 正式冻结前，本任务的最终验收仍待完成。
