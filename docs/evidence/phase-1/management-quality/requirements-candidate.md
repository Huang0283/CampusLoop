# MQ1-01 需求候选清单

本文件是 Phase 1 管理质量组的验收入口。需求范围和详细背景见 [`docs/management/m1/project-scope.md`](../../../management/m1/project-scope.md)，需求追踪见 [`requirements-traceability.md`](requirements-traceability.md)。

## 候选范围

纳入 MVP 的需求域为：账号与资料、商品与市场、关键词搜索与筛选、收藏、聊天与报价、订单、见面约定、双方完成确认、评价、举报与通知、最低管理后台。每项需求必须有唯一 ID、用户角色、触发条件、前置条件、成功结果、失败或禁止行为、Owner、依赖、计划周次和验收场景。

## 边界

支付、物流、真实学校 SSO/学籍认证、跨校交易、硬件、智能见面推荐、自动封禁和商业级反欺诈均为 Out。AI 搜索、匹配、价格和风险能力属于 Core/Stretch，必须保留关键词或规则降级，不得把候选方案表述为已实现。

## 验收规则

抽取任意 `AUTH-*`、`MARKET-*`、`TRADE-*`、`AI-*`、`ADMIN-*` 或 `QUALITY-*` 需求，均可从追踪表定位到负责人、阶段、页面/服务、测试场景和证据；缺失字段不得进入冻结基线。
