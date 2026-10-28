# BP5-05：M6 API 候选冻结与复验

2026-10-25，M10。唯一手写契约 `openapi/campusloop.v1.yaml`，`info.version = 0.5.0-rc.1`；FastAPI 与合成示例同版。以修复 PR 最终 HEAD 为准，不代表全组最终发布标签。

## 本次修正

- 接入 main 已有治理/风险/信任契约和运行时，保留全部原界面所用字段，不删除接口来凑一致。
- 删除 `test_group_release_requires_m5_documented_routes` 过期 xfail。合并基线后曾出现严格 XPASS，证明此前缺口已解决，不能继续保留“预期失败”。
- `test_m6_documented_operations_exist_in_current_runtime` 检查全部契约路由和 operationId，取消跳过两个管理员接口的例外。
- 幂等键非空白、1–64 字符，UUID 推荐但不强制；消息 beforeId/afterId 互斥，补拉升序。
- 见面时间是校内本地时间 HH:MM 或 HH:MM:SS（可带小数秒），不带时区偏移；必须满足未来安排规则。
- PriceAdvice 支持 LOW_CONFIDENCE；不可用区间是 null。按冻结规则服务和版本校验，不擅自接纳未知正式模型。
- 从合并后的完整规范重新生成 `frontend/src/sdk/generated/`，保留 main 新增的治理类型；不得手改生成文件。重生成后与暂存源码快照无内容漂移，最终提交后再检查 diff。

## 地址与错误处理

日常网站按 `scripts/start-local.ps1` 启动：前端 `http://127.0.0.1:5174`，API `http://127.0.0.1:8001`；直接运行 serve.py 默认 8000。本次专用审计服务仅在独立 Docker 网络互通，没有占用日常 API 端口。

HTTP 使用 Authorization: Bearer 测试令牌，幂等写入另带 Idempotency-Key；成功读取 data，错误读取顶层 code/message/details/requestId；204 不解析 JSON。

- 400 INVALID_JSON：修正 JSON。
- 401：重新登录/刷新，禁止无限重放失效令牌。403：检查角色和对象关系；404：停止访问不存在或不可见资源；423：账号不可用。
- 409 IDEMPOTENCY_CONFLICT：同键不同体，确认新意图后换键。状态/见面版本冲突：重新拉取当前事实，不能自动覆盖。评价重复/未完成：展示既有评价或资格提示。
- 422 VALIDATION_ERROR：修正输入、游标、键或时间。429：按响应退避。503：有限重试，保留原键/clientMsgId 和草稿。
- 智能降级通常在成功响应标记 degraded/原因；空价格不是零元，也不代表自动确认交易。

## 示例与验证

`examples/m6-api-examples.json` 使用合成数据。资源 ID、图片 URL 必须替换为真实测试资源；见面日期由测试动态设为两天后。
`test_p5_api_examples.py` 验证版本、全部路由、9 个枚举、JSON Schema/Pydantic 示例和边界；这些静态检查不冒充 HTTP 写入。真实可执行样例由 `test_p5_integration.py` 和 `test_transaction_api.py` 创建账号/商品/会话/报价/订单/见面/评价并断言接口结果。

复验：专用服务迁移后运行 `python scripts/m6_phase5/verify.py --require-integration`；frontend 执行 `npm ci`、`npm run sdk:check`、`git diff --exit-code -- src/sdk/generated/`、lint/build。详情和原始结果见 verification.md。正式冻结还需 M2/M3/M4、M7/M8 在统一 P5 集成提交确认消费兼容，由 M1/M9 登记镜像/迁移头/标签。
