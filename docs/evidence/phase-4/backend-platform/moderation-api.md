# BP4-02：人工治理与敏感审计（M5）

实现提交：`c4687d5a44eb18d5a96af4bec03b85ec933da0be`。
所有下列后台接口要求有效 ADMIN；未登录 401，普通用户 403，禁用身份 423。
管理员角色通过受控测试数据库夹具准备；产品没有公开提权接口。

## 举报查询和处理

`GET /admin/reports` / `adminListReports` 返回信封中的数组，与已检查的 M2 页面兼容。
page 默认 1 且至少 1；pageSize 默认 20、范围 1–100；status 可选
PENDING/PROCESSING/RESOLVED/REJECTED。排序 created_at DESC、id DESC。
管理员 DTO 增加 handledBy/handledAt；evidence 返回受保护的相对路径
`/admin/reports/{id}/evidence/{index}`，不返回私有存储 key 或举报人身份。
读取图片仍需鉴权；私有桶禁止匿名下载，响应 no-store。
普通用户 `/reports/mine` 的最小 DTO 不新增 evidence 或 handledBy。

`POST /admin/reports/{reportId}/resolve` / `resolveReport`：

```json
{"resolution":"RESOLVED","note":"人工核对证据后的处理原因"}
```

resolution 仅 RESOLVED/REJECTED；note 必填、去首尾空白、1–1000 字符且非全空白。
只处理 PENDING/PROCESSING；已处理事项新写入返回 409 REPORT_ALREADY_HANDLED。
操作记录 handled_by/handled_at，不直接禁用用户、下架商品或改变订单。

`POST /admin/reports/{reportId}/override` / `overrideReport`：

```json
{"resolution":"REJECTED","note":"人工复核后修正","expectedStatus":"RESOLVED","expectedHandledAt":"2026-10-15T00:00:00+08:00"}
```

这是已处理举报的显式人工修正。expectedStatus 必须为终态，expectedHandledAt
必须为带时区 RFC 3339 字符串，并同时匹配上次读取的状态和处理时间。
不匹配返回 409 REPORT_STALE；无效时间或无时区返回 422。
即使两次处理使用相同状态，过期时间戳也不能覆盖新的复核结果。

两种 POST 都要求非空且不超过 64 字符的 `Idempotency-Key`。
相同管理员/事项/操作/键/归一化请求体重复请求返回历史响应；相同键不同体 409。
重放历史 resolve 不撤销后续 override；前端收到历史响应后应重新读取列表。
用户行锁串行化同一管理员的请求；举报行锁控制不同管理员竞争。
处理事实、AuthAudit 和幂等结果在同一数据库事务提交。

## 风险与审计

`GET /admin/users/{userId}/risk-clues` 继续消费 M8 当前真实事实规则，只提供人工线索。
enforcementExecuted 为 false；关闭/超时返回显式不可用，人工举报处理仍可使用。
风险结果不自动执行处罚；账户禁用仍需独立管理员调用和明确 reason。

每条成功的敏感读取/修改审计包含 AuthAudit 的 actor_id、created_at、request_id，
以及 context.reason/before/after。只读的 before/after 相等；写入包含真实状态差异。
队列/证据用 context.reportId 或返回事项索引标识对象；user target_id 保留用户外键语义。
证据审计不保存图片内容或存储 key。

| 事件 | 原因与快照 |
|---|---|
| admin_trust_read | 默认 manual_review 或传入 reason；信誉状态/分数 |
| admin_risk_clues_read | 默认 manual_review 或传入 reason；状态、禁止自动处罚、事实窗口 |
| admin_reports_read | 默认 report_queue_review 或传入 reason；分页参数及事项状态快照 |
| admin_report_evidence_read | 默认 report_evidence_review 或传入 reason；事项、图片索引、状态 |
| admin_report_resolve / admin_report_override | 必填 note；处理前后状态、操作人、时间；enforcementExecuted=false |
| admin_report_replay | 原请求 note；历史响应快照，标记 idempotent_response_replay |
| admin_users_read | 固定 account_administration；返回用户角色/状态和分页 |
| admin_user_active / admin_user_disabled / admin_user_status_unchanged | 显式账户 reason；状态前后值，包含无变更操作 |

支持 reason 的 GET 参数最长 500、不可全空白；默认操作用途保证既有客户端兼容。
审计落库失败时不返回敏感内容；举报写入也回滚。失败鉴权沿用现有统一错误机制。
现有读取审计测试已更新为检查新增完整上下文，而不是旧的两字段完全相等。

真实数据库测试确认：竞争管理员仅一条决策提交；同管理员重复请求两次相同 200；
陈旧写入 409；注入审计 flush 失败返回 503 且处理与幂等记录都未提交。
故障注入只针对审计写入，其余数据库/存储/RPC 依赖均真实运行。
