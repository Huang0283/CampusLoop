# M7 新评估集：成员构造、独立复核、封存后重跑

当前交付是采集和评估工具，**没有把新增正式评估数据标为完成，也没有改变 NO_GO**。
数据来源按用户 2026-10-21 的选择：成员独立编写场景查询，明确标为人工构造。
构造场景的结果只能说明该场景集上的表现，不能表述为真实用户流量精度。

随后用户要求协助编写查询并生成审核材料，新增 [AI 查询与审核草稿](ai-draft-20261021/README.md)：
搜索、求购各 144 条 AI 构造查询，另有 20,736 对规则辅助初审建议及两份独立审核空表。
这些草稿保留 AI 来源，尚不属于原方案要求的成员独立编写或已复核 test，不改变本页 starter 的 0 条正式新增查询状态。

本轮用户已确认 KkkkRui 完成全部 20,736 对 M7 标签审核，原 0/1/2/U 标签均无修改。
最初 [M7 审核补录](m7-review-confirmation-20261021/human-confirmation.md) 记录结论“通过”。
最新 [时间补录](review-time-supplement-20261021/human-confirmation.md) 按用户要求填写 2026-10-21 约01:00（北京时间，整批估计时间）；用户不记得准确时间，verified reviewedAt 仍为空。
早期材料另登记 2026-10-20 23:30–23:40 的新增整批复核，保留原 10/18 首轮记录。
这更新了 M7 的用户确认状态，不代表 M8 独立确认、结构化归档验收或正式测试封存完成。

历史的 228 对标签由 KkkkRui 确认保持原标签，并按用户提供的
2026-10-18 23:31（北京时间）补录，归档在 PR #108 的提交
`2f4985734fedf4c16a248c4504e67dd9ae54814e`。
它们属于 `HUMAN_REVIEWED_UNSEALED`；该记录不等于 M8 独立复核或新 test 封存。
旧测试已经暴露过结果，不可改名当作新的未见测试。

## 由谁做什么

| 工作 | 负责人 | 完成证据 |
| --- | --- | --- |
| 提交商品快照、组织场景查询与来源登记 | M7 组织，成员实际编写 | 快照、作者、实际编写时间、来源记录 |
| 判断每件商品是否符合查询/求购 | M7、M8 分开盲审 | 两份原始记录、标签、理由、证据、真实时间 |
| 处理分歧、确认不泄漏与切片方案 | 原负责人确认，必要时第三人裁决 | 逐条裁决；不同意则保留 U/待补信息 |
| 测试前确认评估方案与封存材料 | M1、M10 | 可核验的评审链接/提交；填入真实确认记录 |
| 封存、相同输入跑基线和候选、交逐条结果 | M7 | freeze.json、文件哈希、源码版本、两路排名与指标 |
| 干净环境独立复现及最终接入决定 | M10、M1 | 独立运行记录与最终决定；工具不能代签 |

准备新评估数据是 M7 在本轮新增的工作；此前个人技术交付已完成不代表候选接入达标。
工具只能检查记录结构和一致性，无法通过填写姓名证明独立性或授权真实性。
M10 必须核对原始来源、成员身份、确认链接及封存提交。

## 顺序与数量

1. 先确定完整候选商品库、场景覆盖与分组规则。保留真实的无答案、负例、信息不足场景。
2. 成员从校园需求编写搜索和求购查询，不参考候选排名，不把 AI 草稿署名成人工独立编写。
   记录 `intentGroup`，同一意图的改写不能跨 dev/test；规范化后重复的查询会被拒绝。
3. M7、M8 各自查看事实并填写盲审记录；初审不看对方标签、旧标签或模型排名。
4. 合并记录，明确裁决分歧，检查缺失字段。每条查询须判断**完整快照**中的每个商品，不能只标模型召回结果。
5. 两类任务分别至少 100 个可评估 test 查询，每个预先登记的主要切片至少 30 个；dev 不计入。
   U 或失效求购会整条排除并另报。无答案查询保留、单列空返回准确率，不混入有正例宏平均。
   工具报告可评估数和有正例数，M10 应确认数量及代表性，不能只凑行数。
6. M1/M10 核对评估范围、切片、未运行声明和原门槛，记录真实确认，再封存。
7. 提交封存文件及哈希，保留封存提交链接；**第一次运行须晚于封存**。
8. 固定版本重跑基线和 BGE 候选，保留逐条结果和失败，交 M10 独立复现。
   看到 test 后不得改标签、改切片、删难例或调参再把同一 test 当首次正式测试。

现有 72 个合成商品可以作为明确注明来源的构造场景素材，但不能直接证明线上全库召回。
如以其作为完整快照，200 条查询意味着 **14,400 对、两人各 14,400 次判断**。
若成员补充商品，须同步补齐全库标签和来源。不要为达到 P@5 人为复制或凑足正例。

## 原门槛保持不变

读取仓库 `contracts/intelligence-phase2/model-gates.candidate.json` 的原始字节哈希，采集包不能覆盖阈值。
搜索要求 MRR@10 ≥ 0.65、Recall@10 ≥ 0.80、P@5 ≥ 0.70；匹配要求 MRR@10 ≥ 0.65、Recall@10 ≥ 0.80、硬约束违规 0。
两者相对各自基线 MRR 至少提高 10%，主要切片 Recall 下降不超过 5 个百分点。
主标签 2 为正例；1 是弱相关，0 是不符合，U 是事实不足不能判断。P@5 分母恒为 5。
指标在相同的有正例查询集合宏平均；无答案和排除项另报。
基线 MRR 为 0 时相对提高记 N/A，不能自动通过。
若 MRR 已是 1.0 或 P@5 数据上限不足，仍如实报告 NO_GO，不调整要求或筛掉难例。

质量指标、性能与最终接入分开登记。搜索 p95/p99 为 300/600ms，匹配为 500/1000ms；RSS 512MiB，新增模型/索引磁盘 1GiB。
本工具保留单机时延、内存（不支持的平台为 null）、磁盘观测，不能替代统一发布环境性能/降级验收。
即使 `qualityGatePass=true`，`formalAcceptance` 也始终为 false，等待 M10/M1 正式决定。

## 文件与运行

仓库根目录执行；采集包、审核包、封存包、运行输出分别使用新目录。工具不会下载模型或部署服务。

```text
python -m scripts.m7_evaluation init --output /path/to/collection
python -m scripts.m7_evaluation check --bundle /path/to/collection
python -m scripts.m7_evaluation prepare-reviews --bundle /path/to/collection --output /path/to/blind-packets
python -m scripts.m7_evaluation merge-reviews --bundle /path/to/collection --first /path/to/A-filled.jsonl --second /path/to/B-filled.jsonl --output /path/to/merged-annotations.jsonl
python -m scripts.m7_evaluation seal --bundle /path/to/collection --output /path/to/frozen-v1
python -m scripts.m7_evaluation run --snapshot /path/to/frozen-v1 --model-dir /path/to/pinned-bge --output /path/to/run-v1
```

`check` 不齐时退出 2；`seal` 不齐时拒绝；`run` 先验证封存文件、源码/模型配置哈希，再加载模型。
两份盲审包生成时标签和成员字段均为空。合并后，人工核对并将新文件作为采集包的 `annotations.jsonl`；保留两份原始审核文件与哈希。
有分歧的行 `adjudication` 保持 null，等待实际裁决，不能直接封存。
复核期间不要改动商品或查询事实；合并前核对 packet-info.json 中的输入哈希。如发生变更，重新分发并复核，不能把旧审核套在同 ID 的新事实之上。

| 文件 | 填写内容 |
| --- | --- |
| products.jsonl | 完整商品快照，沿用 m7-processed-v1 product schema |
| requests.jsonl | 每行 request 加 sourceId、author、authoredAt、intentGroup、slices；见 examples.md |
| annotations.jsonl | 每个 requestId/productId 一行，含两份 reviews；分歧时填写真实 adjudication |
| sources.json | 查询来源与完整商品快照来源，种类、授权状态、证据链接/文件记录 |
| dictionary.json | 与原算法一致的类别、地点、成色字典；增改后一起封存 |
| splits.json | dev/test 两组 ID；完整覆盖，不重复，不跨意图组 |
| policy.json | 新 datasetVersion/labelVersion、原门槛 SHA、catalogSourceId、切片和真实方案确认 |

时间必须包含实际日期、时间和时区，不得填未来时间或由工具猜测。
`testExposure=NOT_PREVIOUSLY_EXECUTED` 和 `exposureEvidence` 需成员如实声明，工具无法独自证明未曾运行。
`policy.approvals` 是评估方案及封存输入的确认记录，**不是模型上线签字**。
哈希用于发现变更，不能代替封存 Git 提交、外部时间记录或真实性核验。
修改封存文件或算法后，原封存包将被拒绝；不得通过重写哈希掩盖变化。
本工具将整个提供的 products.jsonl 作为共同候选库，不按旧 catalogId 缩小池；全库仅指该快照，不指线上库。
请求 context.asOf 是场景快照时点，审核时间是实际审核时点，两者不可混淆；历史商品快照不代表当前在售状态。
求购的状态/到期时间须按场景时点判断，信息不足时保留 U，不能把已失效请求算成有效匹配质量样本。

## 模型与复现环境

固定模型：`BAAI/bge-small-zh-v1.5`，revision `7999e1d3359715c523056ef9478215996d62a620`。
本机位置：`D:/Dates/Codex/2026-09-23/new-chat/work/models/bge-small-zh-v1.5-7999e1d`，不在 Git 内。
模型七个文件按 `docs/evidence/phase-4/intelligence/source-provenance.json` 的 SHA256 校验，运行时仅本地加载。
下载说明与模型来源沿用 `docs/evidence/phase-4/intelligence` 原交付；不能用浮动 main 版本替代固定 revision。
从 Hugging Face 模型仓库该 revision 的 Files 页面下载配置、词表、tokenizer 和 model.safetensors，按来源清单核对后放在同一目录。
国内镜像可用于传输，最终版本和哈希必须一致。

采集/check/封存使用 Python 3.12 和 `scripts/m7_phase2/requirements.txt`。
真实 BGE 重放使用原 `services/m7_semantic/requirements.windows-cpu.lock.txt` 固定 CPU 环境；当前锁针对 Windows，不宣称是跨平台的完整模型锁。
新增协议单元测试在 Windows/Linux 上检查数据/计分/封存逻辑，不等于在两平台执行完整 BGE。
M10 应检出封存时的实际源码提交、核验 freeze.json 外部公布哈希、干净安装、独立运行。
封存记录同时登记源码提交和工作区是否有改动；若工作区有改动或缺 Git 提交，只能用于工具调试，不能作为正式封存证据，须先提交对应源码再重建封存包。
不得拿 ZIP 源码快照、CI head 或另一个文档提交冒充封存源码。

## 输出与当前缺口

运行输出包括两路逐条响应/排名、两路指标、逐查询排除/正例信息、切片对比、单机计时、环境依赖和源码提交。
失败写 failure.json，保留中途证据，不覆盖旧运行目录。
当前 starter **没有新增成员查询、独立复核或封存**；需要真实成员补交上述材料后才能首次运行。
本轮测试只使用明确标记的自动化夹具，夹具中的虚构姓名/确认字符串从未作为真实审核或审批提交。
