# AI3-09 M8 服务契约验证

契约：`contracts/m8-phase3/service-contract.json`；实现：`services/m8_baseline/http_service.py` 与 `client.py`。

- 三个入口均带 `/v1/` 版本号，使用统一信封 `m8-baseline-rpc-v1`。
- 服务只允许监听 `127.0.0.1`，令牌至少 32 字符，请求体上限 1 MiB，连接读取超时 3 秒。
- 只接受 JSON，拒绝重复键、NaN/Infinity、未知字段、非法类型和错误版本。
- 日志只记录 operation/status/code/durationMs，不记录请求体、令牌、用户或设备标识。
- 客户端候选超时 500 ms；网络异常或 503/504 时分别降级为人工定价、事实计数/不可用、保存举报进入人工队列。
- 认证、格式和业务校验错误不通过降级放宽。
- 风险降级仍明确 `enforcementExecuted=false`。

以上是内部候选契约。M6 公共 DTO 映射、M9 压测阈值与生产并发/总截止时间尚未签字，不应视为生产 SLA。
