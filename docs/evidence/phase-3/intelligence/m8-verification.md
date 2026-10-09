# AI3-10 M8 复现与验证

从仓库根目录执行：

```powershell
python -m unittest discover -s services/m8_baseline/tests -v
python -m services.m8_baseline.verify --output-dir ../m8-p3-run
```

兼容基线为 Python 3.10+，本次证据环境为 Python 3.10.11。M8 Phase 3 新代码只使用标准库并复用仓库内 Phase 2 价格规则。`verify` 会运行测试、连续生成两份固定评估并做逐字节比较，同时记录 Python/平台、源文件 SHA-256 和结果哈希。

本次记录：16 项测试通过；9/9 固定规则用例通过；两次输出逐字节一致。证据位于 `evidence/m8-v1/`。

结论只代表 M8 自测 PASS。M7 交叉 review、M3/M5/M6/M9 的契约确认、M10 独立运行和 M1 最终门禁仍为待办，不能提前标记通过。
