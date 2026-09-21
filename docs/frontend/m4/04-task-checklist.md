# M4-04 个人任务清单（第一阶段）

> 状态图例：☐ 未开始 ｜ 🔄 进行中 ｜ ✅ 完成 ｜ ⏸ 阻塞（需注明依赖人）

## A. 原型绘制（第 3 周截止）

| # | 任务 | 状态 | 交付物 |
|---|---|---|---|
| 1 | 聊天会话列表 + 聊天详情页原型 | ✅ `ChatListPage` / `ChatDetailPage` 可点击原型 | src/pages/transaction/ |
| 2 | 商品上下文、求购上下文、历史消息区域 | ✅ ChatDetailPage 内上下文卡片 | 同上 |
| 3 | 结构化报价/还价/接受/拒绝/过期状态 | ✅ OfferCard 组件六态 | src/components/transaction/OfferCard.tsx |
| 4 | 订单列表、订单详情、订单时间线 | ✅ OrderListPage / OrderDetailPage | src/pages/transaction/ |
| 5 | 见面时间、地点、修改、双方确认流程 | ✅ MeetupPage | src/pages/transaction/MeetupPage.tsx |
| 6 | 双方完成确认流程 | ✅ OrderDetailPage 确认区 1/2→2/2 | 同上 |
| 7 | 交易完成后的评价流程 | ✅ ReviewModal（总体/描述/沟通/守时） | src/components/transaction/ReviewModal.tsx |
| 8 | 用户/商品/交易/聊天举报入口 | ✅ 商品详情、聊天详情和订单详情共用 ReportModal | src/components/transaction/ReportModal.tsx |
| 9 | 通知列表和已读状态 | ✅ NotificationPage 分组 tab | src/pages/transaction/NotificationPage.tsx |
| 10 | 个人交易中心（购买/出售/进行中/已结束） | ✅ MyTransactionsPage | src/pages/transaction/MyTransactionsPage.tsx |
| 11 | 双账号完整交易泳道图 | ✅ | docs/frontend/m4/03-two-account-swimlane.md |
| 12 | 各交易状态下买卖双方操作矩阵 | ✅ | docs/frontend/m4/01-transaction-state-machine.md + constants/order.ts |
| 13 | 断线/消息补拉/重复消息/发送失败提示 | ✅ | docs/frontend/m4/02-exception-interactions.md |
| 14 | 重复提交/报价过期/一方确认/约定修改交互 | ✅ | docs/frontend/m4/02-exception-interactions.md |

> **原型收尾记录（2026-09-18）**：A 组全部完成，另交付清单外的四项——
> ① 按钮级权限体系（`stores/auth.ts` 身份基座 + `access/permissions.ts` + `<Can>` 组件，操作矩阵三级可见性 enabled/disabled/hidden 全部有数据可验，契约见 `06-button-permissions.md`）；
> ② mock 状态层（`mocks/` 可变内存 store，接受报价→订单→确认约定→完成→评价全流程可点击流转，刷新重置）；
> ③ DISPUTED 争议态用例（订单 #8004：取消按钮 disabled + tooltip，步骤条 error）；
> ④ 修复 MeetupPage DatePicker 需 dayjs 对象的渲染崩溃。验收方案见 `07-acceptance-button-permissions.md`。

## B. 跨角色协作核对

| # | 任务 | 状态 | 备注 |
|---|---|---|---|
| 15 | 与 M6 核对报价、订单、见面约定状态 | 🔄 以 docs/01 为核对稿，问题清单见文末 | 每周三接口会 |
| 16 | 与 M10 核对双账号端到端测试场景 | 🔄 以 docs/03 异常分支 E1-E10 为场景稿 | 每周五演示会 |

## C. 后续开发里程碑（原型通过评审后）

- [ ] 第 5 周：聊天页面接真实接口 + WebSocket 封装（`api/ws.ts`）
- [ ] 第 6 周：议价 / 订单 / 见面约定 / 完成 / 评价联调（M4 主力周）
- [ ] 第 7 周：通知中心接入智能匹配推送（M7）
- [ ] 第 8 周：补齐错误/无权限状态，冻结功能
- [ ] 第 9 周：与 M10 完成并发/断线测试，出异常状态说明
- [ ] 第 10 周：双账号演示脚本 + 答辩材料
