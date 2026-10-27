# 项目管理与协作入口

## 当前执行文档

- [九人协作总任务书](./nine-member-collaboration-plan.md)：九个独立岗位的任务、文件边界与验收，成员自行认领。
- [每次升级后的完整工作流](../workflows/version-acceptance.md)：M10 版本通知、T01–T15 功能范围、U01–U08 真人任务、反馈/复测/材料同步。
- [GitHub 协作 Issue 源文](../issues/nine-member-collaboration.md)：与远端 #129 同步，包含四条组分支和九条岗位分支。
- 单组任务与 Git 操作：[文书](../collaboration/teams/reporting/TASKS.md)、[测试](../collaboration/teams/testing/TASKS.md)、[用户体验](../collaboration/teams/user-experience/TASKS.md)、[演示](../collaboration/teams/presentation/TASKS.md)。各目录 WORKFLOW.md 提供准确分支名、每日拉取/push/PR/Review 和注意事项。

## 文档清理记录（2026-10-27）

检查当前管理/协作/工作流文件、仓库内引用、阶段要求及课程交付边界后：

- 删除 closeout-task-packages.md、eight-member-self-selected-deliverables.md 及对应两份 DOCX：旧八人、四组各两人的安排已被九人 2/3/2/2 岗位覆盖，端口/演示时长/截止说明也存在旧口径。
- 删除 team-daily-git-workflow.md：旧五天节奏、泛化阶段分支示例与当前具体分支规则重叠，改用 version-acceptance.md 及各组 WORKFLOW.md。
- 删除旧 CampusLoop_Nine_Member_Collaboration_Plan.pdf：v1.2 导出与本轮 v1.3 源文不一致，不再同时提供两套可执行指令；当前以 Markdown 为准，需要打印时从当前源文重新导出并标版本。
- 删除 frontend/docs/api-contract.md：旧手写认证响应与现有浏览器会话契约不一致，HTTP 契约只保留 openapi/campusloop.v1.yaml 为准。同步更新根目录、前端、后端 README 和 SDK 说明的当前运行入口，移除“仅原型/仅骨架”的过期介绍。
- 删除 tools/create_closeout_task_documents.py 和 tools/build_collaboration_plan_pdf.py：仅用于上述旧版产物，包含写死的八人安排或 v1.2 日期，避免重新生成失效说明。
- 保留 m1/、m10/ 的原阶段管理任务、docs/issues/ 五周阶段 Issue、docs/evidence/ 的验收记录、docs/reports/ 历史汇报、课程/Proposal 原始交付和引用材料，它们承担不同证据用途，不因名称相似删除。
- 历史证据中“八人任务包”等文字是当时状态，保留原记录字节，不回写历史结论；后续执行使用上方当前文档。
- docs/superpowers/ 的三份小型设计/修复记录仍被阶段交付引用或包含未执行事项，保留追溯；它们不是现行团队操作指南。
- 本地未提交 SDK/报告/PDF/验收输出不纳入本轮清理或提交。旧内容可从 Git 历史找回，不另堆备份副本。

## 原阶段记录

m1/ 是原项目范围、需求追踪、团队职责、阶段安排、决策、风险和集成检查；m10/ 是测试策略、核心场景、缺陷等级、质量与汇报检查。每份的日期/候选状态属于该记录，不等于当前项目最新完成结论。当前状态应以对应阶段最新验收证据与 GitHub Issue 为准。
