# M8 Phase 2 交付清单

更新：2026-09-29。分支：`task/m8-p2-price-risk-contract`，目标：`phase2/intelligence-contracts`。

| 任务 | 交付物 | 技术状态 | 正式验收剩余条件 |
| --- | --- | --- | --- |
| AI2-06 | `price-data-schema.md`、来源登记、JSON Schema、原始/派生数据、流水线 | 已完成；未批准来源与坏输入明确失败 | M5/M6 数据授权和事实口径；M10 独立复现 |
| AI2-07 | `price-evaluation-dataset.md`、12 条 L0 合成样本、manifest、metrics | 已完成；L3=0，预测指标明确 `NOT_EVALUATED` | 合法 L3 数据形成后才能评估预测效果 |
| AI2-08 | `price-trust-risk-contract.md`、策略、7 个样例、校验与负向测试 | 技术候选已完成；公开风险泄漏和自动处罚会失败 | M3/M5/M6 签字，M9 运行确认 |
| AI2-09 | M7/M8 脚本 + `evaluation-runbook.md` + 统一运行器 | 作者环境可执行 | M7 互审、M10 干净环境运行 |
| AI2-10 | `model-go-live-gates.md` | 数值、资源和降级门槛已填写 | M7/M10/M1 本人批准；批准前全部高级模型 no-go |

主要实现目录：`scripts/m8_phase2/`、`scripts/intelligence_phase2/`、`data/m8-phase2/`、`schemas/m8-phase2/`、`contracts/m8-phase2/`。

本提交不实现 Phase 3 服务，不修改 OpenAPI/SDK，不声明真实模型准确率，不替其他成员签字。
