## 问题与结果

完成M6 BP4-03～BP4-06及M5交接H4-02：相同业务版本重投使用稳定幂等键，所有重试路径最多五次；结果保留输入版本/期限，搜索与匹配再检查当前对象；AI超时或坏响应使用关键词/规则或显式不可用，发布事务不等待AI。

同步治理OpenAPI和生成SDK，补本人/管理员信誉、举报人工覆盖、reason/note/幂等头约束，区分普通与管理员举报DTO，并补价格LOW_CONFIDENCE实际状态。

## 分支与交付物

- base：phase4/backend-integration；head：task/m6-p4-ai-orchestration。
- 基线：9ceddb1cc2d90f9f587b88017e92b043630e0f1d（M5合入后）。
- 代码：backend/app/services/{matching_jobs,intelligence,ai_adapters}.py、backend/app/api/routes/intelligence.py。
- 测试：backend/tests/test_{ai_orchestration,matching_jobs,live_intelligence}.py、scripts/m6_phase4/test_governance_contract.py。
- 契约：openapi/campusloop.v1.yaml、frontend/src/sdk/generated/。
- 证据目录：docs/evidence/phase-4/backend-platform/。
- 必交四份：task-trigger-design.md、task-result-lifecycle.md、ai-business-api.md、degradation-implementation.md。
- 自测/交接：m6-verification.md、m6-handoff.md、m6-runtime-requirements.md、evidence/m6-backend-tests.xml、evidence/m6-source-sha256.json。

## 验证

命令和环境详见m6-verification.md。实际结果：后端pytest 36 passed / 42 skipped（本机无PostgreSQL）；ruff检查/格式通过；治理契约7项通过；契约结构64接口/9枚举/16样例通过；M7基线31、M8基线17、M8 Phase4 17项通过；前端sdk:check、lint、build通过，交易Mock 8场景通过。

42项跳过不代表通过，真实数据库并发/迁移、完整MVP浏览器E2E及BP4-10联合签字仍待M9/M10。M7语义模型未接入；M8 NO_GO仍有效。未编辑表结构、迁移、Worker入口或部署配置。

## 评审与接收

请M5或M9至少一人交叉Review；请M5确认H4-02，M7/M8确认契约及降级，M2/M3确认消费，M10/M1核对验收与冻结。接收动作和建议核对时间见m6-handoff.md。

按M5 → M6 → M9合入；M5后续汇总到phase4/integration。此PR不直接合入main，不自动关闭整个Phase4 Issue。
