2026-10-17 联合续交付：M7 私有候选、坏响应修复、AI4-09 双服务回滚，以及 AI4-10 待原负责人确认材料已提交 [PR #107](https://github.com/Huang0283/CampusLoop/pull/107)。见 [联合交付入口](joint-delivery/README.md)。下文 M8 原交付清单保留，不代表原负责人已经确认新增联合材料。

---

# Phase 4 智能功能组交付清单：M8 验收补齐

本清单对应 [Issue #31](https://github.com/Huang0283/CampusLoop/issues/31) 的 M8 范围，承接已合并 PR #97；不代填 M7、M10 或 M1 的交付结果。

## 任务与产物

- AI4-05：`services/m8_phase4/readiness.py`、`contracts/m8-phase4/readiness-policy.json`、[price-model-readiness.md](price-model-readiness.md) 和 [readiness.json](evidence/m8-acceptance-v2/readiness.json)。记录 L3 数据、授权、版本及封存门禁；本次结论 `NO_GO`。
- AI4-06：`services/m8_phase4/router.py`、`contracts/m8-phase4/service-contract.json`、[price-model-card.md](price-model-card.md) 及 `services/m8_phase4/tests/`。当前交付为禁用候选槽位、契约验证与安全回退，按 Issue 条件禁止在数据门禁未通过时训练回归模型。
- AI4-07：`services/m8_phase4/metrics.py`、`evaluate.py`、[price-model-report.md](price-model-report.md) 和 [逐样本输出](evidence/m8-acceptance-v2/price-comparison.json)。12 个 L0 样本用于回退一致性测试；缺少 L3 标签时准确率、覆盖率及漂移指标为 `NOT_EVALUATED`。
- AI4-08：`services/m8_baseline/engine.py`、[trust-risk-evaluation.md](trust-risk-evaluation.md) 和 [机器结果](evidence/m8-acceptance-v2/trust-risk-evaluation.json)。信誉保留冷启动先验；风险只供人工审核，不修改账号、商品或交易状态。
- AI4-09 的 M8 部分：[deployment-and-rollback.md](deployment-and-rollback.md)、路由回退测试及 `services/m8_baseline/client.py`、`response_validation.py`。私有 RPC 空数据、缺字段、错误版本、非法数值和危险输出全部安全降级，正常响应按原规则返回。

## 本次新增验收资产

- `services/m8_baseline/tests/test_client_http.py`：真实 HTTP 客户端故障注入与正常结果兼容性。
- `services/m8_phase4/verify.py`、`tests/test_verify.py`：统一执行三个阶段测试，保存原始日志，验证失败不写成功记录，拒绝覆盖历史目录。
- [m8-verification.md](m8-verification.md)、[verification.md](verification.md)、[handoff.md](handoff.md)：可复现验收与接收清单。
- `scripts/maintenance/` 与 [前三阶段运行检查](phase123-runtime-review.md)：隔离环境运行、真实浏览器验证和 M8 后端兼容性记录。

M8 修复源码提交为 `dd45e484ec043af88f65c69cc672678e9143c3a4`。证据提交与最终修复 PR 的准确提交号由 Git 历史及 PR 页面记录。阶段集成分支为 `phase4/integration`；本次修复分支为 `fix/m8-p4-acceptance`，作为 PR #97 的后续修复提交给同一集成分支。
