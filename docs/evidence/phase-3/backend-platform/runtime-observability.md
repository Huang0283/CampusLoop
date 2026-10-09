# BP3-10 运行与可追踪性

Docker API 打包 backend + services/scripts/schemas/contracts/data，M7/M8 仅监听容器回环端口，外部只访问业务 API。MinIO 公共桶只读商品图，私有桶明确 anonymous none。请求使用校验后的 X-Request-ID 或安全生成 ID，响应/错误/审计关联同 ID；结构化日志仅 method/路由模板/status/duration，不记录 query、body、认证头或私有内容。

Redis 用于认证限流，不保存订单/消息事实；WS 增量通过 PostgreSQL，无 Redis 推送依赖。RPC 有版本/凭据/超时/禁止代理、关闭服务明确关键词降级或价格不可用，基础交易持续运行。上传对象写库失败会尝试清理并回滚；清理失败不掩盖原错误。

init_local.py 安全生成本地秘密，不打印、不覆盖已有非空值、不提交 .env。reset_test_limiter.py 只允许 APP_ENV=test/ci 且 Redis 14/15，禁止作用于正式 DB0/演示 DB13。

