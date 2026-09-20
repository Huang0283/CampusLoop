# CampusLoop 分阶段 Issue 索引与闭环规范

## 1. 使用范围

本目录将十周项目拆为四个主责组、五个连续阶段，共 20 个可直接创建为 GitHub Issue 的任务书。每份 Issue 都必须能独立回答：谁负责、依赖什么、具体做什么、交付到哪里、怎样验收、失败如何记录、下一阶段接收什么。

需求依据按以下优先级执行：

1. 教师最新要求和团队正式变更决定。
2. 根目录 `README.md` 中的产品范围、MVP/Core/Stretch、技术边界和十周路线。
3. 本索引定义的阶段门禁和跨组交接。
4. 各组阶段 Issue 的具体任务。

发生冲突时不得自行选择方便的版本。必须由 M1 记录变更，由受影响负责人确认，M10 更新验收场景。

## 2. 文件命名规范

- 阶段 Issue：`<group>-phase-<阶段号>-<主题>.md`。
- `<group>` 仅允许：`management-quality`、`frontend`、`backend-platform`、`intelligence`。
- 文件名只使用小写 ASCII、数字和连字符。
- 一级标题统一为：`<组缩写>-P<阶段号> 中文阶段名称`。
- Issue 编号不写入文件名，避免把 GitHub Issue 编号误认成项目阶段号。
- 前端第一阶段文件 `frontend-phase-1-experience.md` 为既有基线，保持文件名和正文不变。

## 3. 五阶段定义

| 阶段 | 周次 | 里程碑 | 全项目可验证结果 | 下一阶段入口 |
|---|---:|---|---|---|
| Phase 1 | 1-2 | 第一次汇报 | 范围、成员、候选需求、页面/领域/智能可行性和十周计划明确 | 四组 Phase 1 Issue 关闭并合并 |
| Phase 2 | 3-4 | 第二次汇报 | 需求和设计基线冻结；原型、API、数据库、环境、数据与测试契约互相一致 | 设计评审通过；统一环境可启动 |
| Phase 3 | 5-6 | 第三次汇报 | 两个账号可从注册/登录完成发布、搜索、聊天、议价、订单、见面、双方确认、评价 | MVP E2E 通过并形成版本标签 |
| Phase 4 | 7-8 | 第四次汇报 | 至少两个智能功能真实集成，有基线对比、解释和降级；第 8 周冻结功能 | 冻结清单和发布候选范围确认 |
| Phase 5 | 9-10 | 第五次汇报 | 缺陷收敛、干净部署、恢复验证、文档/演示/提交包齐全 | 最终标签和提交清单签字 |

## 4. Issue 矩阵

| 小组 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|---|---|---|---|---|---|
| 项目管理与质量组 | [范围、计划与质量框架](management-quality-phase-1-scope-planning.md) | [需求与设计基线](management-quality-phase-2-baseline-design.md) | [MVP 里程碑验收](management-quality-phase-3-mvp-acceptance.md) | [智能集成与功能冻结](management-quality-phase-4-integration-freeze.md) | [发布、答辩与最终提交](management-quality-phase-5-release-delivery.md) |
| 前端体验组 | [范围、信息架构与低保真原型](frontend-phase-1-experience.md) | [可点击原型与接口契约](frontend-phase-2-prototype-contracts.md) | [MVP 真实接口联调](frontend-phase-3-mvp-integration.md) | [智能结果、后台与冻结](frontend-phase-4-ai-integration-freeze.md) | [前端稳定化与交付](frontend-phase-5-stabilization-delivery.md) |
| 后端与平台组 | [领域边界与平台方案](backend-platform-phase-1-domain-architecture.md) | [API、数据库与统一环境基线](backend-platform-phase-2-contract-foundation.md) | [MVP 业务闭环实现](backend-platform-phase-3-mvp-implementation.md) | [智能任务、治理与冻结](backend-platform-phase-4-ai-governance-freeze.md) | [安全、恢复与部署交付](backend-platform-phase-5-hardening-delivery.md) |
| 智能功能组 | [数据可行性与规则基线](intelligence-phase-1-feasibility-baselines.md) | [数据集、评估与服务契约](intelligence-phase-2-data-evaluation-contracts.md) | [可接入基线服务](intelligence-phase-3-baseline-services.md) | [模型集成与真实评估](intelligence-phase-4-model-integration-evaluation.md) | [复现、说明与最终交付](intelligence-phase-5-reproducibility-delivery.md) |

## 5. 跨阶段闭环

| 上一阶段输出 | 下一阶段必须消费 | 证据要求 |
|---|---|---|
| Phase 1 需求候选、页面旅程、领域状态、数据可行性 | Phase 2 冻结需求、原型、API/数据库、样本和测试契约 | Phase 2 Issue 列出所引用的 Phase 1 文件或 PR；未消费项必须说明删除理由 |
| Phase 2 设计基线、统一环境、接口样例、测试场景 | Phase 3 前后端实现、基线服务和端到端测试 | 每个实现 PR 标注需求 ID、接口版本、迁移版本和验收场景 |
| Phase 3 MVP 版本、缺陷清单、真实业务数据结构 | Phase 4 智能集成、治理补齐和功能冻结 | 智能功能不得绕过 Phase 3 权限、状态机和事务；集成测试必须保留降级场景 |
| Phase 4 冻结版本、指标报告、遗留问题 | Phase 5 只修复、优化、复验和打包 | Phase 5 不新增功能；例外必须有 M1 变更记录和 M10 回归范围 |

任何交付不得以“后续处理”结束。未完成项必须写成：`阻塞事项 / Owner / 依赖人 / 影响 / 下一动作 / 明确截止时间`。

## 6. 协作与验收逻辑

跨组协作必须按“规则/契约提供者 -> 实现提供者 -> 消费者接入 -> M10 独立验收”的顺序进行，不能让消费者为尚不存在的能力负责，也不能用消费者页面反过来证明服务已完成。

| 阶段 | 上游应提供 | 下游可验收 | 本阶段禁止声称 |
|---|---|---|---|
| Phase 1 | 页面/领域/数据候选、状态规则、验收场景草案 | 文档能相互映射，流程无设计缺口 | 页面可交互、接口已实现、模型有效 |
| Phase 2 | 冻结契约、成功/失败样例、可点击 Mock、服务骨架 | 原型按契约演示；契约测试和环境冒烟通过 | 真实业务联调完成 |
| Phase 3 | 真实 API/WebSocket、迁移、基线服务、测试数据 | 前端接入后完成双账号真实持久化闭环 | Mock、内存状态或固定响应等于完成 |
| Phase 4 | 模型候选、任务触发、结果存储、解释和降级 | 同一数据上基线对比，集成/降级均可演示 | 指标未运行、风险自动处罚、功能未冻结 |
| Phase 5 | 冻结版本、缺陷修复、部署包和最终文档 | 非作者干净部署、回归、恢复和演示 | 新功能或未登记范围变化 |

### 6.1 典型交接顺序

| 能力 | 规则/契约 Owner | 实现 Owner | 页面消费者 | 独立验收 | 顺序 |
|---|---|---|---|---|---|
| 认证与资料 | M5 | M5 | M2 | M10 | M5 契约/接口 -> M2 接入 -> M10 权限与恢复测试 |
| 商品与求购 | M6 | M6 | M3 | M10 | M6 状态/API -> M3 接入 -> M10 主路径/越权测试 |
| 聊天与交易 | M6 | M6（API/WebSocket） | M4 | M10 | M6 状态/接口可测 -> M4 交互接入 -> M10 双账号/断线测试 |
| 搜索与匹配 | M7 + M6 | M7 基线/模型，M6 触发与落库 | M3 | M10 | M7 输出契约 -> M6 业务接入 -> M3 展示 -> M10 对比/降级测试 |
| 价格建议 | M8 + M6 | M8 规则/模型，M6 业务接入 | M3 | M10 | M8 输出/限制 -> M6 接口 -> M3 展示 -> M10 复现/降级测试 |
| 信誉与风险 | M8 + M5/M6 | M8 规则，M5/M6 权限与事实 | M2/管理页 | M10 | 业务事实/可见性 -> 规则结果 -> 管理展示 -> 人工边界测试 |
| 数据与运行环境 | M5/M6/M7/M8 提需求 | M9 | 全员 | M10 | 资源需求 -> M9 环境/迁移 -> 非作者启动 -> M10 复核 |

### 6.2 上游未就绪处理

1. 消费者可以使用与冻结契约一致、且明显标记的 Mock 继续开发 UI，但只能把任务标记为“待联调”，不能标记“完成”。
2. 上游必须提供阻塞单：缺少能力、当前可用替代、Owner、预计提交、受影响场景和下一检查时间。
3. 接口一旦可用，先由上游提供契约/服务测试证据，再由消费者接入；M10 只在两者都完成后执行端到端验收。
4. 阶段关闭条件要求真实联调时，未联调项必须由 M1 正式移出范围或顺延并修改下游 Issue；不能用 Mock 关闭。
5. 同一人不能既声明上游完成又替代 M10 做最终独立验收。

## 7. 全局完成定义

单个 Issue 只有同时满足以下条件才可关闭：

- [ ] 所有必做任务完成，或未完成项已按变更流程移出范围。
- [ ] 每个成员的产物进入仓库，路径可打开，内容与当前代码一致。
- [ ] 任务分支通过 PR 合并到阶段集成分支，至少一名同组成员完成 Review。
- [ ] 影响其他组的接口、字段、状态、页面或指标由对应负责人确认。
- [ ] 自动化检查与本 Issue 指定验收通过，命令、环境、结果和提交号有记录。
- [ ] M10 完成独立复核；M1 完成范围与业务结果复核。
- [ ] 汇总 PR 已合并，Issue 收尾评论记录任务 PR、汇总 PR、最终提交、证据路径、遗留问题和下一阶段接收人。
- [ ] 没有密钥、真实个人隐私、构建产物、伪造数据或无法复现的效果数字。

## 8. 总文档功能闭环矩阵

| 总文档能力 | 规则/服务主责 | 前端主责 | 设计冻结 | 真实实现 | 扩展/加固 | 最终验收 |
|---|---|---|---|---|---|---|
| 注册、登录、资料、角色与隐私 | M5 | M2 | Phase 2 | Phase 3 | Phase 5 安全加固 | M10 认证/权限/恢复 |
| 商品、图片、市场、收藏 | M6 + M9 存储 | M3 | Phase 2 | Phase 3 | Phase 5 性能/恢复 | M10 商品主路径/越权 |
| 关键词搜索与筛选 | M6 + M7 基线 | M3 | Phase 2 | Phase 3 | Phase 4 混合检索 | M10 固定查询集/E2E |
| 求购市场 | M6 | M3 | Phase 2 | Phase 3 | Phase 4 匹配集成 | M10 发布/关闭/权限 |
| 聊天与消息补拉 | M6 + M9 运行 | M4 | Phase 2 | Phase 3 | Phase 5 断线/恢复 | M10 双账号/WebSocket |
| 报价、订单、见面、双方确认 | M6 | M4 | Phase 2 | Phase 3 | Phase 5 并发/幂等 | M10 状态机/E2E |
| 评价 | M6 + M5 用户汇总 | M4 | Phase 2 | Phase 3 | Phase 5 唯一性/权限 | M10 完成/未完成对照 |
| 举报、通知、最低管理后台 | M5/M6 | M4 入口，M2 后台 | Phase 2 | Phase 3 基础 | Phase 4 治理补齐 | M10 隐私/审计 |
| 语义搜索 | M7，M6 业务接入 | M3 | Phase 2 契约 | Phase 3 关键词基线 | Phase 4 模型/降级 | M10 基线对比/复现 |
| 供需匹配与去重通知 | M7，M6 触发落库 | M3/M4 通知 | Phase 2 契约 | Phase 3 规则基线 | Phase 4 语义模型 | M10 硬约束/去重/降级 |
| 价格建议 | M8，M6 业务接入 | M3 | Phase 2 契约 | Phase 3 规则区间 | Phase 4 条件式模型 | M10 区间/指标/降级 |
| 信誉与风险辅助 | M8 + M5/M6 | M2 管理展示 | Phase 2 契约 | Phase 3 规则基线 | Phase 4 人工治理 | M10 解释/无自动处罚 |
| 数据库、迁移、缓存、存储、CI | M9 | 各组消费者 | Phase 2 基线 | Phase 3 运行 | Phase 4 任务环境 | M10 干净部署/恢复 |
| 需求、测试、文档、汇报、提交 | M1/M10 | 全员提供证据 | 全阶段 | 全阶段 | Phase 5 汇总 | M1 范围 + M10 质量 |

矩阵中的“真实实现”只在对应服务、页面和持久化证据同时存在时完成。某一格被正式删减时，M1 必须更新需求追踪、相关阶段 Issue 和最终未完成清单，不能只删除下游任务。

## 9. GitHub Issue 创建要求

手动创建 Issue 时，标题使用：`[组缩写][P阶段] 阶段名称`，正文复制对应 Markdown 全文，并设置：

- Milestone：对应第几次汇报。
- Assignees：该组全体成员，组内负责人为主 Assignee。
- Labels：`group:<group>`、`phase:<n>`、`type:milestone`。
- Dependencies：正文“输入门禁”中列出的上游 Issue。
- Closing PR：只允许阶段汇总 PR 关闭 Issue，个人任务 PR 不直接关闭阶段 Issue。

## 10. 分支与证据落盘规范

- 除保留不改的前端第一阶段外，每份 Issue 必须包含“任务卡与交付映射”，每行同时写明任务 ID、Owner、具体工作、交付物和单项验收；仅写“完成某模块”不算合格任务。
- 任务卡中未写完整目录的交付文件名，均相对于该 Issue“证据目录”字段；源码、迁移和测试代码仍提交到对应源码目录，并在交付文件中登记实际路径。
- 每份阶段 Issue 已给出唯一集成分支和成员任务分支；任务 PR 的目标必须是该阶段集成分支。
- 阶段证据统一放在 `docs/evidence/phase-<n>/<group>/`，其中 `<group>` 与文件命名中的组名一致。
- 每个阶段证据目录至少包含：`deliverables.md`（交付物及路径）、`verification.md`（命令/环境/结果/提交号）、`handoff.md`（向下一阶段交接和阻塞）。
- 代码、迁移、测试、模型和原始结果保留在所属源码目录；证据文件只登记可点击路径和结论，不复制大文件。
- 每个任务 PR 必须在阶段 Issue 中登记：成员、任务分支、PR、Reviewer、跨组确认人、验证命令、结果和最终提交。
- 阻塞记录必须包含：`阻塞事项 / 上游 Owner / 下游 Owner / 当前可做内容 / 不能验收内容 / 下一动作 / 截止时间`。

Issue 收尾评论统一使用：

```markdown
## 阶段收尾

- 集成分支：
- 任务 PR / Reviewer：
- 汇总 PR / 合并提交：
- 交付物登记：docs/evidence/phase-<n>/<group>/deliverables.md
- 验证记录：docs/evidence/phase-<n>/<group>/verification.md
- 下一阶段交接：docs/evidence/phase-<n>/<group>/handoff.md
- M10 复核结论：
- M1 范围结论：
- 遗留问题（Owner / 影响 / 截止时间）：
```
