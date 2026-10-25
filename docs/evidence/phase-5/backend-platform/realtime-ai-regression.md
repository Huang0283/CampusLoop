# BP5-04：M6 实时恢复与智能异常验收

2026-10-25，M10。版本与环境见 verification.md；原 PR #121，修复分支 `fix/m6-p5-acceptance`。

## 本次补全

- 原 P5 只有 HTTP 多页补拉测试，不能独立证明真实 WebSocket 断开重连。新增 `test_real_websocket_reconnect_overlaps_durable_history_without_duplicate_writes`：首次 AUTH_OK 后断开、产生三条离线消息、重连鉴权、收到新增实时消息，再通过每页两条 HTTP 补拉追平。每次发送重复同一个 clientMsgId，数据库最终只有四条；HTTP/实时允许重叠，消费者按消息 ID 去重。
- 新增 `test_intelligent_timeout_and_invalid_price_do_not_change_trade_facts`：真实测试账号和订单上注入 M7 超时及 M8 非法响应，搜索降级、价格空区间不可用；订单仍 PENDING_CONFIRM、商品 RESERVED、双方完成位及订单事件不变。
- 接入 main 的智能输入/元数据/价格上限校验和匹配任务监控，保留 M6 的缺失 relevanceScore 拒绝。没有削弱 main 已验收的安全边界。

## 既有回归依据

- `test_realtime_media.py`：真实账号首帧鉴权、双方消息、越权、非法令牌、logout 后连接关闭；私聊/证据按权限访问。拒绝 URL 令牌、非法 Origin。
- `test_matching_jobs.py`：真实数据库事件重放去重、陈旧版本不发布且可重试、关闭/过期对象过滤、任务锁被另一 worker 跳过、失败最多重试五次。
- `test_ai_orchestration.py`：受控 RPC 超时/非法 JSON/伪造 ID/旧版本/非法分数或价格元数据降级。
- `test_p5_business_contract.py`：首帧非法、JSON 非法、模拟撤销和游标边界。替身测试不冒充真实账号验收。

## 调用方恢复流程

1. `/ws` 不带 URL 查询参数；Origin 必须符合配置。
2. 五秒内发送 `{"type":"AUTH","accessToken":"测试账号令牌"}`，等待 AUTH_OK。
3. 从本地最后消息 ID 调用 `GET /chat/sessions/{sessionId}/messages?afterId={id}&limit=100`，按升序逐页追平，直到空数组。
4. HTTP 和实时流按消息 ID 去重，发送重试保留 clientMsgId。历史向前翻页用 beforeId，禁止同时给两个游标。afterId >= 0，beforeId >= 1。
5. 失效身份重新登录；临时故障有限退避。连接关闭码：4401 身份失效、4423 账号禁用、1013 临时故障、1009 过大帧。

使用真实数据库、ASGI WebSocket 与受控故障注入，不冒称公网网络故障、多机或正式模型质量测试。最终前端重连体验与发布环境仍在统一候选提交联调。
