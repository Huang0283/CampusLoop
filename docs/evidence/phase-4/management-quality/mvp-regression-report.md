# MQ4-05 MVP、权限与人工后台回归

2026-10-20 复验：四组与 M9 代码集成后，`87750c1` 的后端 118 项、浏览器 24 项真实旅程及明确夹具通过；举报与商品真实治理缺口已补。最新命令、范围与人工待确认事项见 [集成复验](phase1-4-closure-audit.md)。下文为 10-12 的旧环境与当时结果，不是当前缺陷状态。

2026-10-12；后端 main829ffbfc7f5c310917b2ff7c9627fe98b117824a（测试镜像campusloop-phase3:local的后端源码74d8c0c与当前后端一致），M2代码8803e639302324e13183af336431dbbb550aea2f/PR94。
Linux Python3.12.15、PostgreSQL phase3_verify、Redis14、真实 MinIO。停止同库 API/worker 再跑测试，结束恢复；不动演示库/Redis13/OceanScope服务。

## 已完成真实验证
后端 ruff format/check通过，pytest37/37通过，无skip，47.20秒。认证6、浏览器安全会话4、health5、输入/日志3、智能2、匹配jobs5、query budget1、私密媒体/实时2、seed3、交易6。覆盖 Refresh撤销/CSRF/身份边界、业务状态/双方确认、幂等、关联对象有效性、私图鉴权与审核可见性。
模型关闭额外交易/实时8/8通过，3.46秒；不绕过订单事实或改数据库制造完成。
M2浏览器已有journey5项、新增6项通过，详见 PR94 frontend/integration-regression.md。真实管理员用户分页、风险读取、禁用/恢复与另一浏览器会话撤销，普通用户admin403；fixture举报不算真实治理验收。已有私密举报证据API测试和数据库审计已验证。
本轮审计只读聚合为 admin_report_evidence_read12、admin_risk_clues_read12、admin_user_active17、admin_user_disabled17、admin_users_read9；来自隔离测试库累计数据，不伪称这都是单次新增，也不提交账号/令牌/证据原图。

## 不能验收完成
真实举报后台队列与resolve尚未实现，商品治理契约缺失。依赖M5/M6交付后M2接入；MQ4-05人工管理完整标准部分阻塞。风险显示不自动处罚，但坏模型返回仍存在P1，见降级报告。
M3/M4 Phase4新增结果/通知还没在一个组集成提交验收，不能把旧MVP37测试等价于整个第四阶段完成；跨组后必须再次运行全部回归，记录新提交。

## 复验命令
后台测试在专用test/ci库且与浏览器串行：
```text
ruff format --check .
ruff check .
python -m pytest -v
BASELINE_SERVICES_ENABLED=false python -m pytest tests/test_transaction_api.py tests/test_realtime_media.py -v
```
PowerShell环境变量按运行环境设置，不能在生产执行清库/禁用测试。前端 npm run sdk:check/lint/build 和 Playwright 命令见M2 verification.md。不截含私密信息的默认trace/video，数据库只读聚合只用于证实审计机制。
