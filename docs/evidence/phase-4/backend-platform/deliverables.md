# M5 Phase 4 交付清单

Owner：M5 胡可铭（Tomori-na）。2026-10-15。
个人任务 PR：[#100](https://github.com/Huang0283/CampusLoop/pull/100)，
目标 `phase4/backend-integration`；待同组交叉 Review，尚未合并。
任务来源：[BP-P4 Issue #30](https://github.com/Huang0283/CampusLoop/issues/30)，按五个 Phase 执行。
阶段输入：main `829ffbfc7f5c310917b2ff7c9627fe98b117824a`；
个人/小组创建基线：phase4/integration `cdf814364eec988e0d197c0a0098a92eb5db4d6e`，包含 M8 #97。
源码与测试提交：`c4687d5a44eb18d5a96af4bec03b85ec933da0be`。

| 任务 | 实际输出 | 作者自检 |
|---|---|---|
| BP4-01 | governance 服务的信誉白名单投影、self/admin 路由；intelligence 公共视图；trust-api.md | 通过 |
| BP4-02 | 举报列表/处理/带版本比较的人工覆盖；风险、账号及证据访问审计；moderation-api.md | 通过 |
| BP4-10 的 M5 部分 | 正常、重复、并发、乱序、越权、模型关闭/超时、审计原子性测试；ai-integration-signoff.md / handoff.md | 本地通过，联合签字待完成 |

代码位于 `backend/app/api/routes/governance.py`、`backend/app/services/governance.py`；
现有 `auth.py`、`intelligence.py`、`media.py` 与 `main.py` 做必要接入。
测试位于 `backend/tests/test_governance_api.py`、`test_governance_projection.py`，
并更新 `test_realtime_media.py` 的证据审计断言。
设计和执行记录位于 `docs/superpowers/specs/2026-10-15-m5-p4-governance-design.md`
及 `docs/superpowers/plans/2026-10-15-m5-p4-governance.md`。

复用现有 Report/AuthAudit/IdempotencyRecord，无新增数据库迁移。
统一 OpenAPI/SDK 修改归 M6，逐项需求见 handoff.md；本次 SDK 漂移检查仅验证现有契约稳定。
M8 #98 的 RPC 响应加固仍是上游独立 PR，本次不重复修改其客户端。

合并路径：`task/m5-p4-governance-api` → `phase4/backend-integration`
→ `phase4/integration` → `main`。同组 M6/M9 至少一人 Review；M1 复核范围、M10 独立复测。
M5 先合入，M6 再从最新组分支接续，随后 M9；阶段最终合入 main 由 M1 执行。
本文件不宣称后端组或整个 Phase 4 已完成，也不关闭 #30。

独立定位交付提交：

```sh
git log -1 --format=%H -- backend/app/api/routes/governance.py
git log -1 --format=%H -- docs/evidence/phase-4/backend-platform/deliverables.md
```

原始逐用例成功结果经去除本机路径/主机名后归档于 `evidence/m5-api-results.json`。
验证命令、运行环境和剩余接收工作见 verification.md / handoff.md。
