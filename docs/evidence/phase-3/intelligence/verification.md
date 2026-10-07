# AI3-10 作者复现记录

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
