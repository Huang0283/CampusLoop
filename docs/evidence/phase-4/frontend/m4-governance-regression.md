# M4 治理与交易回归（FE4-07 / FE4-08 回归项）

## 范围与输入

- 分支：`task/m4-p4-governance-regression`，基线 `b281ba6`（`phase4/frontend-integration`）。
- 合并提交：`6c69925`，将 `origin/main` 已合并的 Phase 3 修复（`d034ad7`、`7c539f7`，PR #103）同步到本分支；M4 只回归，不重复实现。
- 对应任务：`docs/issues/frontend-phase-4-ai-integration-freeze.md` 的 FE4-07/FE4-08 回归三项。
- 环境：Windows、Node.js `v24.21.0`、npm `11.19.0`。
- 运行实例：Docker Compose `campusloop-api-1`（8001，healthy）、`campusloop-db-1`（PostgreSQL 16）、`campusloop-redis-1`、`campusloop-minio-1`；前端 Vite `http://localhost:5173`；Playwright Chromium。
- 真实浏览器回归于 2026-10-19 执行；注册接口限制为每 IP 10 次/小时，因此按 spec 分批执行，每批前清空 Redis `auth:*` 限流键，未修改生产鉴权策略。

## 可复现命令与结果

在 `frontend/` 执行：

```bash
npm run lint
npm run build
npm run test:m4
npm run test:transaction
```

实际结果：

- `lint`：退出码 0，无告警输出。
- `build`：成功（首次冷构建 17.52 秒，缓存复跑 3.11 秒）；保留既有 bundle 体积警告，不是构建失败。
- `test:m4`：15 项通过，见下文逐项覆盖。
- `test:transaction`：8 个 Mock 状态层场景通过（既有基线，未改动语义）。
- `test:live`（`CAMPUSLOOP_UI_URL=http://localhost:5173`）：23 项通过
  - `journey.spec.ts` 6 项：双账号真实交易、求购与价格、原价校验、游客与会话恢复、移动空态、跨标签账号切换。
  - `m2-phase4.spec.ts` 6 项：举报私密证据契约、普通用户后台隔离、渲染故障恢复、后台治理缺失提示、超时恢复、管理员禁用与恢复并撤销会话。
  - `m3-phase4.spec.ts` 10 项：搜索降级与关键词恢复、匹配约束与过期、价格建议模型/低置信/样本不足、游客保护。
  - `m2-async-state.spec.ts` 1 项：七态异步组件与外层错误边界。

## 回归项 1：见面时间与过期版本

实现：`frontend/src/live/meetupTime.ts`；页面：`frontend/src/live/TransactionPages.tsx`。

- `campusToday()` 以 UTC+8 计算当天日期，浏览器处于其他时区时不改变校园日期。
- `validateMeetupStart()` 拒绝过去时间与非法日期，保存前和字段校验各执行一次。
- `validateMeetupEnd()` 本轮从页面内联校验抽出，拒绝结束时间等于或早于开始时间；页面 validator 改为调用同一函数。
- 订单详情对“未完成双方确认且开始时间已过”的约定展示改约警告，并禁用“确认当前版本”（`TransactionPages.tsx` 的 `meetupNeedsReschedule`）。
- `test:m4` 断言：昨天、今天已过、非法日期、结束时间不晚于开始时间均抛出；未来时间与空值通过。

浏览器结果（`journey.spec.ts:14`）：填入 `2000-01-01` 保存时出现“见面开始时间必须晚于当前时间（北京时间）”且 `POST /orders/{id}/meetup` 次数为 0；改为明天、结束时间 11:00 早于开始 12:00 时出现“结束时间必须晚于开始时间。”且仍为 0；改为 13:00 后保存成功并回到订单详情，双方确认当前版本后可各自完成交易。

未单独断言：后端 `409 ORDER_STATE_CONFLICT` 的过期确认路径（前端已禁用按钮），以及服务器时区与浏览器时区不同的极端组合。

## 回归项 2：举报原因按订单身份

实现：`frontend/src/live/reportReasons.ts`；入口：`frontend/src/live/ReportButton.tsx`、`TransactionPages.tsx`（订单详情按 `user.id === seller.id` 传 `orderRole`）。

- 商品举报：商品类原因 + 行为类原因。
- 订单举报（买家）：包含商品虚假、描述不符、异常价格，并保留行为类原因。
- 订单举报（卖家）：只有垃圾信息、骚扰、其他违规，不出现商品虚假/描述不符。
- 用户与聊天消息举报：仅行为类原因。
- 卖家 `VIOLATION` 文案为“交易违规（恶意下单、爽约等）”，买家为“其他交易违规（爽约等）”。
- `test:m4` 对上述五组组合逐一断言。

## 回归项 3：我的举报与跨账号隔离

实现：`frontend/src/live/ReportsPage.tsx`、`frontend/src/router/index.tsx`、`frontend/src/live/common.tsx`、`frontend/src/live/TransactionPages.tsx`。

- `/report` 路由由 `Guard` 保护，渲染 `ReportsPage`，展示本人举报的目标、原因、说明、状态和提交时间。
- 账户菜单包含“我的举报”；举报成功提示提供“查看我的举报”链接；`/notifications` 底部复用 `MyReports`。
- 页面只调用 `GET /reports/mine`，不读取证据图片或管理员风险字段。
- `test:m4` 断言路由守卫存在、举报原因与目标映射正确。
- 浏览器结果（`journey.spec.ts:14`）：卖家提交举报后可通过成功提示进入“我的举报记录”，刷新后记录仍在；从账户菜单“我的举报”可再次进入；买家打开 `/report` 看不到卖家的举报正文；买家在 `/notifications` 底部能看到自己的举报区块。

## 本轮收尾修复（2026-10-19）

- 新增 `frontend/src/live/notifications.ts`，在前端展示层按通知 ID 去重并保留首次顺序，避免上游重试返回重复任务通知时重复展示。
- 通知页的单条已读、查看时自动已读和全部已读都会发出 `campusloop:notifications-changed` 事件；Shell 收到事件后立即刷新顶部未读数，不再等待五秒轮询。
- 通知页和“我的举报”查询键均包含当前用户 ID，登录账号切换后不会复用上一账号的页面缓存。
- `frontend/scripts/verify-m4-governance.mjs` 新增 2 项检查；本轮共 17 项通过。该修复只处理前端显示同步和缓存隔离，不改变 M6 的通知生成、幂等或 OpenAPI 契约。

## 剩余未完成

- FE4-07 完整范围：前端重复展示防护与已读同步已完成；后端智能匹配任务的唯一通知生成、重试幂等和任务枚举仍依赖 M6 契约，需在阶段集成环境由 M10 验证。
- FE4-08 完整范围：管理员处理后的用户可见反馈、内部风险依据与证据隔离由 M2 后台页和 M10 验收覆盖；M4 侧只验证用户看不到他人举报与证据。
- 浏览器回归受注册限流影响需分批执行（每 IP 10 次/小时），执行前需清空 Redis `auth:*`；这是测试环境操作，不是产品缺陷，未修改鉴权策略。
- 截止：Phase 4 阶段收口前。

## 结论

原 M4 回归记录中的真实浏览器结果仍需以阶段集成环境复验为准。本轮独立静态验收在无 Docker 后端条件下完成：`npm run lint`、`npm run build`、`npm run test:m4`（17 项）和 `npm run test:transaction`（8 项）全部通过；没有把未执行的真实 API/双账号回归冒充通过。FE4-07/08 的剩余范围如上，未在本文件声称全部完成。
