# AI3-10 作者复现记录

当前代码基准74d8c0c：M7测试31、M8测试17；M8结果hash为aa7374f747edffa7c2794b0240d0bd9e1be50f81efac203716e5d5b9f813b14f，固定用例9/9与两次字节一致。原始安全记录见evidence/solo-p3-m8-run-record.json与solo-p3-evaluation-status.json。后端37测试包括真实RPC与PostgreSQL任务/通知事务。用户已批准first-pair-v1默认开启，独立验收人是用户本人M10陈梓弘。以下历史范围限制仅对应各旧提交，不代表当前M6/outbox仍未接入；正式数据归档/独立签字仍待完成。

## 2026-10-09 集中实现续验

真实 API 现在已接入 M7/M8 回环 RPC，并使用 PostgreSQL 业务事实。Linux/Python 3.12.15：M7 基线 31 测试通过；M8 新增缺失观察边界后 17 测试通过，固定规则结果两次字节一致。后端 RPC 集成测试使用临时真实监听服务，不用固定响应冒充接口。现阶段 M7 固定 38 查询仍为 `DIAGNOSTIC_ONLY/PENDING_HUMAN_REVIEW`：用户已确认 228 标签内容正确，但逐条归档尚未提供。不得将本次模型运行输出的 humanReviewedPairs=0 解释成用户未复核，也不得伪造归档人员和时间。新业务联调及浏览器记录见管理质量组 verification；历史记录保留如下。

2026-10-08 复核状态更新：用户确认 228/228 对标签已完成人工复核且全部正确，原标签不变；已提供的辅助 CSV 复核栏仍为空，逐条记录待归档。详情见 [Phase 2 复核状态](../../phase-2/intelligence/human-review-status.md)。原评估运行时的草稿、计数和日志保留，正式封存及阶段验收仍待完成。

被检出的代码提交 `1c235abba1c7a337501aacdec14f987c447563b0`。Windows / Python 3.12，使用新的隔离 venv 与 scripts/m7_phase2/requirements.txt 六个锁定依赖；没有新增依赖。两个独立干净本地检出分别 autocrlf=true/false，运行前 workingTreeDirty=false。命令均从仓库根目录执行，输出在检出外空目录：

```text
python -m services.m7_baseline.verify --output-dir <空证据目录>
```

两份记录均 PASS：Phase 2 116 测试、29 契约样例与只读字节重建通过；Phase 3 23 测试通过；38 查询逐项排序保留；两次评估字节一致；all/dev/test_candidate 使用独立 metrics.py 进程重算一致；运行期间所有被监测资产未变。合计 139 项测试，模型登记依然三项 NO_GO，符合预期。

原始记录与完整分项日志见 evidence/m7-v0/autocrlf-true/ 和 autocrlf-false/，跨检出比较见 checkout-comparison.json。实际服务子进程与六类 HTTP/恢复路径见 service-process-smoke.json；临时 SQLite 是私有持久文件，不是内存模拟。

若独立重算一个 split：

```text
python scripts/intelligence_phase2/metrics.py --input <evaluation-input-dev.json> --output <新文件.json>
```

TDD 逐步失败/通过记录在 evidence/m7-v0/tdd/，为未提交工作树期间实际捕获，不能冒充逐轮独立 commit 测试。保留中间错误：09 元数据实现首次调用哈希参数不全；17 Windows 未监听端口可能超时，修正测试对真实网络结果的预期；19/21 暴露 Windows 原生连接中断，22 补齐回退后通过。文件 20-disconnect-red.json 实际 exitCode=0，只能作为回归记录，不计作 RED。最初一条测试的 PowerShell 原始文本没有完整计时元数据，完整提交验证以本节干净检出记录为准。

范围限制：没有 Linux/macOS 实机、M6 业务数据库与 outbox、异步租约恢复、真实站内通知、资源压力或 M10 非作者运行。M8/M9/M10/M1 的本人评审、接收和签字均待完成。不得凭本记录将阶段 Issue 关闭或批准 Phase 4 模型。

导出记录统一 UTF-8/LF，Windows 原始 PowerShell 文本由 UTF-16 转码，机器绝对路径脱敏；该处理不改变测试结论。源文件与固定评估的字节哈希比较保留在各 run-record 和 checkout-comparison 中。

## 2026-10-08 复核归档修订验证

新增条件读取、复核表核验与归档工具的代码提交为 `b88b2a1429003877abca547771c32f8e9423b25a`，独立于上述初次交付的历史记录。原程序运行新增出处测试时因缺少 labelSource 输出而失败，真实失败记录见 evidence/review-archive-v1/provenance-red.txt/json；该记录来自作者工作树，不冒充独立验收。

在该代码提交的真实 Git 干净检出、Windows / Python 3.12 锁定环境中执行相同 verify 命令：workingTreeDirty=false、codeCommit 非空且精确对应提交。116 项 Phase 2 测试、31 项 Phase 3 测试（新增 8 项）、29 个契约样例全部通过；38 查询重复评估字节一致，三个 split 的指标可独立重算，资产前后不变。完整结果见 evidence/review-archive-v1/clean-run/run-record.json 和 summary.json。

新测试在临时目录中验证有效归档更新计数与来源、空表/缺字段/重复和缺失编号拒绝、最终标签差异清单、带时区时间及裁决完整性、改写文件哈希后的记录不一致拒绝、新版本及非空输出目录保护。测试用 fixture-only 记录不作为真实复核凭证，测试输出归档不发布成用户正式标签版本。

实际用户辅助表检查为 228 行、已归档有效记录 0、readyToArchive=false、退出 2；完整检查见 evidence/review-archive-v1/actual-review-sheet-check.json。故真实固定评估仍使用原草稿和 PENDING_HUMAN_REVIEW。这是预期保留状态；不代填实际人或时间。其他成员签字、M6 业务联调、正式集成分支与封存仍未完成。

M10 正式验收必须从真实阶段 Git 集成提交干净检出并核对 codeCommit，不能以无 .git 的导出 ZIP 替代；本修订仍为作者技术验证。
