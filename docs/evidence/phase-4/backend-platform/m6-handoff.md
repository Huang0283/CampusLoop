# M6 Phase 4 交接

基线 `9ceddb1cc2d90f9f587b88017e92b043630e0f1d`；本地实现日期2026-10-15。
实现身份：`evidence/m6-source-sha256.json`。最终PR/合并SHA待提交者和M5登记。
接收状态均如实记录，不代替他人签字。

| 输出/任务 | 接收人 | 接收动作与验收依据 | 当前结论 | 建议核对时间 |
|---|---|---|---|---|
| BP4-03/04 任务身份、生命周期与通知 | M5/M9 | Review matching_jobs.py和两份领域文档；独立库执行test_matching_jobs.py，验证重复、旧事件、关闭、并发 | 本地单元通过；DB待执行 | 2026-10-16 18:00 |
| BP4-05/06 业务API/降级 | M7/M8/M2/M3 | 按ai-business-api.md的7步联调，确认RPC版本、响应、超时与消费显示 | 本地RPC故障通过；跨组确认待完成 | 2026-10-16 18:00 |
| H4-02 治理统一契约与SDK | M5/M2/M3/M10 | Review本人/管理员信誉、resolve/override、reason、DTO权限；运行7项契约回归及sdk:check | 已实现并本地通过；接收签字待完成 | M6任务PR合入前 |
| M9运行与历史数据 | M9 | 依m6-runtime-requirements.md复验唯一索引、Worker、迁移兼容、健康检查和观测 | 未修改迁移/部署；真实环境待提供 | 2026-10-16 18:00 |
| BP4-10联合测试 | M5/M9/M10 | 在阶段集成SHA执行真实DB测试和MVP E2E，追加ai-integration-signoff.md | 尚未完成，不能用Mock替代 | 阶段冻结前，先于2026-10-16 18:00核对 |
| 冻结与Phase5接收 | M1/M10/M5 | M5汇总证据到既有deliverables/verification/handoff；记录个人/小组PR、合并SHA和遗留项 | 待Review/合入/汇总 | 按M1最终DDL，先于2026-10-16 18:00核对 |

以上2026-10-16 18:00是建议的下一次检查时间，须Owner确认，不代表擅自延期；若M1截止更早，以M1为准。

## 输入约束

- M5治理代码已在基线合入；本次接收其H4-02，未替M5签署组级交付物。
- 使用已经合入的M7/M8规则服务契约；M7语义分支未集成，不能声称语义检索已上线。
- M8价格准入仍NO_GO；保持m8-price-rule-v1或不可用，不启用未准入候选。
- 没有新增迁移；facts新增两个可选JSON字段。M9仍需提供真实升级/回滚证据。
- 没有可用PostgreSQL，42项集成测试跳过。影响：无法在本机证明事务/并发和基础MVP全链路。

## 分支接收顺序

M6任务PR：`task/m6-p4-ai-orchestration` → `phase4/backend-integration`。
至少M5/M9一人Review，涉及字段请相应Owner在PR确认。
顺序M5 → M6 → M9；M9应从M6合入后的最新组分支同步。
M5再发组分支 → `phase4/integration`；M10/M1验收后，仅M1发阶段分支 → `main`。
本次个人PR不关闭整个阶段Issue。

## Phase5接收

M6接收已冻结编排/契约的缺陷修复与回归，M9接收运行/恢复与性能，M5接收治理，M10接收复验。
仅处理冻结清单内问题；新增语义模型、价格模型或通知策略先经范围变更。
