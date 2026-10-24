# BP5-05：API 候选冻结与最终验收说明

日期：2026-10-23；M6；基线 2eb166897fa1953b4514eef72b6d06baa869cf34。
文件名遵循必交清单；当前是候选版本，不代表全组最终 API 已签收。

## 契约与版本

- 唯一规范：openapi/campusloop.v1.yaml，info.version = 0.5.0-rc.1，FastAPI 与示例版本一致。
- 生成目录：frontend/src/sdk/generated/，不可手工修改。本轮实质变化为 sdk.gen.ts、types.gen.ts。
- 基线规范 61 个操作；结构检查 9 个枚举和 16 个现有示例通过，新增示例另有测试。
- GET /admin/reports 和 POST /admin/reports/{reportId}/resolve 在本基线运行时缺失，等待 M5 合并；未删接口冒充一致。

## 契约修正

1. Idempotency-Key：非空白、1～64 字符，推荐 UUID，但与运行时一致不强制 UUID。
2. listMessages：beforeId/afterId 互斥；补拉按 ID 升序，空数组表示本轮追平。
3. PriceAdvice.status 包含既有实现 LOW_CONFIDENCE；不可用价格 lower/upper 为 null。
4. 见面时间为本地 HH:MM 或 HH:MM:SS，可带小数秒，不带 Z/时区偏移；日期/时间必须满足未来安排规则。

## HTTP 与故障处理

直接运行 backend/scripts/serve.py 默认 API http://localhost:8000；现有 Compose 映射为 http://localhost:8001；最终以 M9 配置为准。
HTTP 使用 Authorization: Bearer <测试令牌>，需要幂等的写操作另带 Idempotency-Key。成功通常读取 data；错误读取顶层 code/message/details/requestId（不是 error.code）；204 不解析 JSON。

| HTTP | 业务含义 | 调用方动作 |
| --- | --- | --- |
| 400 | INVALID_JSON | 修正 JSON 格式后重新提交 |
| 401 | 身份验证失败 | 刷新或登录，不无限重放旧令牌 |
| 403 | FORBIDDEN | 检查角色及参与关系 |
| 404 | NOT_FOUND | 停止操作不存在/不可访问资源 |
| 409 | IDEMPOTENCY_CONFLICT | 同键不同体；确认新意图后换键 |
| 409 | PRODUCT_STATE_CONFLICT / OFFER_STATE_CONFLICT / ORDER_STATE_CONFLICT | 拉取最新状态，不能自动覆盖 |
| 409 | MEETUP_VERSION_CONFLICT | 拉取安排，让双方确认当前版本 |
| 409 | REVIEW_DUPLICATED / REVIEW_NOT_ELIGIBLE | 展示已有评价或未完成提示 |
| 422 | VALIDATION_ERROR | 修正键、游标、参数、时间 |
| 423 | 账号不可用 | 停止私密操作，联系账号负责人 |
| 429 | RATE_LIMITED | 按响应退避 |
| 503 | 基础服务不可用 | 有上限退避，保留原键/clientMsgId |

响应丢失时同一业务动作复用同键同体；变更请求体是新意图。消息重试使用原 clientMsgId。智能降级通常在成功响应提供 degraded 和原因，空价格不能当作 0 元或成交确认。
状态机见 business-invariant-report.md，WS 与补拉见 realtime-ai-regression.md。

## 可执行示例

examples/m6-api-examples.json 为合成示例。productId/orderId 等必须替换成测试账号可访问的真实测试资源；见面日期由测试动态设为两天后。
在 backend 目录，用已安装后端依赖的 Python 执行：

    python -m pytest tests/test_p5_api_examples.py -v -rxX

此命令验证规范与 Pydantic、版本及枚举，不伪装成真实 HTTP 写入。真实 HTTP 流程由 test_p5_integration.py 和既有交易测试执行，需要专用服务及迁移。最终服务必须重新执行样例。
缺失 M5 路由使用 strict=True 的 xfail 跟踪；M5 合并后将产生严格 XPASS，M6 确认接口正确后删除该标记并重跑。不能忽略测试或保留 xfail 来最终验收。

## SDK 无漂移验证

在包含本次 SDK 改动的干净检出中，从 frontend 执行：

    npm ci
    npm run sdk:check
    git diff --exit-code -- src/sdk/generated/
    npm run lint
    npm run build
    npm run test:transaction

本地先以暂存区作为候选提交快照检查，再由 PR 既有 CI 对提交检查。evidence/m6-sdk-drift.log 保存具体结果。两次生成字节一致；8 个 Mock 场景通过不等于真实浏览器 E2E。

## 最终冻结

合并顺序 M5 -> M6 -> M9。M6 合并 M5 已验收的组分支变化，核对路由/枚举，按团队决定更新版本，重生成 SDK 并提交；M2/M3/M4、M7/M8 确认消费兼容。M10 在统一提交验收。最终标签/镜像/迁移头由 M1/M9 记录，本报告未代签。
