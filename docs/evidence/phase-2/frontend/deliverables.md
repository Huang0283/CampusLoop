# Phase 2 前端交付登记

## 当前基线

- 小组分支：`phase2/frontend-prototype`
- 本轮 M2 修复分支：`task/m2-p2-acceptance-fixes`
- 修复基线：`75014b4`
- M2 修复提交：`fe8b9b0`
- 本文件只登记已合并或已提交证据，不代表 M3/M4 和小组关闭门禁已经完成。

## M2 已提交

- FE2-01：`route-role-map.md`、路由守卫、`useRequireAuthAction`、桌面/移动端共享导航。
- FE2-02：`auth-profile-prototype.md`、登录/注册/资料原型；登录页可以演示成功、错误凭据、令牌失效和账号禁用。
- FE2-03：`component-specification.md`、`PageState` 五态组件及真实公共组件 API。
- FE2-04：`page-api-map.md`、生成 SDK 入口和当前契约缺口登记。
- FE2-12：`contract-review.md`、`mock-replacement-plan.md`、本目录验证和交接记录。
- FE2-11（M2 范围）：`page-state-matrix.md`，逐页登记 M2 公共、认证、资料和管理入口的加载、空、成功、失败、无权限状态或不适用理由。

## M3 已提交

- FE2-05：`market-prototype.md`，商品详情公开读取、收藏/联系/举报动作守卫和连续返回路径。
- FE2-06：`product-management-prototype.md`，商品新建、编辑回填、图片队列、草稿恢复、离开提醒、上下架、删除确认、重复提交保护和失败反馈原型。
- FE2-07：`wanted-ai-result-prototype.md`，求购公开读取、搜索/筛选/排序/分页、发布、编辑回填、关闭确认及匹配服务不可用时的规则降级原型。
- FE2-11（M3 范围）：`page-state-matrix.md`，登记市场、商品、求购和匹配页面的加载、空、成功、失败、无权限状态或不适用理由。
- 任务 PR：#63 `task/m3-transaction-pages -> phase2/frontend-prototype`。
- 收尾分支：`task/m3-p2-closeout`；只补齐 M3 的 FE2-06、FE2-07 和 FE2-11 页面范围，不代表 M2/M4 或跨组门禁完成。

## M4 本轮集中收尾提交

- FE2-08：`chat-prototype.md`；参与会话列表、聊天详情与实时 Mock 边界。
- FE2-09：`offer-order-prototype.md`；报价发起身份、还价、过期、接受与重复订单防护。
- FE2-10：`transaction-governance-prototype.md`；约定双确认/修改重置、评价、举报和通知。
- FE2-11：已追加 M4 页面五态或具体不适用理由；2026-10-18 改为表格并补 `/report` 行，不代替人工验收。
- `frontend/scripts/verify-transaction-prototype.mjs`：直接运行真实 store 的 8 个 Mock 自动化场景。
- 本轮提交与 PR 由集中收尾记录，不冒充 M4 原始个人提交或其他成员对签。

## M4 2026-10-18 收尾补录

- 分支：`task/m4-p4-governance-regression`，提交 `6c69925`（基线 `b281ba6`，已同步 main 的 Phase 3 修复）。
- FE2-08/09/10：三份交付文档补充验收执行步骤、实际命令结果与未执行边界。
- FE2-11（M4 范围）：`page-state-matrix.md` 的 M4 段改为表格，覆盖 `/chat`、`/chat/:id`、`/transactions`、`/transactions/:id`、`/transactions/:id/meetup`、`/transactions/:id/review`、`ReportModal`、`/notifications`、`/report`。
- 动作守卫：`m4-action-guard-verification.md`，登记私有路由 `Guard` 覆盖、公开页面 `requireAuthAction` 入口、真实页面 `requireStudent` 行为及阶段差异。
- 契约对齐：`page-api-map.md` 第 8 节第 7 条与 `contract-review.md` 的举报证据 6 张差异关闭，前端统一 5 张。
- 自动化：新增 `frontend/scripts/verify-m4-governance.mjs`，通过 `npm run test:m4` 执行 15 项断言（约见北京时间 6 项、结束时间 1 项、举报原因 5 项、证据上限 1 项、路由与入口守卫 2 项）。
- 本轮仍未执行浏览器双账号旅程与断线场景，`npm run test:live` 因本机容器运行时不可用未运行。

## 仍未计入完成

- M4 的人工浏览器验收、另一成员 Review 与任务 PR 签收。
- M4 公开业务页面动作守卫的浏览器端到端回跳未验收：代码审计与路由断言已通过（见 `m4-action-guard-verification.md`），实际未登录点击与登录后来源恢复仍需浏览器执行。
- M5/M6/M7/M8 契约对签、M10 可测试性验收、M1 范围复核。
- 小组汇总 PR 合入 `phase2/integration`。

因此 Issue #18 必须保持打开，不能由本轮 M2 修复单独关闭。
