# AI5-05 价格建议发布清单

本清单只描述当前仓库中的 M8 规则实现和候选门禁。它不是模型上线批准，也不把实验候选写成生产功能。

## 当前实现

价格建议由 `services/m8_baseline/engine.py::price_advice` 调用 Phase 2 的确定性规则。正式服务版本是 `m8-price-rule-v1`，输入 schema 是 `m8-baseline-rpc-v1`，接口为受令牌保护的 `POST /v1/price-advice`。后端通过 `backend/app/api/routes/intelligence.py` 转换用户输入，页面只展示区间、因素、状态、免责声明和 `resultVersion`。

规则使用商品类别、成色、原价（分）、购买月数、配件状态和缺陷标签。成色先决定低/中/高三个倍率；类别提供年折旧率和最低折旧系数；购买月数按年折旧；配件不完整或存在缺陷时只下调低位和建议值；金额以分计算并按人民币档位舍入，最后保证 `lower <= recommended <= upper`。缺少合规原价时返回 `INSUFFICIENT_DATA` 和空区间，不猜测价格。规则版本、免责声明和降级字段随结果返回。

当前生产路径不使用候选模型。Phase 4 路由 `m8-price-phase4-router-v1` 可以检查候选开关，但 `candidateEnabled=false` 是默认值，`candidateServingAllowed=false` 由 `NO_GO` 门禁强制保证；服务故障或候选不可用时回到规则版本或人工输入路径。候选版本 `m8-price-candidate-v1`、特征版本 `m8-price-features-v1` 只作为冻结契约登记，尚未训练和发布。

## 版本与安全约束

规则的输入、输出和候选门禁必须与 `contracts/m8-phase4/readiness-policy.json`、`services/m8_phase4/router.py`、`services/m8_phase4/response_validation.py` 保持一致。不得把挂牌价或议价价当作成交标签；不得把建议区间解释成成交保证；不得在公开结果中泄露用户身份、聊天内容、精确位置或管理备注。任何真实候选训练都必须先满足 PDS-02 授权、M5/M6 独立审批、至少 200 条 L3 完成交易和六个规定类别每类至少 30 条的门禁。授权、脱敏、退款/争议排除与快照生成见 [M8 真实成交数据三项补强](m8-real-data-remediation.md)。

## 当前结论

2026-10-25 的原发布核对在 Python 3.12.14 / Windows AMD64 完成，M8 Phase 2、Phase 3、Phase 4 当时分别通过 14、31、29 项测试。真实数据门禁补强后又在 Python 3.10.11 / Windows 完成 14、31、36 项测试，重复输出一致，价格回退一致率为 1.0。现有数据只有 12 条 L0 合成记录、0 条合格 L3，因此 MAE、MAPE、区间覆盖率和候选训练均为 `NOT_EVALUATED`，发布结论为 `NO_GO`。在补齐并封存合规 L3 数据前，必须继续使用 `m8-price-rule-v1`。
