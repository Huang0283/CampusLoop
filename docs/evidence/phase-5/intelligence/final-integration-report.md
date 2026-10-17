# AI5-09 最终集成验证报告（准备交付）

2026-10-17；作者执行提交 `45acf879bf41c18baae4f89584c9e1732f848c97`。结论：本地智能服务联合验证通过；发布环境端到端接收尚未执行。报告区分源码追踪、本机实际执行、CI 和原负责人发布验收。

## 当前真实路径与追踪键

业务商品/求购变更写入 `matching_jobs`，worker 执行 `rank_live`，在同一事务内写 `matching_results` 与去重通知，最终将 job 标为 DONE。不是新建虚构的全局 resultId：实际可关联键是 wantedId、productId、matching job id/event_key、notificationId、resultVersion 与 algorithmVersion。

| 位置 | 真实字段/源码 | 本次证据与边界 |
| --- | --- | --- |
| Worker/落库 | `backend/app/services/matching_jobs.py`；`matching_jobs.result_version`、`matching_results.result_version`、`matching_notifications.result_version` | 已有事务/去重/回滚/旧 revision/worker claim 测试；本地无 PostgreSQL，本次新发布执行待 M6/M9 |
| 通知 | `notifications.payload` 的 wantedId / productId / resultVersion；matching_notifications.notification_id | 只通知有效配对；同一 wanted/product 首次通知去重；关闭求购清理结果；重新计算后旧通知版本可合法不同，不能强求历史通知永远等于最新结果 |
| 匹配 API | `GET /wanted/{wantedId}/matches` items[].resultVersion；实际 GET 会用当前事实重新计算 | 相同事实/时间/算法下才比较版本；记录私有 metadata 的 asOf、字典和事实版本，业务变化造成的不同不是哈希错误 |
| 实际页面 | router 使用 `frontend/src/live/MarketPages.tsx` 的 MatchesPage；Network 中 items[].resultVersion，与展示商品、理由、规则相关度核对 | 页面不显示版本文本，需由 M3 保存 Network 中的脱敏结果与页面截图；旧 pages/wanted/MatchResultPage.tsx 不是当前路由，不能作为运行依据 |
| 价格 | PricePage 显示 resultVersion 与 degradationReason；M8 基线版本 m8-price-rule-v1 | 本地真实 RPC/停服务回退通过；发布页面接收待 M3/M6/M9 |
| 信誉/风险 | 当前事实规则、管理员权限、无自动处罚 | 本地回归通过；发布环境人工覆盖/权限接收待对应负责人 |

## 本次实跑

新安装基线环境完整 verify PASS；联合完整 verify PASS；M7 38 测试、M8 Phase2/3/4 分别 14/31/23 测试、M7 语义 33 测试通过。联合真实进程 12 场景、固定 M10 故障诊断由作者重放 18/18 通过；两个独立进程真实模型评估、向量/索引重复、三 split 重算及真实增量/删除检查通过。重复回归不累加成独立测试总数。

原始证据见 [verification](verification.md) 和 [joint-v1](evidence/joint-v1/FILES.sha256.json)。本次没有操作正式发布数据库，也没有将本地 SQLite 当成业务 PostgreSQL。

## 发布接收步骤

1. M1 给出已验收 Phase4 freeze commit/tag 并建立 phase5/integration；M7 按任务书迁入个人/小组分支，M8 交叉评审，M10 核对实际阶段提交。当前准备分支不可替代正式分支。
2. M9 从该提交全新部署，保存源码 SHA、镜像 digest、环境锁、schema/migration 版本、服务健康与启动记录。凭据通过环境管理传递，不入证据。
3. M6/M3 用发布环境的两个测试账号，通过真实页面/API 发布商品和求购；记录 wantedId/productId/job id/notificationId/resultVersion。以只读查询验证任务/结果/通知落库，保存脱敏 API/Network 和页面截图，不通过直接改数据库制造业务成功。
4. 固定事实下将 worker/DB 的版本与 API Network 关联；若有事实更新，记录前后 revision，重新触发再核对。重放同一事件和刷新页面，不增加重复通知；另账号访问本人匹配必须 403。
5. 执行规则开关/服务停止、超时、坏 JSON/坏结构、权限拒绝、无结果与回滚场景。M7 允许的传输/坏返回故障用本地硬过滤基线，401/403/409/422 保持拒绝；M8 公开 RPC 不可用则手动定价/不可用路径，私有候选 NO_GO 则原规则。不能把这两个 M8 路径混为一谈。
6. 用 [发布接收记录模板](joint-delivery/release-acceptance-template.json) 填真实执行、结果与日志路径；M10 独立复核，M1 才能引用最终数字/签署。

可复用的现有测试命令（M9 已按项目 runbook 启动真实基础设施、完成迁移后）：

```powershell
Set-Location backend
python -m pytest tests/test_live_intelligence.py tests/test_matching_jobs.py -v
Set-Location ../frontend
npm ci
npx playwright install chromium
npm run test:live
```

必须检查 pytest 实际收集并执行，缺 PostgreSQL 导致 skipped 不能通过。单测/CI 跑通不等于上述同一业务记录的跨层发布追踪已完成。沿用 M9 `backend/README.md`、项目 Compose 与 M3 页面流程，不另造部署参数。

## 明确遗留

本机没有 Docker/PostgreSQL/Redis、没有获确认的发布地址或正式阶段基点。现有 Phase4 CI 37 后端/5 浏览器通过是上游技术证据；新准备分支 CI 另行登记，任何 CI 都不代签 M9 发布接收。发布环境 image digest、同一记录跨层关联、M3 截图、M10/M1 签署暂为 null/NOT_RUN，见 [接收状态](joint-delivery/acceptance-status.json)。AI5-09 不记为正式完成。
