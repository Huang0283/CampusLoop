# BP4-06：M6 超时、坏响应与不可用降级

业务适配器：`backend/app/services/ai_adapters.py`，单次 RPC timeout=1.5秒。
服务 URL、密钥、开关沿用运行配置，M6 不修改 M9 的 Compose/Worker/迁移。

| 故障 | 搜索/匹配 | 价格 |
|---|---|---|
| 服务关闭/密钥未配置 | 本地关键词/硬约束基线；SERVICE_DISABLED | UNAVAILABLE，空区间，手动定价 |
| 超时、断连、5xx | 本地关键词/硬约束基线；显式降级原因 | UNAVAILABLE，空区间，显式降级原因 |
| 非JSON、结构缺失、版本不符 | INVALID_SERVICE_RESPONSE，使用基线 | INVALID_SERVICE_RESPONSE，手动定价 |
| 重复/未知候选、商品旧版本、NaN分数、未确认规则解释 | 拒绝远端结果，使用基线 | 不适用 |
| 倒序/非法金额、坏 factors | 不适用 | 拒绝响应，返回不可用 |
| 非法业务输入、403等非重试错误 | 保留422/403等语义，不吞成成功 | 同左 |

先由冻结规则验证输入，服务不可用不能绕过预算/权限/字段校验。
RPC 之后再查询真实业务对象及版本，不直接返回模型内部ID。
错误不包含 provider 的原始异常消息、私有请求体或认证密钥。
价格不可用返回 lower=null、upper=null、method=unavailable，绝不以0元充当建议。
模型不能改变订单、商品价格、信誉处罚或账号状态。

## 与发布/交易隔离

发布只把 matching_jobs 写入 PostgreSQL 事务，RPC 在独立消费或只读咨询时执行；
远端模型失败不参与发布/订单提交。Worker停止会延迟通知，不会让基础发布接口等待模型。
数据库不可用不属于“模型降级”：数据库事实写入失败仍应失败，不能丢任务后伪装提交成功。

## 实际验证范围

`test_ai_orchestration.py` 用真实 loopback HTTP 服务模拟非JSON及接收后不响应，
验证 M7 本地基线保留、M8显式不可用及超时上界；另覆盖连接错误、坏结构、
重复ID、旧版本、非法分数与输入错误不能被隐藏。
`test_live_intelligence.py` 新增真实业务发布后的超时/到期场景，需真实 DB/Redis/MinIO；
本机跳过，不能声称完整交易 E2E 已验收。
