> 2026-10-19：KkkkRui的228条审核已补录归档并用审核版本重跑。见 [当前审核记录](../human-review.md)。新输出为HUMAN_REVIEWED_UNSEALED；旧执行的pending/0不重写，正式数据封存与M10/M1仍待完成。

# Phase 5 联合复现指南

作者技术基点 `45acf879bf41c18baae4f89584c9e1732f848c97`；正式验收收到阶段提交后改为实际获批 SHA，重新记录。必须有真实 Git 历史以核对固定公式源，不能只使用无 .git ZIP。输出目录必须全新且在源码外。以下在仓库根运行，任何非预期退出即停止并归档 stdout/stderr。

```powershell
git checkout --detach 45acf879bf41c18baae4f89584c9e1732f848c97
git rev-parse HEAD
git status --porcelain
py -3.12 -m venv ../p5-baseline-env
$bp = (Resolve-Path ../p5-baseline-env/Scripts/python.exe).Path
& $bp -m pip install --index-url https://pypi.org/simple -r scripts/m7_phase2/requirements.txt
& $bp -m pip check
New-Item -ItemType Directory -Force ../p5-temp | Out-Null
$env:TEMP = (Resolve-Path ../p5-temp).Path
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONDONTWRITEBYTECODE = '1'
& $bp -m services.m7_baseline.verify --output-dir ../p5-baseline-result
& $bp -m services.m8_phase4.verify --output-dir ../p5-m8-result --source-commit 45acf879bf41c18baae4f89584c9e1732f848c97
& $bp -m services.intelligence_phase4.smoke --output-dir ../p5-service-result
```

M8 无模型训练；输出 readiness/price-comparison/trust-risk-evaluation，NO_GO 与 NOT_EVALUATED 是正确结果，不是失败后改成 GO 的理由。

候选另建 Windows CPU 环境，保持六依赖 profile 独立：

```powershell
py -3.12 -m venv ../p5-candidate-env
$cp = (Resolve-Path ../p5-candidate-env/Scripts/python.exe).Path
& $cp -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -r services/m7_semantic/requirements.windows-cpu.lock.txt
& $cp -m pip check
& $cp -m services.m7_semantic.download --model-dir ../p5-fixed-model
& $cp -m services.intelligence_phase4.verify --model-dir ../p5-fixed-model --output-dir ../p5-joint-result
& $cp docs/evidence/phase-4/intelligence/joint-delivery/recalculate_metrics.py --checkout . --first ../p5-joint-result/m7-semantic/evaluation --repeat ../p5-joint-result/m7-semantic/evaluation-repeat --auditor docs/evidence/phase-4/intelligence/evidence/joint-v1/m10-auditor.original.py --output ../p5-formula.json --declared-executor UNSIGNED_COMMAND_EXECUTION
```

download 检查固定 revision 的七个文件哈希；已有正确本地文件时不会重新下载。来源核对通过不是首次下载证据。正式独立复现需 M10 自己记录全新安装、平台、Git SHA 和命令；填 declared-executor 不会产生签名。

verify 中的 run-record 必须 status=PASS、dirty=false、各 step exitCode=0；semanticInferenceReproduced=true 仅在实际传入模型并跑完时成立。M7 candidate 的 evaluation-status 仍须 DIAGNOSTIC_ONLY / NO_GO。all/dev/test_candidate 两轮输出应一致；重算需一致；更新/重复/旧事件/删除检查都通过。

本次故障重放原始检查器在 `../evidence/joint-v1/m10-fault-checker.original.py`，可按现有 replay_quality_probes.py 的 --checkout/--checker/--output 参数从本次交付提交运行；检查器需与 1cc5cbf 的固定源一致。旧 M10 实现的公式/诊断被复用，执行人仍是作者，不变成 M10 新签署。

不传 --model-dir 时联合 verify 只跑私有单测，不能宣称真实模型复现。发布数据库、Worker、页面和回滚另按 [集成报告](../final-integration-report.md) 操作。

交付文档/证据自身可在交付提交检出后独立校验（使用标准库，不要求模型）：

```powershell
python docs/evidence/phase-5/intelligence/joint-delivery/verify_delivery.py --output ../p5-delivery-check.json
```

输出必须为 PASS_AUTHOR_PREPARATION_ONLY，且 formalAcceptance=false / phase5Complete=false。源码/证据不一致或哈希被改时失败；该工具不签署发布验收。
