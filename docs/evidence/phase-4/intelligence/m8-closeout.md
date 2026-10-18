# M8 Phase 4 收尾与组内复核

日期：2026-10-18。复核基准：`phase4/intelligence-models@f1b9b7519b51d896c09d36e391632d9460da1940`，包含已合并的 PR #107 与 PR #109。

## M8 接收结论

M8 对最新联合分支完成组内技术复核，结论为 **ACCEPTED_WITH_NO_GO**：M8 的 Phase 2 数据契约、Phase 3 规则服务、Phase 4 数据门禁、路由回退、评估和信誉/风险规则均被保留；M7 的响应校验、停服务回退和联合部署改动未破坏 M8 行为。

该结论只关闭 M8 在 Issue #31 中的个人交付与组内复核动作，不代表整个 Phase 4 已完成，不批准候选模型训练或上线，也不代替 M6/M9/M10/M1 的接收与签署。

## 实际复验

从干净工作树运行：

```powershell
python -m services.m8_phase4.verify --output-dir <new-output-dir> --source-commit f1b9b7519b51d896c09d36e391632d9460da1940
python -m services.intelligence_phase4.verify --output-dir <new-joint-output-dir>
```

结果如下：

- M8 Phase 2：14/14 PASS。
- M8 Phase 3：31/31 PASS。
- M8 Phase 4：29/29 PASS。
- 联合验证四步全部 PASS：M7 baseline、M8 regression、joint deployment、M7 private unit tests。
- 联合部署 12/12 场景 PASS；候选部署仍关闭。
- 工作树在验证开始时为干净状态；联合验证源提交为 `f1b9b7519b51d896c09d36e391632d9460da1940`。
- 固定 BGE 模型不在本机，因此没有把本轮执行写成语义模型推理复现；`formalStageComplete` 保持 `false`。

原始日志和机器记录归档在 [m8-closeout-v1](evidence/m8-closeout-v1/run-record.json)，联合执行记录见 [joint-run-record.json](evidence/m8-closeout-v1/joint-run-record.json)。

## 为什么仍然是 NO_GO

最新门禁报告确认：当前 12 条记录均为 L0 合成边界样本，可用于测试但不能用于训练；合格 `L3_COMPLETED_TRANSACTION` 成交标签为 0，低于最低 200 条；数据集未封存，来源许可仍为 `restricted`，M5/M6 授权缺失，类别切片也未达到每类 30 条。

因此：

- 不训练价格回归候选；`candidateState=NOT_TRAINED_GATE_NO_GO`。
- 基线和候选准确率都保持 `NOT_EVALUATED`，不复制规则结果冒充模型指标。
- 线上继续使用 Phase 3 规则定价和手动定价；候选开关关闭，失败时安全回退。
- 后续只有在真实成交数据获得授权、清洗、封存并达到门槛后，才重新启动训练和同口径评估。

## 剩余责任人

- M6/M9：发布环境、权限、健康检查、回滚和资源记录。
- M10：从最终阶段提交进行非作者独立复现并签署结论。
- M1：确认最终范围、冻结提交与标签，并决定是否合入 `main` 和关闭 Issue #31。

在这些动作完成前，Issue #31 必须保持打开，`phase4FreezeCommit` 和 `phase4Tag` 保持为空。
