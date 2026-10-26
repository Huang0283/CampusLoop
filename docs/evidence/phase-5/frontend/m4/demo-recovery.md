# M4 双账号失败恢复手册（FE5-07）

## 用途

演示或验收时两个账号同时操作，出现网络、登录、并发或状态冲突后的恢复步骤。每一步都对应现有实现与浏览器断言，不需要改数据库。

## 1. 登录态失效

**现象**：任意受保护页面返回 401，页面跳到 `/login`。

**系统行为**：`Guard` 保存 `state.from`；登录成功后回到原路径与查询参数。

**恢复**：重新登录同一账号；确认回到原页面而不是首页。若浏览器仍显示旧身份，退出后重新登录。

**证据**：`journey.spec.ts:194` 的会话恢复用例；`common.tsx:96-102`。

## 2. 实时连接断开

**现象**：聊天顶部出现“实时连接恢复中，可通过 HTTP 发送与补拉消息。”

**系统行为**：消息仍可通过 HTTP 发送；重连后补拉缺失消息，按消息 id 去重，不重复显示。

**恢复**：保持页面打开，等待“实时连接已建立”；必要时手动刷新。不要重复点击发送，已发送消息会通过补拉出现。

**证据**：`journey.spec.ts:15` 的离线/恢复断言。

## 3. 消息发送失败

**现象**：气泡旁显示“发送失败”和“重试发送”。

**系统行为**：失败消息保留在本地待发送列表，使用同一 `clientMsgId` 重试，成功后只出现一条。

**恢复**：点击“重试发送”；若仍失败，检查网络或切换 HTTP 补拉后刷新。

**证据**：`journey.spec.ts:15`；`ChatPages.tsx` 的待发送列表。

## 4. 重复点击或重复提交

**现象**：按钮 loading 期间再次点击没有第二次写入。

**系统行为**：`useMutation` 的 `locked` 阻止重入；报价、订单、评价、举报等写请求带 `Idempotency-Key`，同一请求重放返回首次结果。

**恢复**：等待 loading 结束；若网络超时后不确定是否成功，刷新页面确认状态，不要更换参数重复提交。

**证据**：`m2-phase4.spec.ts` 的“uncertain resolution key”场景；`business.idempotent`。

## 5. 约定时间冲突或过期

**现象**：保存时提示“见面开始时间必须晚于当前时间（北京时间）”或“结束时间必须晚于开始时间。”；已过开始时间且未双方确认时出现改约警告。

**系统行为**：前端校验不发送写请求；服务端仍会拒绝非法时间与状态冲突。

**恢复**：把日期改到未来、结束时间晚于开始时间，重新保存；过期约定只能改约，不能确认旧版本。

**证据**：`journey.spec.ts:15`；`meetupTime.ts`；`test:m4` 约见 6 项。

## 6. 举报提交失败

**现象**：弹窗保留，显示校验提示或接口错误；重复举报返回 409 `REPORT_DUPLICATED`；举报自己返回 400 `SELF_REPORT_FORBIDDEN`。

**恢复**：

- 缺少原因：选择原因后重新提交。
- 重复举报：到 `/report` 查看已有记录，不重复提交。
- 举报自己：换成对方账号或被举报对象；这是预期拦截。
- 网络失败：保持弹窗，重新点击“提交举报”；同一表单会复用幂等键。

**证据**：`ReportButton.tsx`；`test_governance_api.py` 的自举报与重复用例。

## 7. 管理员处理冲突

**现象**：处理返回 409 `REPORT_ALREADY_HANDLED` 或 `REPORT_STALE`。

**系统行为**：另一个管理员已处理，或页面数据已过期；不会覆盖他人结论。

**恢复**：刷新举报队列，确认最新状态；如确需改判，使用显式覆盖并带上最新 `expectedStatus` 与 `expectedHandledAt`。

**证据**：`test_governance_api.py` 的并发处理与过期覆盖用例；`AdminPages.tsx` 的处理表单。

## 8. 私密证据读取失败

**现象**：管理后台证据区域显示错误和“重试”。

**恢复**：点击重试；确认当前账号是管理员、举报仍存在、对象存储可用。读取会写访问审计，不要反复刷新制造无用审计。

**证据**：`AdminPages.tsx` 的 `Evidence` 组件；`media.py` 的 `no-store` 响应。

## 9. 通知已读失败

**现象**：点击“标为已读”后未读数未变化，或提示错误。

**恢复**：点击“刷新”或等待 5 秒轮询；确认当前账号是通知接收人。通知按 `recipientId` 过滤，换账号不会看到他人通知。

**证据**：`m2-notification-sync.spec.ts`；`NotificationsPage` 的 `notifyNotificationsChanged()`。

## 10. 订单被对方推进

**现象**：保存约定或确认版本时返回 409 `ORDER_STATE_CONFLICT`。

**恢复**：刷新订单详情，按最新状态继续；不要用旧页面反复提交。完成交易需要双方各自确认“我已完成交易”。

**证据**：`test_transaction_api.py` 的状态机用例；`TransactionPages.tsx` 的 `mutable` 条件。

## 11. 测试数据清理

浏览器核验可能产生举报、通知和测试账号。清理顺序：

```sql
DELETE FROM notifications WHERE user_id = <uid> AND type = 'REPORT_RESULT';
DELETE FROM reports WHERE id = <report_id>;
```

保留管理员审计记录，不删除 `auth_audit`。测试账号如无外键引用可删除，否则保留并改名。

## 12. 环境恢复

- 前端未启动：`cd frontend && npm run dev -- --port 5173`。
- API 未启动：`docker compose up -d api db redis minio baseline worker`。
- 价格建议不可用：确认 `baseline` 容器 healthy，而不是改前端阈值。
- 注册返回 429：每 IP 10 次/小时，测试前清空 Redis `auth:*` 或等待窗口结束；不要修改鉴权配置。
- API 代码与数据库版本不一致：`docker compose build api && docker compose up -d api`，容器启动时会执行 `alembic upgrade head`。

## 边界

以上步骤用于恢复演示与验收，不改变业务结论。失败后仍无法恢复时，记录请求 id、账号、时间和页面路径，交由对应 Owner 处理；不要通过直接改数据库绕过状态机或权限校验。
