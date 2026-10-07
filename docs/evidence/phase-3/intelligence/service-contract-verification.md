# AI3-09 M7 服务入口验证

私有 loopback RPC m7-baseline-rpc-v1：POST /v1/rank 与 /v1/page，JSON schema 位于 schemas/m7-phase3，processed 请求与商品校验沿用 Phase 2。字段不等同公共 API；不会改 SDK 或直接返回伪造商品 DTO。错误是 {schemaVersion,error:{code}}；成功 data 含内部 ID/版本、分数、原因、元数据和分页扫描信息。

输入身份和商品事实必须由已授权可信后端提供。服务凭据≥32字符、只监听 127.0.0.1；浏览器不得持有凭据。请求体 8 MiB、最多 5000 商品、页面 1—100；拒绝未知字段、重复 JSON 键、NaN/Infinity、非法时间/金额/枚举/快照。当前候选错误码 UNAUTHORIZED、SNAPSHOT_EXPIRED/INVALID_SNAPSHOT 与 Phase 2 公共错误 UNAUTHENTICATED/SNAPSHOT_STALE 不相同，M6 需在确认后显式映射，不能宣称公共契约已接入。

服务日志仅 operation/status/code/durationMs，不记录完整查询、viewerId、商品描述、密码或令牌。连接读取超时 3 秒；调用适配器支持网络 deadline、503/504、连接拒绝/断开回退到相同硬约束下本地基线。鉴权、输入和过期错误不触发回退。已配置模型执行/超时路径尚无实现，仅验证 MODEL_DISABLED 的明确规则回退；没有实测总执行截止或生产压测。

service-process-smoke.json 是实际子进程启动、真实 HTTP 请求和关闭后的运行记录，共六类场景：缺凭据 401、正常合成搜索/模型关闭回退、两页持久快照、未知字段 422、客户端 401 不回退、关闭服务后本地过滤回退。凭据在内存随机生成，不写证据；日志脱敏检查通过。单元集中的 RPC/SQLite 场景也使用真实网络与数据库。

这些证据没有替代 M3/M5/M6 的项目调用、真实身份/库存权限、通知消费或基础交易关闭智能服务后的演示；AI3-09 仍为 M7 部分交付。M8 能力没有接入该服务。
