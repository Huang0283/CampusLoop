# BP5-02 举报、风险与证据安全回归报告

Owner：M5 胡可铭。任务来源：[Issue #35](https://github.com/Huang0283/CampusLoop/issues/35)。

| 项目 | 值 |
|---|---|
| 个人分支 | `task/m5-p5-security` |
| 目标分支 | `phase5/backend-release` |
| Phase 5 基线 | `ccba7ba39b85de72be7138f9bc0b6eabb50dd030` |
| M5 实现提交 | `59108202148004fb501910e17c8936b38be77b49` |
| 证据摘要 | [`evidence/m5-security-results.json`](evidence/m5-security-results.json) |
| 测试清单 | [`evidence/m5-p5-focused-tests.xml`](evidence/m5-p5-focused-tests.xml) |

## 访问边界

| 资源/动作 | 游客 | 普通用户 | ADMIN |
|---|---:|---:|---:|
| `/admin/reports` 举报队列 | 401 | 403 | 200，读取审计 |
| `/admin/reports/{id}/evidence/{index}` | 401 | 403 | 200，`no-store`，读取审计 |
| `/admin/users/{id}/risk-clues` | 401 | 403 | 200，人工读取审计 |
| `/admin/reports/{id}/resolve`、`override` | 401 | 403 | 200/409，写入审计 |
| `/reports/mine` | 401 | 只返回本人举报 | 不扩大为原始存储证据 |

管理员证据响应使用相对的受保护 URI，不返回 MinIO 原始 key、匿名可读地址或
举报人身份字段。未通过管理员鉴权的请求会在对象存储读取前被拒绝；获准读取后，
系统写入默认或调用方指定的审核原因及读取快照。

## 审计与一致性

- 举报队列、信誉、风险和证据读取记录 `reason`、`before`、`after`、请求 ID、操作者和
  服务端时间；证据内容和原始存储 key 不写入审计上下文。
- 正常处理使用管理员身份锁、幂等键和数据库事务；同一举报的并发处理只有一个普通
  决策提交，重复请求重放原结果，换请求体返回 `409 IDEMPOTENCY_CONFLICT`。
- 人工覆盖同时比较 `expectedStatus` 和带时区的 `expectedHandledAt`；旧快照返回
  `409 REPORT_STALE`，不会覆盖后来的人工决定。
- 审计写入失败时，处理结果和幂等记录一起回滚；不会留下无审计的终态。
- 风险服务关闭或超时只返回不可用状态，`enforcementExecuted` 为 false，不会禁用账号、
  改订单事实或把模型输出当成处罚决定。

## 实际验证

完整后端套件在专用环境中 **177 passed，0 failed，0 errors，0 skipped**。与本报告
直接相关的用例包括：

```text
tests/test_governance_api.py
  test_report_queue_private_evidence_and_sensitive_read_audits
  test_resolution_idempotency_and_explicit_override_reject_stale_input
  test_competing_administrators_only_one_normal_decision_commits
  test_duplicate_concurrent_request_and_stale_same_status_override
  test_audit_failure_rolls_back_decision_and_idempotency_together
  test_risk_manual_only_and_model_off_still_allows_moderation
  test_real_http_timeout_degrades_without_changing_business_facts
tests/test_realtime_media.py
  test_private_chat_and_evidence_access_audited
tests/test_m5_phase5_security.py
  test_admin_moderation_requires_role_and_authenticated_evidence_context
```

新增安全回归还检查了 HTTP 日志中不存在证据 URI、邮箱、密码和访问/刷新令牌。结果
摘要保存在 [`evidence/m5-security-results.json`](evidence/m5-security-results.json)。

## 已知边界与接收动作

本报告验证合成数据和本地隔离服务，不包含真实用户内容、生产密钥或正式灾备对象。
M6/M9 应在 `phase5/backend-release` 合并后复核业务契约和部署配置；M10 从
`phase5/integration` 独立执行权限、降级和 MVP 回归；M1 接收最终提交、版本和遗留清单。
这些动作完成前，本报告不代表整个后端组或 Phase 5 已签收。
