# AI5-08～10 本轮作者技术验证

2026-10-17；技术代码提交 `45acf879bf41c18baae4f89584c9e1732f848c97`，运行前后三个完整验证记录均为工作树干净。结论：`AUTHOR_TECHNICAL_PASS_RELEASE_AND_INDEPENDENT_ACCEPTANCE_PENDING`。

| 实际操作 | 结果 | 证据 |
| --- | --- | --- |
| 新建轻量 venv 并安装原六版本锁 | 安装成功，pip check PASS，六版本逐项一致 | [环境审计](evidence/joint-v1/environment-audit.json) / baseline-fresh.freeze.txt |
| 原 TEMP 的首轮基线与联合 verify | Phase2 子进程 60 秒超时，FAIL；保留原失败，不改超时参数 | evidence/joint-v1/baseline-profile/run-record.json、joint-profile/run-record.json |
| 可写 TEMP 的完整基线 verify | PASS；M7 38 单测、Phase2 回归、两次评估和三 split 重算一致、资产未变 | [fresh-baseline-v2/run-record](evidence/joint-v1/fresh-baseline-v2/run-record.json) |
| 真实联合 verify | 四步骤 PASS；candidate profile；真实模型推理完成；dirty=false | [joint-v2/run-record](evidence/joint-v1/joint-v2/run-record.json) |
| M8 回归 | Phase2 14 / Phase3 31 / Phase4 23 测试 PASS，重复输出一致，价格 NO_GO | [M8 run-record](evidence/joint-v1/joint-v2/m8/run-record.json) |
| 两服务真实部署/停止/回滚与权限 | 12 场景 PASS；独立 SQLite 分页重启、401、关闭候选及四能力停止恢复 | [deployment/smoke](evidence/joint-v1/joint-v2/deployment/smoke.json) |
| M7 私有候选 | 33 单测；两次真实 BGE 38 查询；向量/索引重复一致；更新/幂等/旧事件/删除检查通过 | [semantic run-record](evidence/joint-v1/joint-v2/m7-semantic/run-record.json) |
| 固定 M10 公式由作者重算 | all/dev/test_candidate 一致，容差 1e-12；不是 M10 本次独立验收 | [formula-recalculation](evidence/joint-v1/formula-recalculation.json) |
| 固定 M10 RPC 故障脚本由作者重放 | 18/18 PASS；真实超时/关闭/坏 JSON/坏结构/旧输入 | [quality-probes](evidence/joint-v1/quality-probes.json) 与原始 stdout/stderr |
| 源资产/模型核对 | 154 资产 Git blob 哈希，1643 跟踪文件扫描，七模型文件哈希通过 | [asset-audit](evidence/joint-v1/asset-audit.json)、[model-audit](evidence/joint-v1/model-audit.json) |

原始命令与环境见各 run-record，[联合指南](joint-delivery/reproduction-guide.md) 提供可执行步骤。基线新安装使用缓存 wheel 亦属于新 venv 安装；候选环境复用、模型复用不是首次安装/下载。Windows 路径占位仅用于导出副本；原日志内容和失败不变。副本完整性以本轮 [FILES.sha256](evidence/joint-v1/FILES.sha256.json) 为准，嵌套原记录中 stdoutSha/sourceHashes 属于原执行位置/原文件，不与脱敏副本混用。

无新增生产行为：本次为合并已有修复、环境核对、原命令复现、文档与原始结果归档，因此不声称新功能 TDD。P4 修复原 RED/GREEN 保留在 P4 证据，不当作本轮新增测试。重复测试次数不累加。两个候选仍 NO_GO；M7 test_candidate=12，结构化标签=0、未封存；M8 成交标签=0，MAE/MAPE/覆盖率 NOT_EVALUATED。

CI 结果若完成会追加本轮具体提交、运行链接与原始日志。CI 不是 M9 发布环境，作者复用 M10 实现不等于 M10 签署。正式阶段检出、M9/M6/M3 发布全链路、M10/M1 仍按 [接收状态](joint-delivery/acceptance-status.json) 待完成。

---

## 以下为原个人任务作者验证历史，保留原日期与限制

# AI5-01～04 作者验证

2026-10-17 续验结论：`AUTHOR_TECHNICAL_PASS_FINAL_ACCEPTANCE_PENDING`。网络权限恢复后，在原干净 Git 检出补跑，基线完整 verify 与真实服务 smoke 均通过；未更改生产代码。此前 v1/v2 的权限失败保留在下方和原始日志，不改写成历史成功。

| 新执行 | 实际结果 | 原始证据 |
| --- | --- | --- |
| v3 数据 verify / 重建 verify | PASS，字节重建一致 | evidence/author-reproduction-v3/run-record.json |
| v3 基线完整 verify | PASS；31 项 M7 Phase 3 测试通过；Phase 2 回归通过；两次评估字节一致、三 split 重算一致、资产未变 | evidence/author-reproduction-v3/baseline-verify/run-record.json |
| v3 真实 RPC 子进程 smoke | 6 场景 PASS：缺认证、关闭语义、持久分页、未知字段、错误 token 不回退、停服务本地回退；临时随机 token 未归档 | evidence/author-reproduction-v3/service-process-smoke.json |
| 固定候选完整 semantic.verify | PASS，既有 Phase 2/3/4 与 M8 回归、两次真实 BGE 评估、三 split 重算、真实更新/幂等/旧事件/删除 tombstone 通过 | evidence/limitations-v1/candidate-verify/run-record.json |
| 新进程首次编码探针 | 实际本地 BGE 首次 encode + 5 次同查询预热；向量一致；不清 OS 缓存、不含 HTTP/DB/商品索引，不是 SLA | evidence/limitations-v1/first-query.json |
| AI5-04 失败审计 | 原始全部 split 失败行与零计数类别保留；聚合门槛失败、U/过期/无答案及弱相关召回分别说明 | evidence/limitations-audit.json |

基线来源提交仍为 `0c6528674a57dd555f070dc3a568d1fcf13fadf0`，行为代码等同 `6df25176866a6b1df2c1da5dcd28229b965f73ff`；候选仍为 `e4dc076d7a589f41b3d8cd61c246dabe67e9c39d`。环境为 Windows / Python 3.12.14，复用已锁定隔离环境与模型，并非本次全新安装。
完整候选验证是本次新执行，不能与历史 M7/M10 记录混为同一轮。技术 PASS 不改变候选效果 NO_GO，不代表 M10/M1 签署。正式阶段检出、全新安装独立复现和发布链路仍待完成。

本次为文档、审计与测量驱动交付，未改变生产行为，不声称进行了新功能 TDD。支持性 verification/deliverables 不等于共同 AI5-10 已完成。

## 以下为网络受限时的原始记录

# AI5-01～03 原始受限环境验证

日期：2026-10-17。结论：`PARTIAL_ENVIRONMENT_BLOCKED`。文档、版本和数据清单可交付；本次完整服务验证没有通过，不是 M10 独立验收或最终阶段签署。
机器汇总：[evidence/check-summary.json](evidence/check-summary.json)。两次尝试的原始记录和 stdout/stderr 全部保留。

## 本次实际环境与提交

| 项目 | 实际值 |
| --- | --- |
| 基线干净 Git 检出 | `0c6528674a57dd555f070dc3a568d1fcf13fadf0`，其行为代码来自 `6df25176866a6b1df2c1da5dcd28229b965f73ff`；此提交仅追加本次文档和作用于本目录的 gitattributes |
| 实验候选干净检出 | `e4dc076d7a589f41b3d8cd61c246dabe67e9c39d` |
| M10 归档检出 | `1cc5cbf7633017ea69560cc2f43e0e308658b1da` |
| 运行环境 | Windows / AMD64 / Python 3.12.14；基线复用既有六依赖隔离环境；候选复用既有 CPU 锁定环境和本地模型；两环境 pip check 均通过 |
| 安装/下载边界 | 本次没有重新干净安装依赖；没有重新下载模型；已运行下载器核验现存七个固定文件，不伪称首次下载成功 |
| 工作树和资产 | 三个检出运行前后干净；31 项 Git blob 版本哈希、17 个数据文件哈希、上游证据快照哈希全部一致 |

完整命令、环境、退出码、时间和来源提交见各 run-record。绝对工作路径在文本副本中替换为占位符；运行结论、错误码和 traceback 保留，未变造 PASS。模型/venv/SQLite/缓存不进入 Git。

## 本次执行结果

| 操作 | 实际结果 | 证据 |
| --- | --- | --- |
| 数据 verify / build / 重建 verify | 首次默认临时目录 WinError 5；改为工作目录内 TEMP/TMP/TMPDIR 后两次 verify 均通过，字节重建一致；72 商品/38 请求/228 对 | author-reproduction-v1/data-* 和 author-reproduction-v2/data-* |
| Phase 2 完整回归 | PASS；原 run_all 的全部检查通过，模型门禁登记 NO_GO 属于预期出口，不改为 GO | author-reproduction-v2/baseline-verify/phase2/run-record.json |
| M7 Phase 3 完整测试 | 跑 31 项，27 通过，4 个 HTTP 测试因 WinError 10013 连接权限错误；verify 退出 2，不能算全通过 | author-reproduction-v2/baseline-verify/phase3-tests.stderr.txt |
| 基线离线评估 | 两个独立进程各 38 请求，all/dev/test_candidate 指标与逐项排序一致，三个 split 独立进程重算一致 | author-reproduction-v1/baseline-eval、baseline-eval-repeat、baseline-recalculated-*.json |
| 实际服务子进程 smoke | 重试后服务可启动，但第一条本地 HTTP 连接被沙箱拒绝；认证/分页/服务停止降级未通过本次验证 | author-reproduction-v2/service-process-smoke.stderr.txt |
| 真实模型/索引 | 七文件 SHA256 核验通过；真实 BGE 构建索引；相同 72 商品 update 全部 IDEMPOTENT；calculator-search-exact 私有查询通过 | author-reproduction-v1/candidate-model-hashes、candidate-index-*、candidate-query stdout |
| 候选离线评估 | 两独立进程各 38 请求，编码/逻辑索引自身重复一致；跨进程逐项排序和指标一致；三个 split 指标重算一致；正式结论保持 NO_GO | author-reproduction-v1/candidate-eval、candidate-eval-repeat、candidate-recalculated-*.json |
| M10 历史归档离线核对 | PASS，既有归档哈希和独立公式核验通过；没有重新作为 M10 运行模型或签署 | author-reproduction-v1/m10-archive-check.stdout.txt |
| 实际复核 CSV | 228 行，无重复/缺失 labelId，结构化有效记录 0，readyToArchive=false，预期退出 2；用户已确认内容全对的事实保留 | author-reproduction-v1/review-sheet-summary.json 与完整检查 stdout |

基线和候选的 test_candidate MRR 均为 1.0，严格搜索 P@5 为 0.5；真实模型推理不代表满足上线门槛。原数据和标签未更改，labelSource 仍为 PENDING_HUMAN_REVIEW，testSetSealed=false。没有运行本次完整 semantic.verify，不引用历史 196 项充当本次测试数。

本次没有新增生产行为或数据；为文档、机器清单、已有命令复现和服务检查驱动。TDD 不适用于此次 docs-only 交付；使用已有回归验证，没有新写生产行为测试。

## 保留的上游历史证据

| 记录 | 真实范围 | 不能据此声称 |
| --- | --- | --- |
| M7 作者 Phase 4 原记录 | 217d0e4 代码下 196 测试及实际模型重复；原件在 e4dc076 的 m7-v1 | 本次重新跑过 196 或已获 M10 签署 |
| M10 独立诊断 | e4dc076 两次 38 查询，独立公式重算一致，NO_GO | Windows 完整 verify 通过；正式冻结获批 |
| M10 Windows/Linux 差异 | Windows 基线测试出现 4 个 loopback 错误和 1 个超时预期失败；Linux 容器相关测试通过 | 因数值一致就删除或覆盖失败记录 |

完整原文固定副本见 source-snapshots。M10 原执行为在 M10 请求下由 Codex 执行，不是人工签名。本次所有新执行均为作者技术验证。

## 尚不能验收的部分

需要在允许本地回环且能全新安装依赖的独立环境重跑完整基线/服务，并从 M1 的正式 Phase 5 集成提交核对发布页面、服务与冻结版本。现有沙箱禁止相应 socket 访问，本次不修改安全策略、跳过失败或用 mock 声称通过。Owner、依赖和动作见 handoff；最终验收仍待 M10/M1。


本轮准备提交 e608315 的 [GitHub CI](https://github.com/Huang0283/CampusLoop/actions/runs/39047423914) 已全部通过：37 项后端测试（无 skipped）及 5 项真实浏览器测试；格式检查、SDK/lint/build、空库迁移/回滚/重迁移与种子检查通过。当前源码不包含远端未合并 M3 新分支；不把本轮结果扩大为其他小组已验收。完整 job 日志与步骤见 [CI 状态](joint-delivery/ci-status.json)，不替代发布环境接收或 M10/M1 签署。
