# MQ5-09 发布记录（候选，非正式发布）

日期 2026-10-25。main 基线 1b3385a；phase5/integration 和 phase5/release-candidate 从此创建。审计业务源码 `audit/phase5-candidate-20261025@50108a3a50ca18e0da3f4db709da3f8bea2ee24c`，来源后端 ccba7ba、前端 444f8be、智能 89aca5b。审计分支已推送，不等于组汇总或 main 已合并。

M1 个人分支 `task/m1-p5-release`，M10 个人分支 `task/m10-p5-final-verification`，各自 PR 回到 phase5/release-candidate；实际链接由提交后登记。M2 PR #120 修复及两次 CI 成功，待组内合并。相同审计 SHA 另推送 `phase5/audit-candidate-20261025` 以触发联合 CI；它也是审计用途，不是正式组汇总。

候选包回执见 package-receipt.json；其源码固定，质量补充单独存放。运行 `python scripts/quality_phase5/release_tools.py check --root . --status docs/evidence/phase-5/management-quality/release-status.json` 检查发布门禁，当前预期退出 1/BLOCKED。证据文件损坏也会拒绝。

未创建最终标签、未合并 main、未关闭 Issue #37。未完成的最终发布动作不靠伪造 tag、代签或修改模型 GO 标志绕过；看板列出具体 Owner/下一步。待所有门禁真实满足，在同一最终提交重跑 CI/复现，补发布记录再发布。
