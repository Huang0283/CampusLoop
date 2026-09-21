# M2-07 第一阶段任务分支与 PR 追踪

## 使用范围

本文件记录前端第一阶段已经进入 `phase1/frontend-experience` 的任务 PR、主要范围和验收入口。GitHub Review、跨组确认、M1 范围验收和 M10 可测试性确认必须由对应人员完成，本文件不代签。

## M2：框架、身份与页面规范

- PR #10 `task/m2-issue-branch-link`：记录阶段集成分支；验收入口为 `docs/issues/frontend-phase-1-experience.md`。
- PR #11 `task/m2-frontend-audit`：前端现状审计；验收入口为 `docs/frontend/m2/01-frontend-audit.md`。
- PR #12 `task/m2-page-route-table`：页面与路由总表；验收入口为 `docs/frontend/m2/02-page-route-table.md`。
- PR #13 `task/m2-navigation-structure`：导航结构；验收入口为 `docs/frontend/m2/03-navigation-structure.md`。
- PR #14 `task/m2-fix-audit-content`：补充审计内容；验收入口为 `docs/frontend/m2/01-frontend-audit.md`。
- PR #16 `task/m2-m3-ui-pages`：M2/M3 静态页面；验收入口为 `/login`、`/register`、`/profile`、`/admin`、`/market` 和求购页面。

## M3：市场、商品与求购

- PR #16 `task/m2-m3-ui-pages`：市场、商品、求购静态 Mock 页面；验收入口为 `/market`、`/product/101`、`/publish`、`/my-products`、`/favorites`、`/wanted`、`/wanted/1`、`/wanted/publish`、`/wanted/matches` 和 `/publish/price-advice`。
- 第一阶段字段、状态和流程证据：`docs/frontend/m3/01-market-fields-interactions-and-states.md`、`docs/frontend/m3/02-product-and-wanted-flows.md`。

## M4：聊天、订单与交易

- PR #19 `task/m4-order-detail`：订单详情、评价和个人交易页面。
- PR #28 `task/m4-report-chat-notification-v2`：举报、聊天、通知及第一阶段本地验收补齐。
- PR #32 `task/m3-transaction-pages`：聊天详情和见面约定页面 UI。
- PR #38 `task/m4-restore-meetup-flow`：恢复见面约定的订单参数、身份权限、版本和双方确认流程。
- PR #39 `task/m4-merge-transaction-entry`：交易中心统一到 `/transactions`，保留身份与状态筛选及旧路径重定向。
- PR #40 `task/m4-unify-icons-and-link-pages`：统一顶部栏和导航，聊天列表跳转详情，通知读取共享 Mock 状态并跳转目标页面。
- 验收入口为 `/chat`、`/chat/5001`、`/transactions`、`/transactions/8001`、`/transactions/8001/meetup`、`/transactions/8002/review` 和 `/notifications`。

## 阶段汇总

- PR #17 `phase1/frontend-experience` → `main`：合并当时的第一阶段基线。
- PR #28、#32、#38、#39、#40、#41 在 PR #17 之后进入阶段分支；阶段汇总 PR #43 已由 M2 提交并合并到 `main`，合并提交为 `a07b1a6`。
- 上述任务 PR 当前没有 GitHub Review 记录。前端成员交叉评审属于尚未完成的人员协作项，不能由文档自动标记完成。

## 第一阶段状态口径

- 第一阶段验收低保真或静态 Mock、页面范围、流程、状态、权限和异常规则。
- 第二阶段验收可点击 Mock 原型和接口契约。
- 第三阶段验收真实认证、HTTP/WebSocket、上传和数据持久化。
- 本文件中的页面地址证明入口存在，不代表真实接口已联调。
