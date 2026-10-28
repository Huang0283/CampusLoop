# AI5-06 价格复现与门禁指南

所有命令从仓库根目录运行，输出目录必须是新的空目录。M8 规则只依赖 Python 标准库；建议使用 Python 3.12.14，并保存实际 `run-record.json`、环境版本和命令输出。

## 数据和来源检查

```powershell
python scripts/m8_phase2/pipeline.py verify
python -m services.m8_phase4.transaction_dataset inspect-authorization
python -m services.m8_phase4.verify --source-commit (git rev-parse HEAD) --output-dir C:/audit/m8-phase5
```

第一条命令校验现有 L0 数据和派生清单；第二条命令检查独立授权记录，当前应以退出码 2 和 `NO_GO` 结束；第三条命令执行 Phase 2/3/4 回归并生成验证证据。命令不会训练候选，也不会修改数据库。真实导出与快照步骤见 [M8 真实成交数据三项补强](m8-real-data-remediation.md)。

获得真实审批并在仓库外生成私有快照后，将第三条命令增加 `--dataset-dir C:/secure-campusloop-private/snapshot-v1`。此时 readiness 会读取指定快照并重新核验样本、来源登记、策略与授权 SHA；快照仍需经过冻结、训练与模型评估门禁，授权通过不等于候选可上线。

## 结果解释

`readiness.json` 是唯一的候选门禁来源；不能用测试通过替代门禁通过。`price-comparison.json` 必须同时保存规则版本、候选版本、数据集版本、样本数、基线指标、候选指标、回退一致率和 `decision`。只有存在合规 L3 成交价时，才允许计算 MAE、MAPE、区间覆盖率和时间切片；挂牌价、accepted offer 和 L0 合成价只能用于结构检查。

当前复现结果是：`records=12`、`eligibleL3=0`、`decision=NO_GO`、规则状态一致率 1.0、候选 `NOT_TRAINED_GATE_NO_GO`。因此报告必须写“规则基线通过回归，候选未训练/未评估”，不能写成“价格模型准确率为零”或“模型已上线”。

## 交付前检查

M8 先检查来源授权、敏感字段排除、数据集和 schema 版本，再由 M10 独立重算指标。M9 只在隔离验收环境验证 RPC 和停止服务后的人工录入降级；M6/M3 用真实页面核对区间、免责声明、版本和降级原因。任何门禁失败都保留规则基线，禁止复制样本、降低阈值、改变测试集或隐藏失败类别。
