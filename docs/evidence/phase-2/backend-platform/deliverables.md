# BP2 交付索引：M5 个人输入

Owner：M5（胡可铭）｜2026-10-08｜任务分支：`task/m5-p2-auth-contracts`。

本索引记录 M5 的 BP2-01、BP2-02 和 BP2-11 走查准备；不把 M6/M9 或小组共同任务写成已验收。阶段和范围以 [Issue #21](https://github.com/Huang0283/CampusLoop/issues/21) 为准。

| 任务 | 交付文件 | 内容 | 当前证据等级 |
|---|---|---|---|
| BP2-01 | [auth-contract.md](auth-contract.md) | 七个操作，请求/响应/权限/错误/失败恢复和虚构样例 | 个人设计文档；待同组与消费者评审 |
| BP2-01 | [auth-openapi-input.md](auth-openapi-input.md) | operationId、schema、序列化来源、M6 合入清单 | canonical 输入；未生成 SDK |
| BP2-02 | [auth-security-design.md](auth-security-design.md) | Argon2id、JWT、刷新链、撤销、WS、限流、字段及 18 个测试场景 | 设计与测试预期；非服务运行证据 |
| BP2-11 | [contract-signoff.md](contract-signoff.md) | 上游提交、9 项差异、决策输入与接收状态 | 联合评审登记，尚未完成共同签署 |
| 阶段证据 | [verification.md](verification.md) | 可复现结构/样例/所有权检查与实际结果 | 仅文档验证 |
| 阶段交接 | [handoff.md](handoff.md) | 下游 Owner、接收动作、阻塞和截止门禁 | 个人交接，保留组内汇总责任 |

本 PR 不修改 `openapi/campusloop.v1.yaml`、`frontend/src/sdk/generated/`、后端模型/迁移/种子、Compose 或 CI。公开市场读权限按照 Issue 最新内容处理，不以本地旧版 Issue 镜像遗漏为由要求游客登录。

当前共享基线 `c3a49290bf29cd54c1b569ed7a08dbd175891913`；当前个人交付提交由 PR head 和 `git log -1 --format=%H -- docs/evidence/phase-2/backend-platform` 确定。M9 的 #86 也新增本目录的 deliverables/verification/handoff，合并时应保留两人的章节及证据来源，禁止用任意一方整个文件覆盖另一方。

合并顺序：个人任务 PR → `phase2/backend-foundation`；个人交叉评审、M6 canonical 与 M9 接收完成后，M5 提交小组汇总 PR → `phase2/integration`；最后由 M1 收口 → `main`。已先合入的 M9 #76 不改写历史，后续差异按 PR 修正。
