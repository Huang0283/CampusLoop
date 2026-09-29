# Phase 2 管理质量组交接

## Phase 3 接收人

- M2/M3/M4：同步冻结路由、页面字段、五态和登录门禁；按 `CI-FE` 执行。
- M5/M6：把认证、业务动作、权限、状态、错误和幂等写入唯一 OpenAPI；逐项实现 `phase3-test-plan.md`。
- M9：修复固定镜像，保证迁移、种子、健康检查和 CI 可在干净环境执行。
- M7/M8：按版本化契约提供规则/模型服务和降级；人工复核或数据不足必须显式记录。
- M10：在 `phase3/integration` 执行 P0/P1、权限、状态、重复和降级集合。
- M1：只接收已合并、可复核的结果；管理范围变化和延期。

## 接收动作

1. 检出最终 `phase2/integration` 收口提交。
2. 运行 `python scripts/mq_phase2/self_check.py`。
3. 按 `ci-quality-gates.md` 执行本组命令。
4. 从 `baseline-traceability.md` 领取需求 ID 和场景 ID，不重新命名核心字段。
5. 若输入未冻结，在 PR 写明阻塞 Owner、影响和截止时间，不自行猜测。

## 当前阻塞

- M5/M6 契约证据和唯一 OpenAPI 组内提交缺失；Owner M5/M6，截止 2026-09-30 18:00。
- M4 页面、M8 智能交付缺失；Owner M4/M8，截止 2026-09-30 18:00。
- Compose MinIO 镜像不可拉取；Owner M9，截止 2026-09-30 12:00。
- M7 人工标签和 Owner 签字未完成；Owner M7/M8/M3/M6/M9，按 Issue #22 记录。
- 同组与跨组 Review、正式彩排尚未发生，不能代签。

## 完成门禁

只有上述输入进入 `phase2/integration`、M10 在该提交复验、M1 发布 `1.0-FROZEN` 并提交质量组汇总 PR 后，才能把本组标记为完成。
