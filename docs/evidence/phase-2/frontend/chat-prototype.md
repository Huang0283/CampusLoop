# FE2-08 聊天原型交付

## 范围与入口

- 本轮由集中收尾实现，不代填 M4 原作者贡献、成员 Review 或跨组对签。
- `http://localhost:5173/chat`：只显示当前演示学生参与的会话。
- `/chat/5001`：学生 1 与学生 2 的商品会话；失败消息提供重发入口。
- `/chat/5002`：学生 1 与学生 3 的显示器报价会话，可从报价推进订单。
- `/chat/5003`：求购上下文；不伪造商品报价上下文。
- 游客通过学生路由守卫进入登录；管理员不能进入学生私有页面；非参与者不能查看详情。

## 已实现与手动验收

1. 登录演示学生 1，打开聊天列表与详情，核对对方、商品/求购上下文、未读数量和时间分隔。
2. 输入消息并发送，核对发送中、已发送、失败与重发状态；种子失败消息可直接重发。
3. 使用详情页的模拟断线、对方消息和服务端离线消息入口，检查重连提示、补拉与消息去重。
4. 相同 `clientMsgId` 消息不能在会话重复展示；断线期间服务器内存消息由补拉恢复。这里只是 Mock 链路，不是已部署 WebSocket。
5. 切换为学生 2 访问 `/chat/5002`，不得展示学生 1/3 的会话内容。

## 数据与替换

- 身份：`src/stores/auth.ts`；数据：`src/mocks/transaction.ts`；链路与消息缓存：`src/stores/realtime.ts`、`src/api/mockWsTransport.ts`、`src/mocks/chatBackend.ts`。
- `VITE_WS_URL` 为空时保持明确 Mock。Phase 3 替换真实会话/历史消息 HTTP 接口和 `ws://localhost:8001/ws`，保留客户端幂等键、重试和补拉语义。
- Phase 3 必须补服务端参与关系校验、游标分页、认证失效、多窗口/多设备恢复；本阶段不声称它们已完成。

## 证据边界

- `npm run test:transaction` 直接加载实际 TypeScript store，覆盖交易参与关系；它不覆盖浏览器消息渲染、断线动画或真实 WebSocket。
- 人工浏览器场景、另一成员 Review、M10 签收仍待记录，不据此关闭 Issue #18。

## 2026-10-18 收尾验收补录

- 分支 `task/m4-p4-governance-regression`（`6c69925`，已同步 main 的 Phase 3 修复）。
- 执行：`npm run lint`、`npm run build`、`npm run test:transaction`、`npm run test:m4`；全部通过（交易 Mock 8 项、M4 治理 15 项）。
- 守卫：`/chat`、`/chat/:id` 均由 `Guard` 保护，见 `m4-action-guard-verification.md`。
- 五态：见 `page-state-matrix.md` 的 M4 表格；加载/失败列在 Phase 3 真实接口中补齐，不在本文件冒充已实现。
- 2026-10-19 浏览器补验：`journey.spec.ts:14` 通过，覆盖双账号实时收发、失败消息重试、断线重连、补拉后同一消息只显示一次、私聊图片与跨账号隔离。
- 仍有边界：断线场景为浏览器离线模拟，不等于多设备弱网；服务端消息顺序与分页并发仍需 M10 独立复验。
- 交付文档不再缺少验收步骤与结果记录，但浏览器验收与外部签收保持未完成状态。
