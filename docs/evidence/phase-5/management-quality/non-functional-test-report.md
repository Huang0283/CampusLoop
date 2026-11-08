# MQ5-05 非功能验收报告

2026-10-25，执行人用户委托 Codex，源码 `50108a3`。Windows 11 AMD64/Docker Desktop，本地浏览器与服务同机，其他测试可能并行占用资源。软件/容器/日志轮转配置见 `evidence/20261025/environment.json`。没有生产硬件容量或外网 SLA 结论。

## 性能与并发

北京时间 13:02 附近，各端点并发 10、100 请求；命令 `python backend/scripts/api_bench.py --url http://127.0.0.1:8025/health --requests 100 --concurrency 10`，商品将 URL 改为 `http://127.0.0.1:8025/products?page=1&pageSize=12`。阈值 p95 ≤2000ms、无请求失败。

- health：100/100 HTTP 200，p50=20.1ms、p95=177.0ms、p99=190.1ms，264.4 请求/秒。
- products：100/100 HTTP 200，p50=59.1ms、p95=164.9ms、p99=186.0ms，140.7 请求/秒。
- 原始结果 bench-health/bench-products.txt/json；执行时为小型合成审计数据。恢复前快照 users=121、products=39、orders=18、order_events=60、chat_messages=24；这是相邻快照，不伪称每个请求瞬间计数不变。Worker 的匹配任务记录持续变化。
- 并发写入/幂等、角色与状态竞争由完整后端测试验证；上述性能测试是只读轻负载，不代表生产峰值、长时间稳定性或写入吞吐。

## 安全、权限和依赖

后端 browser_sessions、auth、realtime_media、governance_api、product_governance 和事务测试覆盖 HttpOnly/CSRF、匿名/普通用户/管理员、非参与者、资源归属、私密媒体与 WebSocket 边界。浏览器回归覆盖游客公开浏览及受保护动作。私密媒体匿名拒绝、公开商品图访问均有测试依据。RPC 故障 18 个探针通过。

官方 npm audit 0 漏洞，仅代表执行时 npm 已知公告；不是 Python 全量 CVE 审计或渗透测试。依赖元数据见 M1 licenses 清单，许可审批待团队确认。真实环境密钥、数据库 dump、运行账号和媒体字节不提交。

## 真实数据库恢复

本组 `scripts/quality_phase5/recovery_drill.py` 只允许 Compose 项目 `campusloop-mq5-audit`。暂停审计 Worker，pg_dump 后恢复到随机新库，比较 26 表计数、全部内容哈希、迁移版本 0010、约束和索引。运行总计6.252 秒，恢复及比较段 2.719 秒；不是完整业务 RTO。结果 recovery-tool-final.txt/json，restore-before/after.json 与 canonical-constraints.json。

原 M9 校验器对 schema 文本严格哈希，PostgreSQL 恢复重写等价的 varchar[]→text[] 表达式导致误报。本组仅规范化此已知等价表达式；不改 M9 生产代码、不跳过所有约束。实际从恢复库删除 ck_users_role_enum 后能检测不一致。故意破坏的备份被 pg_restore --list 拒绝；源库快照未变。工具测试含等价、真正枚举变化和无关表达式不变的负例。

恢复不包含 MinIO 对象字节、配置外部密钥或外部模型资产；不能称完整系统灾难恢复。首次 strict schema mismatch 保留 recovery-audit 失败记录；最终质量侧补偿见 recovery-tool-final，不混淆失败和成功。媒体完整灾备仍由 M9/M1 确认范围。

## 结论

约定小规模性能阈值、执行过的权限场景和数据库恢复通过。Redis/MinIO 全进程故障、长时间压测、完整媒体恢复、无障碍认证未在本轮全面执行；未执行即不声称已通过。最终质量签收受发布看板剩余条件约束。
