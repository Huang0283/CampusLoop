# MQ4-04 智能降级检查

2026-10-22 最新复验绑定 `phase4/integration` 提交 `018ba69ea73987f2a6febc716b634416d4049727`：18/18 RPC 探针通过，DEF-P4-01/02 的坏结构/JSON 场景均安全降级。最新原始结果为 `m10-2026-10-22/rpc-fault-observations.json`。关闭智能与 Worker 的真实双账号浏览器旅程 1/1 是 `87750c1` 审计记录；本地本轮未重跑数据库/浏览器旅程，勿将历史结果说成最新 tip 现场复验。历史 13 PASS/5 FAIL 仍保存在 `rpc-fault-observations-2026-10-12.json`，不改写。技术检查不改变语义/回归模型 NO_GO，也不代表正式冻结、汇报或签字已完成。

2026-10-12；当前业务源 main 829ffbfc7f5c310917b2ff7c9627fe98b117824a，Linux Python3.12.15。状态：诊断执行完成，冻结验收失败，不能关闭本任务验收。

## 正常、关闭、超时和旧结果
backend/tests/test_live_intelligence.py 使用真实 loopback M7/M8、真实 PostgreSQL：搜索、匹配、价格、信誉、管理员风险正常可用；关闭智能后关键词与商品读取可用，价格明确不可用，不伪造区间，新用户信誉中性、风险不自动处罚。
独立 HTTP 故障探针 probe_rpc_degradation.py 对真实适配器注入延迟/关闭端口/无效JSON/缺字段；合计18观察，13 PASS、5 FAIL，原始结果 rpc-fault-observations.json。M7 超时与关闭返回受约束关键词基线，M8 三能力均返回明确不可用和手动下一步。旧输入超过60秒返回 STALE_INPUT，不冒充当前结果。
test_matching_jobs.py 五项真实数据库回归通过：重复事件/通知去重、事务回滚、旧 revision 不落库并重试恢复、SKIP LOCKED、异常重试有上限。旧结果场景是模拟并发事实变化的真实持久化校验，不是表面UI截图。
额外以 BASELINE_SERVICES_ENABLED=false 运行交易6项+媒体实时2项，8/8通过，证明该配置下主流程不是模型硬依赖。它不是所有最新 Phase4候选部署的联合验收。

## 未通过：P1 阻塞冻结
DEF-P4-01：M7 适配器收到正确 envelope 但 data={} 时直接返回坏结构，not-json 抛 JSONDecodeError，未退回关键词。对应探针 bad-shape/bad-json 两项 FAIL，可能使搜索/匹配业务异常。Owner M7（响应校验），M6（业务保护复核），10-14前修复，M10 10-15复验；复验必须返回带 INVALID_SERVICE_RESPONSE 的安全基线且硬约束仍有效。
DEF-P4-02：M8 价格/信誉/风险收到正确 envelope、空 data={} 均直接返回；价格下游依赖 intervalFen，不能安全使用空结果。三项 FAIL。Owner M8（逐任务响应验证），M5/M6（读取/编排复核），10-14前修复，M10 10-15复验；预期明确 UNAVAILABLE/degraded、不自动处罚、不泄露内部依据。
本次任务范围是 MQ/M2；未擅改 M7/M8 所有权文件以免和在做的 PR 冲突，也未把发现缺陷标记关闭。修复以 Owner 的独立 PR 交付，当前维持不允许最终冻结。

## 复现与保护
```text
python scripts/quality_phase4/probe_rpc_degradation.py --output <sanitized-observations.json>
```
脚本只用合成RPC输入和临时loopback服务，不改业务库；存在失败时退出2。Docker会包装非零退出，不能因为工具输出退出1就把真实5失败隐藏。镜像没有git可执行文件，输出 codeCommit=UNAVAILABLE，但两适配器SHA完整保留，报告的main提交已核对相同源码。
修复后重新跑探针且保留历史失败文件；不能只更新JSON把FAIL改PASS。档案CI检查证据完整性，不代表实时降级门禁通过。
