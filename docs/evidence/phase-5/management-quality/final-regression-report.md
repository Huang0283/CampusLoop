> 2026-10-27 当前状态：[统一候选复核](integration-review-20261027.md)。旧日期内容为历史记录；M2/M4/M5 的 PR 与个人材料已进入各组分支，当前技术测试与正式发布门禁请以本轮复核及 release-status.json 为准。

# MQ5-04 最终候选功能回归

日期 2026-10-25；执行人用户委托 Codex。测试源码固定 `50108a3a50ca18e0da3f4db709da3f8bea2ee24c`，审计 UI 5195 → API 8025 → 独立 PostgreSQL/Redis DB15/MinIO。批准界面、真实 SDK/会话均保留；写入不进入日常数据库。

## 本轮结果

- 后端完整 pytest：173 通过、38 warnings、38.46 秒；`evidence/20261025/backend-final.txt/json` 及 `backend-junit.xml`。覆盖认证/会话、权限和对象所有权、并发唯一订单、事务状态、幂等、见面时间、治理审计、媒体与 WebSocket、任务 Worker 和 AI 编排。
- 浏览器完整 Playwright：49/49，通过；运行器 216.409 秒。`browser-final.txt/json`；测试目录 `frontend/tests/live/`。包括原界面布局、游客浏览和动作登录、双账号完整交易、刷新持久化、实时消息、举报管理、M2/M3 第五阶段回归。
- M7 基线单测 38 通过、4.229 秒；M8 基线单测 31 通过、3.939 秒。`m7-final.txt/json`、`m8-final.txt/json`。这是服务/规则测试，不代表模型效果获批。
- RPC 故障探针 18 通过、0 失败，`rpc-faults.txt/json`、`rpc-fault-observations.json`。智能关闭后真实交易与价格不可用/关键词降级见 `final-rehearsal-report.md`。
- SDK 生成与漂移、lint、生产构建和官方 npm audit 均通过，原始命令分别在 sdk、sdk-drift、frontend-lint、frontend-build、dependency-audit JSON 中。
- M2 两次 GitHub CI 成功回执 `m2-ci-40163071407.json`、`m2-ci-40163073917.json`。它们证明 M2 分支，不能冒充联合审计 SHA 的 CI。联合源码另外在 `phase5/audit-candidate-20261025` 触发 CI `40165497200`，实际结论见 `candidate-ci-40165497200.json`；此回执在运行结束后才收录。

## 执行方式

所有命令、UTC 起止时间、退出码及 stdout 哈希见同名 JSON。后端使用同一镜像和完整只读源码 mount 的临时容器，环境文件 ignored；命令见 backend-final.json。运行浏览器前必须显式设置 `CAMPUSLOOP_UI_URL=http://127.0.0.1:5195` 及 `CAMPUSLOOP_TEST_API_CONTAINER=campusloop-mq5-audit-api-1`，然后在 frontend 执行 `npx playwright test`。环境标签、端口核对后再执行写入，禁止默认进入日常 5174。

保留初始失败：生产镜像缺测试资产、M7/M8 初次工作目录不正确、首次彩排漏审计 URL、停智能服务后误用在线价格断言。这些都有纠正后的对应记录；不能删掉失败来伪装首次成功。

## 验收结论

已执行的技术场景未发现未修复 P0/P1；这是有限测试结果，不是整个平台无缺陷保证。正式发布仍阻塞：候选未完成各组/main 汇总、最终源码 CI 和标签、M4/M5 材料、两项学习模型评估、课程视频与签收。需求部分完成项见 `final-requirements-traceability.md`。不关闭 Issue #37，不签署最终质量结论。
