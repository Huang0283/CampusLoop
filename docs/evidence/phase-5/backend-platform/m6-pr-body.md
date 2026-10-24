## 任务与目标

M6：BP5-03、BP5-04、BP5-05；BP5-10 的 M6 证据部分。
base：phase5/backend-release；compare：task/m6-p5-business-hardening。
建议 Draft PR：本地实现和报告完成，真实集成及最终冻结有阻塞。

## 变更

- 修复业务键/游标边界；新增真实数据库并发接受、双方完成、唯一评价和补拉回归。
- 补回 P5 基线缺失的 M6 P4 智能适配器/事件加固，增加 P5 响应字段边界检查。
- 固定候选契约 0.5.0-rc.1，同步 OpenAPI/SDK，增加可执行示例和原始测试证据。
- 未新增冻结外业务；运行与迁移文件仍归 M9。

## 交付路径

docs/evidence/phase-5/backend-platform/：business-invariant-report.md、realtime-ai-regression.md、final-api-documentation.md、deliverables.md、verification.md、handoff.md、release-verification.md、examples/、evidence/。
源码和测试 backend/；契约 openapi/campusloop.v1.yaml；SDK frontend/src/sdk/generated/；复验 scripts/m6_phase5/verify.py。

## 验证命令与结果

根目录用后端环境 Python 执行 python scripts/m6_phase5/verify.py；严格验收添加 --require-integration。
frontend 执行 npm run sdk:check、git diff --exit-code -- src/sdk/generated/、npm run lint、npm run build、npm run test:transaction。

后端 82 passed / 37 skipped / 1 xfailed；Ruff 通过；结构契约 61 操作/9 枚举/16 示例；M7 31、M8 17 通过；SDK/lint/build/8 个交易 Mock 通过。严格验收未通过，integrationAccepted=false。SDK 重生成一致，见 m6-sdk-drift.log。

## 遗留与评审请求

1. M5 治理路由未集成，严格 xfail 跟踪；合并后 M6 复核、移除标记并重跑。
2. 本机无可用完整服务，37 项跳过；需要 M9 环境和 M10 独立验收。
3. 继承锁文件安装报告 7 项 high，交前端依赖 Owner/M1 评估。
4. 请求 M5、M9 至少一人评审；涉及契约请 M2/M3/M4、M7/M8 确认，最终 M10/M1 接收。以上为请求，尚无签字。

按 M5 -> M6 -> M9 合并。本 PR 不关闭整个 Phase 5 Issue；合并提交和最终标签由负责人登记。
