# AI2-09 数据、契约与指标复现运行手册

## 目的

从干净检出验证 M7 搜索/匹配与 M8 价格/信誉/风险的生成、schema、契约、负向输入、确定性和指标公式。联合版本 `intelligence-joint-run-v1.1`（2026-10-08）使用只读检查，不重写数据资产。该流程不启动真实数据库、队列或 HTTP 服务，也不把合成样本结果当成线上模型效果。

## 固定环境

- Python 3.12.x（最低 3.11）。
- 唯一第三方依赖为 M7 的 `jsonschema`，版本以 `scripts/m7_phase2/requirements.txt` 为准。
- 在仓库根目录运行；无需密钥、账号、网络数据或个人信息。
- 记录操作系统、Python 版本、仓库提交 SHA、开始/结束时间和退出码。

## 干净环境步骤

PowerShell：

```powershell
python -m venv .venv-phase2
.\.venv-phase2\Scripts\python.exe -m pip install --index-url https://pypi.org/simple --only-binary=:all: -r scripts/m7_phase2/requirements.txt
.\.venv-phase2\Scripts\python.exe scripts/intelligence_phase2/run_all.py --output-dir evidence/phase2-intelligence/my-run > phase2-intelligence-run.json
$LASTEXITCODE
```

macOS/Linux：

```bash
python3 -m venv .venv-phase2
.venv-phase2/bin/python -m pip install --index-url https://pypi.org/simple --only-binary=:all: -r scripts/m7_phase2/requirements.txt
.venv-phase2/bin/python scripts/intelligence_phase2/run_all.py --output-dir evidence/phase2-intelligence/my-run > phase2-intelligence-run.json
echo $?
```

退出码 0、JSON 顶层 `status=PASS` 且 `assetsUnchanged=true` 才是技术检查通过。输出目录须不存在或为空；每次使用新目录，避免覆盖旧证据。保存完整分项 stdout/stderr、`run-record.json`、代码提交、源码/数据/依赖清单哈希、OS/Python/硬件架构、起止时间及退出码。日志替换仓库、Python 和用户目录前缀；提交前仍须复核日志内容。

默认分项超时 60 秒，可用 `--step-timeout-seconds` 显式调整并留在记录中；这只是测试流程防挂起参数，不是生产性能指标。UTF-8 显式用于子进程与记录，避免中文错误信息因 Windows 默认编码导致运行器中断。

## 分项命令

```text
python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m7_phase2 -p test_contracts.py -v
python scripts/m7_phase2/contract_check.py
python scripts/m7_phase2/pipeline.py verify
python -m unittest discover -s scripts/m8_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m8_phase2 -p test_contracts.py -v
python scripts/m8_phase2/contract_check.py
python scripts/intelligence_phase2/asset_check.py
python -m unittest discover -s scripts/intelligence_phase2 -p test_joint.py -v
python scripts/intelligence_phase2/metrics.py --input contracts/intelligence-phase2/ranking-formula-fixture.json
python scripts/intelligence_phase2/gate_check.py
```

联合 `asset_check.py` 对 M8 原始价格记录执行其发布的 JSON schema 和现有业务校验，在两个临时目录重建，并要求原派生文件、第一次重建、第二次重建三个 SHA-256 清单完全一致。原 M8 `pipeline.py verify` 会就地重建，不能用它证明原文件未被篡改，因此联合流程不再调用它。M8 个人源码与规则数值保持原样。

`.gitattributes` 对 M7/M8 的版本数据和 schema 保留原字节，对生产脚本固定 LF。已有检出若在补充属性前被 autocrlf 转换，应从本次提交重新干净检出，不要改写 manifest 掩盖问题。

`gate_check.py` 的退出码 3 是“登记缺项，模型 NO_GO”，并非脚本崩溃；联合运行器允许 0/3 并完整记录 gateRegistration，其他分项只允许 0。联合技术 PASS 不改变高级模型 NO_GO。

## 排名指标骨架

`metrics.py` 接受一个显式 JSON 文件，示例格式见 `contracts/intelligence-phase2/ranking-formula-fixture.json`：固定数据/标签/snapshot/split 版本、候选范围、K、完整候选标签与硬约束判断、每个算法的逐请求排序。所有算法共享同一标签和请求集合；缺请求、缺标签、重复 ID、空数据或坏字段明确失败。不得从算法输出自动生成正例。

- 主正例为 label=2，≥1 敏感性分析另报；先去重再取 TopK。
- P@K 命中数除以 K，短列表缺位计未命中；Recall 和 MRR 只在有正例请求上宏平均。
- 无答案请求单报空结果正确率、误推荐条数；有正例空结果率单报。分母为 0 输出 null/N/A。
- 有 U 的整条请求在所有算法的相关性对比中排除；排除理由保留。所有返回项仍接受硬约束审计，排除请求不能隐藏违规。
- 搜索与匹配分开，逐请求结果保留。`COMPLETE_CATALOG_POOL` 只允许声称池内 Recall，不是全库 Recall。
- 当前只接受合成公式算例或待人工复核标签，输出 `DIAGNOSTIC_ONLY`、`modelEffectEvaluated=false`。正式封存标签适配器及真实服务排序由 Phase 3/4 接入。

冻结算例 Q1/Q2 的 P@5=0.3、池内 R@5=0.5、MRR@5=0.75；Q3 单报无答案空结果正确率 1。这些值验证公式，不是模型效果。匹配算例故意包含违规结果，以验证审计能捕获它。

价格指标沿用 M8 的 12 条 L0 样本：规则覆盖 11/12、状态符合与区间合法率为 1。当前没有 L3，MAE/MAPE/真实区间覆盖继续为 NOT_EVALUATED；未实现的 L3 模型评估扩展不能视为已通过。

## 坏输入验收

单元测试必须证明以下情况非静默失败：

- 未批准或许可未知的数据源进入评估。
- 重复样本 ID、未知字段、金额单位/范围错误。
- 非 L3 记录携带成交价，或 L3 缺成交时间/成交价。
- 公开风险响应包含内部信号、分数、阈值、举报人或管理员备注。
- 风险服务作出自动处罚决定；AI 降级阻塞正常业务。
- 新用户把平滑先验显示为真实评分。

如要手工确认进程错误码，可复制临时数据目录，修改其中一条记录的 `licenseStatus` 为 `unknown`，再调用 `pipeline.build(raw_dir=<临时目录>)`。禁止改写仓库原始样本来制造证据。

## 结果解释

- M7 的候选初标仍需人工复核；脚本通过不等于 228 条标签已获人工批准。
- M8 当前 `eligibleL3Count=0`，所以 `predictionMetrics=NOT_EVALUATED` 是预期结果。
- 任一脚本失败、输出不确定、门槛空白或签字缺失，对应高级模型自动 no-go；Phase 3 保留关键词/规则/手动输入降级。

## 独立复现登记

| 项目 | 填写要求 | 当前状态 |
| --- | --- | --- |
| 提交 SHA | 被检出的阶段集成提交 | PENDING |
| 执行人 | M10，不是产物作者 | PENDING |
| 环境 | OS、Python、依赖哈希 | PENDING |
| 命令与退出码 | 保存完整命令和原始日志路径 | PENDING |
| 输出哈希 | 对比 manifest 与重建文件 | PENDING |
| 结论 | PASS/FAIL 与失败原因 | PENDING |

未由 M10 填写前，只能称“作者环境验证通过”，不能称“独立验收通过”。

M10 于 2026-09-29 在 management-quality 分支记录过 M7 个人 v1.1 的独立技术检查；本表专指包含 M8 与本次联合新增内容的干净环境验收，两者范围不同。最新作者记录见 [joint-verification.md](joint-verification.md)。
