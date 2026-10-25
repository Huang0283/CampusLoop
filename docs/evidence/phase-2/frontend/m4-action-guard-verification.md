# M4 动作守卫验收记录（FE2-08 ~ FE2-10）

## 目的与范围

验证 M4 负责的聊天、交易、评价、举报、通知页面满足两条边界：公开页面上的私有动作先登录再继续；私有页面未登录不能进入、非参与者不能读取内容。本记录只覆盖守卫与入口，不重复五态矩阵和业务状态机。

## 验收环境

- 分支：`task/m4-p4-governance-regression`，提交 `6c69925`（已同步 `origin/main` 的 Phase 3 修复）。
- 环境：Windows、Node.js `v24.21.0`、npm `11.19.0`。
- 后端未启动，本记录为代码审计与路由断言，不是浏览器双账号验收。

## 结果矩阵

| 入口 | 动作 | 未登录行为 | 实现位置 | 结果 |
| --- | --- | --- | --- | --- |
| 商品详情（Phase 2 原型） | 收藏、联系、举报商品/卖家 | 保存 pathname、query、hash 后进入 `/login` | `pages/market/ProductDetailPage.tsx` 调用 `requireAuthAction` | 通过（代码审计） |
| 求购详情（Phase 2 原型） | 收藏、联系、举报、查看匹配 | 保存当前路径后进入 `/login` | `pages/wanted/WantedDetailPage.tsx` 调用 `requireAuthAction` | 通过（代码审计） |
| 商品/求购列表（Phase 2 原型） | 收藏、发布等私有动作 | 同上，浏览与筛选不触发登录 | `pages/market/index.tsx` | 通过（代码审计） |
| `ReportModal` | 打开弹窗、提交举报 | 不自行判断登录，由入口统一守卫 | `components/transaction/ReportModal.tsx` | 通过（无重复登录判断） |
| `/chat`、`/chat/:id` | 读取会话 | 进入 `/login`，登录后回原页 | `router/index.tsx` 的 `Guard` | 通过（路由断言） |
| `/transactions`、`/transactions/:id` | 读取订单与时间线 | 同上 | `router/index.tsx` 的 `Guard` | 通过（路由断言） |
| `/transactions/:id/meetup` | 读取/保存约定 | 同上；非参与者由接口拒绝 | `router/index.tsx` 的 `Guard` | 通过（路由断言） |
| `/transactions/:id/review` | 提交评价 | 同上；未完成/取消订单不展示可提交表单 | `router/index.tsx` 的 `Guard` | 通过（路由断言） |
| `/notifications`、`/report` | 读取通知/本人举报 | 同上；只调用本人接口 | `router/index.tsx` 的 `Guard` | 通过（路由断言） |
| 商品详情（Phase 3/4 真实页面） | 收藏、联系卖家 | 调用 `requireStudent`，保存 pathname 后进入 `/login` | `live/MarketPages.tsx` | 通过（代码审计） |

## 可复现验证

在 `frontend/` 执行 `npm run test:m4`，其中两项直接断言本记录：

- “守卫：M4 私有路由均由 Guard 包裹”：逐个检查 `/chat`、`/chat/:id`、`/transactions`、`/transactions/:id`、`/transactions/:id/meetup`、`/transactions/:id/review`、`/notifications`、`/report` 的路由行包含 `<Guard>`。
- “守卫：公开商品/求购页的举报动作走统一登录动作守卫”：检查原型商品/求购详情调用 `requireAuthAction`，且 hook 保存来源路径。

2026-10-18 执行结果：15 项全部通过，`lint` 与 `build` 通过。

## 阶段差异登记

- 差异：Phase 2 原型要求游客点击“举报”后保存来源并登录；Phase 3/4 真实商品页仅在 `user.role === 'USER'` 时渲染 `ReportButton`，游客看不到举报入口，只能通过收藏/联系触发登录。
- Owner：M3（页面渲染）、M4（举报组件）；确认人：M2、M10。
- 影响：游客无法从商品页发现举报入口；不构成越权，但与 Phase 2 的“点击后登录”体验不一致。
- 下一动作：Phase 4 功能冻结前由 M4 在 PR 中提请 M3/M2 决定保留隐藏或改为点击后登录，不在本分支擅自修改市场页面。
- 截止：Phase 4 阶段收口前。

## 浏览器补验（2026-10-19）

在真实后端（API `http://localhost:8001`）与前端 `http://localhost:5173` 上执行 `npm run test:live`：

- `journey.spec.ts:191`“guest browse, failure recovery, secure reload restoration, logout and fixed navigation”通过：游客可浏览市场与详情，受限入口进入登录并恢复来源，退出后重载不恢复身份。
- 未直接断言“游客点击举报后登录”：真实页面对游客不渲染 `ReportButton`，与上文差异登记一致。
- 非参与者读取私聊/订单被拒由 `journey.spec.ts:14` 的双账号隔离与后端 403 覆盖；M4 私有路由的 `Guard` 仍由 `test:m4` 静态断言。
