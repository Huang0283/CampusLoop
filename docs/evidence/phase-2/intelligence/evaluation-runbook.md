# AI2-09 数据与契约复现运行手册

## 目的

从干净检出验证 M7 搜索/匹配与 M8 价格/信誉/风险的生成、schema、契约、负向输入和确定性。该流程不启动真实数据库、队列或 HTTP 服务，也不把合成样本结果当成线上模型效果。

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
.\.venv-phase2\Scripts\python.exe scripts/intelligence_phase2/run_all.py > phase2-intelligence-run.json
$LASTEXITCODE
```

macOS/Linux：

```bash
python3 -m venv .venv-phase2
.venv-phase2/bin/python -m pip install --index-url https://pypi.org/simple --only-binary=:all: -r scripts/m7_phase2/requirements.txt
.venv-phase2/bin/python scripts/intelligence_phase2/run_all.py > phase2-intelligence-run.json
echo $?
```

退出码 0 且 JSON 顶层 `status=PASS` 才是技术检查通过。运行日志可保存至 `evidence/phase2-intelligence/<commit>/`；不要提交包含本机用户名、绝对路径或密钥的日志。

## 分项命令

```text
python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m7_phase2 -p test_contracts.py -v
python scripts/m7_phase2/contract_check.py
python scripts/m7_phase2/pipeline.py verify
python -m unittest discover -s scripts/m8_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m8_phase2 -p test_contracts.py -v
python scripts/m8_phase2/contract_check.py
python scripts/m8_phase2/pipeline.py verify
```

M8 的 `verify` 连续重建两次并比较三个派生文件 SHA-256；输入、规则或序列化变化必须生成可解释的新版本或哈希。

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
