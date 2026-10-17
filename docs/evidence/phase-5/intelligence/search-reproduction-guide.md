# AI5-03 搜索与供需匹配复现指南

日期：2026-10-17。命令从对应真实 Git 检出的仓库根目录执行。以下使用 PowerShell；Python 3.12；全程保留退出码和原始日志，输出目录使用源码外新的空目录。
先读 [版本清单](search-release-manifest.md) 和 [实际验证](verification.md)。没有 `.git` 的 ZIP 仅供阅读，不代替 M10 正式阶段检出。

## 1. 两个独立环境和固定检出

基线不需要 PyTorch。示例在同一父目录创建 baseline / candidate / m10 三个检出，每条命令失败应停止并保存输出，不继续宣称成功。

```powershell
git clone https://github.com/Huang0283/CampusLoop.git CampusLoop-m7-baseline
Set-Location CampusLoop-m7-baseline
git checkout --detach 6df25176866a6b1df2c1da5dcd28229b965f73ff
git rev-parse HEAD
git status --porcelain
py -3.12 -m venv ../m7-p5-baseline-venv
$bp = (Resolve-Path ../m7-p5-baseline-venv/Scripts/python.exe).Path
& $bp -m pip install -r scripts/m7_phase2/requirements.txt
& $bp -m pip check
& $bp --version
& $bp -m pip freeze
```

预期 HEAD 与固定提交一致，运行前工作树干净。Linux/macOS 使用 `python3.12 -m venv` 和 `../m7-p5-baseline-venv/bin/python`，其余 Python 参数相同；Windows CPU 候选锁的跨平台安装仍需单独实跑验证，不能从文档推断。
若镜像缺少 rpds-py 等锁定版本，切换允许访问的官方源/可信完整镜像后重装原版本，不静默修改 lock。离线场景先在允许联网的相同平台下载全部 wheels，再用 `--no-index --find-links <wheelhouse>` 安装并记录 wheel 哈希。

本次沙箱默认临时目录报 `WinError 5`，将进程临时目录设为可写工作目录后，数据重建和 Phase 2 回归通过。遇到同样问题时可在当前终端设置，不更改生产代码：

```powershell
New-Item -ItemType Directory -Force ../m7-p5-temp | Out-Null
$env:TEMP = (Resolve-Path ../m7-p5-temp).Path
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
```

首次两轮 loopback 连接另被沙箱以 `WinError 10013` 拒绝；本次续验在权限恢复后，原完整基线 verify 和服务 smoke 已通过，原失败日志保留。临时目录设置不能解决网络访问限制；应在允许本地回环的独立验收环境运行，保留当前失败记录，不以跳过 HTTP 测试或 mock 代替通过。

## 2. 数据字节重建

```powershell
& $bp scripts/m7_phase2/pipeline.py verify
& $bp scripts/m7_phase2/pipeline.py build --output-dir ../m7-p5-data-rebuilt
& $bp scripts/m7_phase2/pipeline.py verify --bundle-dir ../m7-p5-data-rebuilt
```

预期 verify `result=pass`、`byteIdenticalRebuild=true`；build 为 72 商品、38 请求、228 对。原始/派生文件哈希与 data-hashes.json 对应，不覆盖已提交目录。

## 3. 基线完整复现、代表查询和独立重算

```powershell
& $bp -m services.m7_baseline.verify --output-dir ../m7-p5-baseline-verify
& $bp -m services.m7_baseline.evaluate --output-dir ../m7-p5-baseline-eval
& $bp scripts/intelligence_phase2/metrics.py --input ../m7-p5-baseline-eval/evaluation-input-test_candidate.json --output ../m7-p5-baseline-recalculated.json
```

verify 依次跑 Phase 2、M7 Phase 3 测试、两次固定评估和 all/dev/test_candidate 的重算，记录 `codeCommit`、环境、`workingTreeDirty`、`assetsUnchanged`、重复字节一致和重算一致。不能仅检查进程退出 0 而忽略内部状态。

`per-query.json` 提供 38 条完整结果；代表性检查包括 calculator-search-exact 的精确型号、bicycle-search-natural 的同义词边界、camera-matching-no-answer 空答案、tennis-matching-expired 的 `WANTED_INACTIVE`、lamp/tablet 的未知约束。指标必须连同 labelSource 和排除请求一起引用，不能把诊断结果写成正式效果。

如有任一步失败，保留 `run-record.json` 的该步与 stdout/stderr，不删失败记录重写 PASS。上游 M10 曾在 Windows 的同一候选上遇到 loopback/超时测试失败，Linux 容器相关测试通过；本次验证不能抹掉该历史差异。

## 4. 实际基线服务：当前时间、认证和持久分页

在基线检出启动两个终端，均用基线 venv；token 只在本地进程传递，勿存进日志/仓库。端口 8787 空闲，数据库放到源码外；示例 token 为临时本地演示值，发布环境需独立配置。

终端 A：

```powershell
$env:M7_SERVICE_TOKEN = 'local-reproduction-only-token-32-characters'
& $bp -m services.m7_baseline --database ../m7-p5-service.sqlite --port 8787
```

终端 B：重新设置 `$bp` 和同一临时 token 后执行：

```powershell
$bp = (Resolve-Path ../m7-p5-baseline-venv/Scripts/python.exe).Path
$token = 'local-reproduction-only-token-32-characters'
$body = (& $bp -m services.m7_baseline.example_request) -join "`n"
$result = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/v1/rank -Headers @{Authorization="Bearer $token"} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
$result | ConvertTo-Json -Depth 20
```

预期返回真实 rank 结果和版本元数据；无 token 应为 401。example_request 模块仅在此集成提交存在；不在实验候选提交调用该模块。它用当前 asOf 包装合成查询，不改冻结数据；超过服务 freshness 窗口需重新生成。历史 wanted 过期是预期边界，不改样本时间冒充匹配成功。
执行成功时保存响应形状和结果 ID。最初 smoke 被沙箱阻止，续验 v3 已真实验证认证、分页与停服务降级通过；成功与失败日志均见 verification。端到端数据库/worker/页面链路不由该 loopback 演示代替，属于 AI5-09。

## 5. 单独复现未采用的语义候选

返回共同父目录，另建实验检出，不将其合并到基线或打开正式语义开关：

```powershell
Set-Location ..
git clone https://github.com/Huang0283/CampusLoop.git CampusLoop-m7-candidate
Set-Location CampusLoop-m7-candidate
git checkout --detach e4dc076d7a589f41b3d8cd61c246dabe67e9c39d
py -3.12 -m venv ../m7-p5-candidate-venv
$cp = (Resolve-Path ../m7-p5-candidate-venv/Scripts/python.exe).Path
& $cp -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -r services/m7_semantic/requirements.windows-cpu.lock.txt
& $cp -m pip check
& $cp -m services.m7_semantic.download --model-dir ../m7-p5-model
& $cp -m services.m7_semantic build --model-dir ../m7-p5-model --index ../m7-p5-vector.sqlite --products data/m7-phase2/derived/products.jsonl
& $cp -m services.m7_semantic update --model-dir ../m7-p5-model --index ../m7-p5-vector.sqlite --products data/m7-phase2/derived/products.jsonl
& $cp -m services.m7_semantic.evaluate --model-dir ../m7-p5-model --output-dir ../m7-p5-candidate-eval
& $cp -m services.m7_semantic.evaluate --model-dir ../m7-p5-model --output-dir ../m7-p5-candidate-eval-repeat
& $cp scripts/intelligence_phase2/metrics.py --input ../m7-p5-candidate-eval/evaluation-input-test_candidate.json --output ../m7-p5-candidate-recalculated.json
```

下载器固定官方 revision、文件名与 SHA256，已下载模型也会核验。安装/下载需要相应网络和磁盘，未下载时不能以 mock 或随机向量替代；来源见模型 provenance。已有正确完整模型目录可直接离线复用，须明确记录不是本次重新下载。

为 CLI 选择同一 catalog 的代表请求与商品池（UTF-8/LF，不让 PowerShell 默认 UTF-16 影响 JSON）：

```powershell
@'
import json
from pathlib import Path
data = Path('data/m7-phase2/derived')
requests = [json.loads(x) for x in (data/'requests.jsonl').read_text(encoding='utf-8').splitlines()]
products = [json.loads(x) for x in (data/'products.jsonl').read_text(encoding='utf-8').splitlines()]
request = next(x for x in requests if x['requestId'] == 'calculator-search-exact')
Path('../m7-p5-query.json').write_text(json.dumps(request, ensure_ascii=False), encoding='utf-8', newline='\n')
Path('../m7-p5-query-products.jsonl').write_text(''.join(json.dumps(x, ensure_ascii=False)+'\n' for x in products if x['catalogId']==request['catalogId']), encoding='utf-8', newline='\n')
'@ | & $cp -
& $cp -m services.m7_semantic query --model-dir ../m7-p5-model --index ../m7-p5-vector.sqlite --products ../m7-p5-query-products.jsonl --request ../m7-p5-query.json
```

build 后相同内容 update 应为幂等；指标 JSON 及逐项排序两次应一致。索引物理文件的跨平台字节不作一致承诺。query 明确处于私有 experimental=True 路径。
需要完整候选回归时执行以下命令并原样保留失败；AI5-04 续验已实际运行完整候选 verify，结果和原始日志见 verification；历史记录仍单独保留：

```powershell
& $cp -m services.m7_semantic.verify --model-dir ../m7-p5-model --output-dir ../m7-p5-candidate-verify
```

预期诊断结论仍为 `NO_GO`，而不是“模型运行成功所以准许上线”。基线和候选使用同数据、完整 catalog 池、硬过滤、排除规则和指标；test_candidate MRR=1.0 对 1.0、严格搜索 P@5=0.5。弱相关词语召回补缺不能改称正式门槛达标。

## 6. 逐条复核归档：有真实记录才执行

在基线检出，用实际填好的 CSV。无争议时裁决栏可空，但 reviewer/reviewLabel/reviewReason/reviewedAt 必须有效。现存空表预期检查退出 2，不是任务执行成功。

```powershell
& $bp -m services.m7_baseline.review_archive --review-sheet <真实CSV路径> --check-only
& $bp -m services.m7_baseline.review_archive --review-sheet <真实CSV路径> --output-dir ../m7-p5-reviewed --label-version <经Owner确认的新labelVersion>
& $bp -m services.m7_baseline.evaluate --review-archive ../m7-p5-reviewed --output-dir ../m7-p5-reviewed-eval
```

尖括号参数需替换，不是可直接粘贴的实值；不自动生成复核人或时间。未归档时保持草稿诊断，不能将既有报告手工改成 humanReviewedPairs=228。

## 7. 核对 M10 已归档的独立诊断

M10 的核验脚本在其任务分支，不在基线或候选检出。可另行检出 `1cc5cbf7633017ea69560cc2f43e0e308658b1da`，从该仓库根运行：

```powershell
python scripts/quality_phase4/check_archived_evidence.py
```

该命令核对已有证据，不重新执行模型，不等于 M10 最终 Phase 5 签字。副本见 source-snapshots；实际完整归档在对应 Git 提交。

## 8. 最终接收记录

M10 必须从正式阶段提交干净检出，记录提交、OS/硬件、Python/依赖锁、安装日志、模型文件哈希、命令、退出码、实际结果、失败路径与同环境重复比较。M3/M6/M9 补发布页面、业务事实、服务与降级链路；M1 核对冻结标签。当前作者验证仅支持文档可执行性，不代替这些签署。


## 9. AI5-04 首次查询测量重放

在已完成模型哈希核验的候选环境，用本次文档检出中的 `evidence/limitations-v1/measure_first_query.py`，传入真实候选 Git 检出与本地模型目录：

```text
<candidate-python> <documentation-checkout>/docs/evidence/phase-5/intelligence/evidence/limitations-v1/measure_first_query.py --checkout <candidate-checkout> --model-dir <pinned-model-dir> --output <new-first-query.json>
```

占位参数需替换成实际路径。探针只读取固定 calculator 请求并编码，不修改模型或评估集；保留首次调用与五次预热的全部数值，不把进程首次加载等同 OS 冷缓存。解释范围见 search-limitations.md。
