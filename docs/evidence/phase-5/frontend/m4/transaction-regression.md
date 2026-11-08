# M4 交易与治理回归（FE5-06）

## 范围与环境

- 任务：FE5-06，聊天重连/补拉/去重、报价、约定、完成、评价、举报、通知。
- 分支：`task/m4-p5-transaction-fixes`，基线 `8e42674`（`phase5/frontend-release`）。
- 环境：Windows、Node.js 24.21.0；Docker Compose `api`（8001，healthy）、`db`（PostgreSQL，迁移 `0011`）、`redis`、`minio`、`baseline`、`worker`；Vite `http://localhost:5173`；Playwright Chromium。
- 本记录是 M4 作者执行结果，不代替 M2/M3 交叉评审或 M10 在同一提交上的复验。

## 回归矩阵

| 范围 | 验证方式 | 结果 | 证据 |
| --- | --- | --- | --- |
| 双账号完整交易 | `journey.spec.ts:15`，真实 API：注册两账号、发布、聊天、报价、接受、约定、确认、完成、评价、举报、通知已读 | 通过 | 6 项浏览器用例 |
| 聊天重连与补拉 | 断网后显示“实时连接恢复中”，恢复后“实时连接已建立”；离线期间消息经 HTTP 补拉 | 通过 | `journey.spec.ts:15`；`ChatPages.tsx` 的 `useChat` |
| 消息去重 | 失败重试 + 断线重连后同一条消息只显示一次 | 通过 | `journey.spec.ts:15`；`uniqueNotifications` 无关，消息按 `clientMsgId` 去重 |
| 报价 | 买家提交 45 元，卖家接受后进入订单详情 | 通过 | `journey.spec.ts:15` |
| 约定时间 | 过去日期、结束早于开始均被前端拦截且无写请求；改到未来后可保存；双方确认当前版本 | 通过 | `journey.spec.ts:15`；`test:m4` 约见 6 项 + 结束时间 1 项 |
| 完成交易 | 双方“我已完成交易”后订单变为已完成 | 通过 | `journey.spec.ts:15` |
| 评价 | 完成订单后买家提交四项评分，出现“评价已保存。” | 通过 | `journey.spec.ts:15` |
| 举报提交 | 卖家按订单身份只看到行为类原因；提交后关闭弹窗 | 通过 | `journey.spec.ts:15`；`test:m4` 举报原因 5 项 |
| 我的举报 | 提交成功提示进入列表；刷新保留；账户菜单可再次进入；买家看不到卖家举报正文 | 通过 | `journey.spec.ts:15` |
| 通知 | 通知页分类筛选、全部已读、未读数同步 | 通过 | `m2-notification-sync.spec.ts` 1 项；`journey.spec.ts:15` |
| 管理后台举报 | 列表分页、状态处理、会话撤销、私密证据读取 | 通过 | `m2-phase4.spec.ts` 6 项 |
| 交易 Mock 状态层 | 状态机、角色动作、失败回滚 | 通过 | `test:transaction` 8 项 |

## 本次举报闭环专项

在原有“可提交、可查看、可处理”基础上补齐举报人侧结果反馈：

- `/reports/mine` 返回 `handledAt`、`resolutionNote`，仍不含 `handledBy` 与证据键。
- 管理员 resolve/override 后创建 `REPORT_RESULT` 通知，内容为处理说明，链接 `/report`。
- `/report` 展示处理时间与说明，支持刷新与上一页/下一页；商品/订单目标可点击回详情。
- 商品详情不再允许卖家举报自己；求购详情新增“举报发布者”；后端拒绝 `SELF_REPORT_FORBIDDEN`。

真实浏览器核验（2026-10-26）：

1. `chen.demo@example.com` 在商品 #2031 提交“商品描述不符”，`/report` 显示“待处理”。
2. 管理员 `POST /admin/reports/11010/resolve` 返回 200。
3. 刷新 `/report` 显示“处理于 2026/10/26 15:24:41”“处理说明：已核实商品信息，卖家已修正描述。”“已处理”。
4. `/notifications` 出现“举报已处理 / 处理说明：已核实商品信息，卖家已修正描述。”。
5. 核验后删除该举报与通知，保留管理员审计记录。

## 通知页交互回归

- 顶部改为 `role="tablist"` + 5 个 `button role="tab"`，无输入框与 `contenteditable`。
- 选中项背景 `#eaf1ff`、字重 700、3px 下划线；`caret-color: transparent`、`user-select: none`；`:focus-visible` 2px 描边。
- 消息行整行可点击，按钮 `stopPropagation`；`m2-notification-sync.spec.ts` 断言按钮点击只产生一次已读请求，未读数从 1 变 0。
- 真实浏览器检查：5 个 tab、默认“全部”、点击“消息”过滤为 1 行、`ArrowRight` 切到“报价”、整行点击跳转 `/chat/4008`、hover 背景变化。

## 命令与结果

```bash
cd frontend
npm run lint
npm run build
npm run test:m4
npm run test:transaction
CAMPUSLOOP_UI_URL=http://localhost:5173 npx playwright test tests/live/journey.spec.ts tests/live/interface-restoration.spec.ts
CAMPUSLOOP_UI_URL=http://localhost:5173 npx playwright test tests/live/m2-phase4.spec.ts tests/live/m2-notification-sync.spec.ts
```

- lint 通过；build 成功（5.56 秒）。
- `test:m4` 19 项通过；`test:transaction` 8 项通过。
- 浏览器：journey 6 + interface-restoration 10 + m2-phase4 6 + m2-notification-sync 1，共 23 项通过。
- 注册限流为每 IP 10 次/小时，分批执行前清空 Redis `auth:*`；未修改鉴权策略。
- 价格基线用例最初失败是因为 `baseline` 容器未启动，启动后通过；与本任务无关。

原始日志（2026-10-26 重跑并落盘）：

- `verification-output/m4-test-m4.txt`（19 项治理断言）
- `verification-output/m4-transaction.txt`（8 项 Mock 状态层）
- `verification-output/m4-playwright-transaction.txt`（journey 6 项，真实后端）
- `verification-output/m4-playwright-interface.txt`（interface-restoration 10 项，真实后端）
- `verification-output/m4-playwright-governance.txt`（m2-phase4 6 项 + notification-sync 1 项，真实后端）
- `verification-output/m4-admin-drawer-tab-cycle.txt`（管理后台举报/商品抽屉键盘 2 项，契约夹具）
- `verification-output/m4-playwright-offline.txt`（无后端可复现子集 5 项）

2026-10-26 复验环境：独立审计容器 `campusloop-m4-audit-api`（端口 8018），
挂载当前工作区源码，使用独立数据库 `campusloop_m4_p5_audit`、Redis DB15 和独立 MinIO 容器
`campusloop-m4-audit-minio`（端口 19100）；前端 `http://127.0.0.1:5186`，
`VITE_API_BASE_URL=http://127.0.0.1:8018`、`VITE_WS_URL=ws://127.0.0.1:8018/ws`。
日常环境 `campusloop-local-db` 与网站 5174 未被启动、清空或改写。

复验结果：journey 6 项、interface-restoration 10 项、m2-phase4 6 项、notification-sync 1 项全部通过，
与上表 23 项口径一致；迁移 `0011` 在全新审计库上成功升级，种子幂等写入后方可登录管理员账号。
`m4-playwright-offline.txt` 保留为无后端时的最小可复现子集，不替代上述真实后端结论。

## 未覆盖与风险

- 断线为浏览器离线模拟，不等同多设备弱网。
- `CHAT_MESSAGE` 与 `USER` 举报目标暂不能从列表点击回跳，因为缺少按消息 id 或用户 id 的安全路由。
- 历史举报 `resolution_note` 为空，页面不显示处理说明；不回填内部审计内容。
- 举报闭环涉及 `governance.py`、`transactions.py`、`Report` 模型和迁移 `0011`，需 M5/M6 对签、M1 在汇总时确认迁移。

## 结论

FE5-06 范围内未发现重复消息、重复订单或重复评价；举报闭环已从“状态可见”补到“处理时间 + 处理说明 + 结果通知”。本次改动通过后端 21 个测试函数、前端 19 项治理断言、8 项 Mock 状态层和 23 项浏览器用例。
