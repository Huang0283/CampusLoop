# 管理质量 Phase 4 交付索引

- MQ4-01：`ai-go-no-go-decisions.md` — M7/M8 正式决定为规则/关键词基线保留，学习候选 NO_GO；真实评估数据交后续测试组。
- MQ4-02：`integration-schedule.md` — 过程计划；原排期日期仅为计划，不作为现在已经开会或签署的证据。
- MQ4-03/04/05：`independent-ai-evaluation.md`、`ai-degradation-test-report.md`、`mvp-regression-report.md` 与 `m10-verification.md`。最新 tip 的复测摘要及原始文件在 `m10-2026-10-22/`。
- MQ4-06：`feature-freeze-register.md` — 可审核冻结范围，正式发布门禁仍未过。
- MQ4-07：`fourth-presentation-package.md` — 汇报脚本；实际汇报纪要待 M1 完成后另行记录，脚本不算汇报。
- MQ4-08：`release-candidate-baseline.md` 与 `handoff.md` — 候选起点和 Phase 5 接收清单；须待 main 合并 SHA/tag 生成后更新。
- Release gate：`freeze-candidate.json` 当前 `BLOCKED_PENDING_PRESENTATION_MAIN_MERGE_AND_TAG`，并由 `check_freeze_gate.py` 强制检查。
- 技术审计：`phase1-4-closure-audit.md`（源码审计提交 `87750c1`）及 `audit-2026-10-20/`；作为旧提交绑定证据保留，不改写成新提交测试。
