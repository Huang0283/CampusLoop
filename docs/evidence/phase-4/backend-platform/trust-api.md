# BP4-01：信誉读取与字段边界（M5）

Owner：M5 胡可铭；依据：[Issue #30](https://github.com/Huang0283/CampusLoop/issues/30)。
实现提交：`c4687d5a44eb18d5a96af4bec03b85ec933da0be`。
作者自检通过，跨成员接收结论见 `handoff.md`，不代表阶段验收。

## 接口与可见性

| 接口 / operationId | 调用身份 | 返回边界 |
|---|---|---|
| `GET /users/{userId}/trust` / `getUserTrust` | 游客或登录者 | PUBLIC；目标必须存在且 ACTIVE |
| `GET /users/me/trust` / `getMyTrust` | 当前有效登录者 | SELF；只读取当前身份，无可修改的目标参数 |
| `GET /admin/users/{userId}/trust` / `adminGetUserTrust` | ADMIN | ADMIN；允许复核已禁用目标，读取写入审计 |

公开字段为 `status`、可选 `score`、`validEventCount`、`algorithmVersion`、
降级字段、`visibility`、固定模板 `explanation` 和经过白名单过滤的 `factors`。
SELF/ADMIN 额外允许 `ignoredEventCount` 和 `smoothing.priorScore/priorWeight`。
所有视图均不包含邮箱、风险线索、私聊、举报证据、密码或任意模型扩展字段。
factors 仅接受三种信誉代码，嵌套字段仅接受 code/effect/count。
公开视图去掉 smoothing/ignoredEventCount；M6 更新契约时应将这两个字段设为可选。
Bearer 登录身份对应的响应由现有中间件标记 `Cache-Control: no-store`。

## 事实与降级

信誉来源是数据库中目标作为被评价人的、订单状态为 COMPLETED 的真实评价。
未完成订单和完成但未评价的交易不会被虚构成好评。
继续消费 M8 `m8-baseline-rpc-v1` / `m8-trust-rule-v1`，不修改模型算法。

| 场景 | 实测结果 |
|---|---|
| 新注册且没有有效评价 | `NEW_USER_NEUTRAL`，score=3.5，validEventCount=0；解释为中性先验 |
| 双方完成交易，收到一条真实五星评价 | `AVAILABLE`，validEventCount=1，平滑后 score=3.75 |
| 模型开关关闭 | `UNAVAILABLE`，`SERVICE_DISABLED`，没有 score |
| 真实 HTTP 服务停止响应 | `UNAVAILABLE`，`SERVICE_TIMEOUT_OR_UNAVAILABLE`，没有 score |
| 被禁用目标 | 公开读取 404，本人旧令牌 423；管理员复核仍可读 |

不可用不等于负面信誉；风险入口保持独立管理员权限，不与公开信誉混合。
`/users/me/trust` 的静态路由注册在 `/users/{userId}/trust` 前，避免 me 被当作整数。

## 验证与接收

`backend/tests/test_governance_api.py` 覆盖上述身份、真实交易评价和超时场景；
`backend/tests/test_governance_projection.py` 注入顶层及嵌套敏感扩展，验证过滤。
命令、逐用例记录见 `verification.md` 和 `evidence/m5-api-results.json`。

M6 需同步统一 OpenAPI/SDK；M2/M3 需确认公开卡片和本人页面字段消费；
M8 需确认规则语义；M10 在阶段集成提交独立复测。
