# Phase 5 后端交付清单：M6 部分

2026-10-25，M10 复验更新；原任务 PR #121、修复分支 `fix/m6-p5-acceptance`。候选契约 `0.5.0-rc.1`，版本详情见 handoff.md。

- BP5-03：business-invariant-report.md；auth.py 并发锁、business.py 幂等键、transactions.py 游标；test_auth_locking.py、test_p5_business_contract.py、test_p5_integration.py 及原交易测试。
- BP5-04：realtime-ai-regression.md；保留 main 智能/匹配/监控和 M6 缺失分数字段校验；真实 WS 重连补拉与智能异常事实不变测试，原智能/队列/媒体测试。
- BP5-05：final-api-documentation.md；完整 OpenAPI/自动生成 SDK、examples/m6-api-examples.json、全部路由/枚举/样例测试。管理员路由不再跳过，不再 xfail。
- 复验工具：scripts/m6_phase5/verify.py，严格模式拒绝 skip/xfail；最新日志/JUnit/检查摘要位于 evidence/，详细结果见 verification.md。
- BP5-10 的 M6 部分：verification.md、release-verification.md、handoff.md。发布签收和其他成员范围不由本清单替代。

源码和测试保留所属目录。M5/M9 的完整交付、统一阶段镜像/标签、跨组验收需由最终 P5 集成提交补齐，不据此关闭全组 Issue。
