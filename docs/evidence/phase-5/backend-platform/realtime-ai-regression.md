# BP5-04：M6 实时通信与智能异常回归

日期：2026-10-23。基线：2eb166897fa1953b4514eef72b6d06baa869cf34。
结论：本地单元、ASGI 和真实回环 RPC 通过；持久化补拉、真实账号撤销及发布 E2E 尚未验收。

## WebSocket 与恢复流程

1. 连接 /ws，不在 URL 放令牌或其他查询参数。带 Origin 时必须命中配置允许列表。
2. 连接后 5 秒内发送首帧 {"type":"AUTH","accessToken":"替换为测试账号令牌"}，等待 AUTH_OK。
3. 实时通道从握手水位开始。连接成功后，以本地消息 ID，通过 HTTP GET /chat/sessions/{sessionId}/messages?afterId={id}&limit=100 补拉断线期间消息。
4. 按响应升序 ID 保存并去重；每批最后一条 ID 作为下一次 afterId，直到空数组。实时与补拉可能重叠，客户端按消息 ID 去重。
5. 再断线后重新鉴权并补拉。发送重试复用 clientMsgId。历史向前翻页用 beforeId，不能同时提供两个游标。
6. afterId >= 0，beforeId >= 1；非法值/双游标返回 422。非参与方读取会话返回 403。

服务在 PING、写入、消息读取及私密消息发出前重新校验令牌。拒绝可能发生在握手阶段；接收后鉴权失败关闭码 4401，禁用 4423，临时服务/数据库故障 1013，超大帧 1009。权限失效需要重新登录，不能无限重试旧令牌。本次只新增游标校验，没有重写 M5 策略。

## 智能异常防线

本次 P5 基线未包含此前 M6 P4 的适配器/事件加固，在 M6 范围补回并加入 P5 边界检查；未移植 M5 管理员治理接口。

| 场景 | 实现/预期 | 验证范围 |
| --- | --- | --- |
| RPC 超时/不可达/非法 JSON | 1.5 秒超时；M7 回退规则结果，M8 返回不可用及空价格区间 | 单元及真实回环 RPC 通过 |
| M7 虚构/重复 ID、旧版本、非法分数/解释 | 校验候选集、版本、有限分数和解释；异常降级 | 单元通过 |
| M8 无效区间、NaN、样本数或元数据错误 | 拒绝非法响应；sampleSize 非负整数，不接受布尔值 | 单元通过 |
| 相同业务版本重复事件 | 稳定业务版本指纹，金额标准化，按业务版本去重 | 单元通过，数据库重放待验收 |
| 旧消息晚到、对象下架/关闭/过期 | 再检查当前状态、输入版本、接收人资格 | 单元通过，持久化场景待验收 |
| STALE_INPUT 等持续重试 | 最多 5 次，之后 FAILED | 单元通过 |

智能结果不能替代双方交易确认或改变订单/商品事实；价格不可用由用户手动填写，不编造价格。

## 测试与证据

- backend/tests/test_ai_orchestration.py：27 个 P4 领域测试，含真实回环 RPC 超时/非法 JSON。
- backend/tests/test_p5_business_contract.py：WS Origin/首帧/撤销模拟、价格字段边界；认证函数用替身，不是实际账号服务验收。
- backend/tests/test_p5_integration.py：5 条离线消息、多页补拉、重复发送、越权；因数据库缺失跳过。
- backend/tests/test_matching_jobs.py、test_live_intelligence.py：重放、延迟过滤、真实 API 降级；数据库用例跳过。
- evidence/m6-backend.log、m6-backend-tests.xml：完整后端 82 passed / 37 skipped / 1 xfailed。
- evidence/m6-m7.log：31 个基线测试通过；evidence/m6-m8.log：17 个通过。

## 待验收

M9 提供 Postgres/Redis/对象存储；M6 与 M7/M8 确认降级字段；M10 在同一集成提交执行断线重连、账号撤销、多进程补拉与浏览器回归。HTTP 测试不等于已证明所有实时网络时序。责任及下一动作见 handoff.md。
