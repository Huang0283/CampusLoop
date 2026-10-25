# CampusLoop 九人协作与最终交付规划

版本：1.1

日期：2026-10-25

适用对象：CampusLoop 校园二手交易系统

技术负责人：M10 陈梓弘（20253801098）

协作方式：GitHub Issue、分支、Pull Request、可追溯证据

## 文档目的

本文件把剩余九名组员的工作拆成可以独立领取、独立提交和独立验收的任务。九名组员负责测试、技术报告、用户手册、页面证据、演示和提交材料；M10 负责继续优化系统功能、API、前端 UI、真实联调、缺陷修复和最终技术合并。

本文件不预先决定谁加入哪一组。九名组员先按个人兴趣和能力选择下述工作方向及岗位，由组员自行协商形成分组，再在 Issue #129 登记姓名、岗位、组内复核人和分支。每个岗位有明确文件、每周结果、复核人和接收人。个人贡献必须以 GitHub PR、文件版本、测试日志、截图索引、演示记录或其他可核对证据为准。没有实际执行的内容只能写成待办，不能写成已完成。

## 课程交付约束

以下要求来自 `JC2001-GroupProjectDescription-and-Requirements-2026-27(1).pdf`，是本项目协作的硬约束：

- 项目计划书必须提交，但不计分；课程截止时间以 Blackboard 为准，团队不能自行猜测日期。
- 技术报告占总项目成绩的 50%。正文从 Introduction and Project Context 到 Conclusions and Future Work，要求 40 至 60 页；标题页、目录、图表目录、References 和 Appendix A 不计入正文页数。
- 技术报告按 A4、四边 2.54 cm 页边距、单栏、12 pt Arial 或 Times New Roman、1.5 倍行距排版，最终提交单个 PDF；报告不粘贴源代码，源代码放入 PoC 提交包。本内部中文协作规划使用 OceanScope 风格的宋体正文与黑体标题，不作为课程英文报告模板。
- Proof-of-Concept 软件占 30%。提交包必须包含源代码、可运行版本、依赖或支持文件以及 8 至 12 页用户手册 PDF。
- 项目演示占 20%。课程要求一次 15 分钟演示，提交 PowerPoint 和 MP4；录像必须出现演示者本人，不能只录屏或用自动化录像代替真人讲解。
- 课程安排四次 Project Updates，至少提交三次。每次更新要写已完成工作、困难及处理方法、下一步，并且内容必须反映真实进度和与导师的讨论。
- 技术报告 Appendix A 必须附 Group Workload Profile。所有成员应在没有争议时签名；如不同意贡献评价，不应签名并应按课程要求联系课程负责人。贡献百分比必须有可量化证据，不能凭感觉填写。
- 所有外部代码、图、图片、数据、模型、算法和 AI 使用都要按学校要求说明来源和使用方式；不把自动生成内容当作成员独立贡献。

## 九人自选工作方向

以下是四种互相接力的工作方向，不是已经分配完成的组员名单。九名组员可在各方向内自行组队并选择个人岗位；每个方向建议人数只用于平衡工作量，不构成固定名额。若报名人数不平衡，由组员协商调整并在 Issue #129 登记，确保所有岗位都有负责人。

### 文书与技术报告方向（建议 2 人）

把真实实现、需求、设计、测试结果和限制写成可评分的英文技术报告，并维护事实追踪。可选择“需求与报告统稿”及“系统设计与技术证据”两个岗位。成员按自己的选择登记。

### 独立测试与验收方向（建议 3 人）

从非作者视角独立复现功能、权限、异常、环境、性能和恢复。可选择“身份权限与隐私”“双账号交易与业务状态”“部署、性能与恢复”三个测试岗位。技术负责人修复代码，测试执行人保留失败记录并在修复提交上复测。

### 用户手册与页面证据方向（建议 2 人）

让没有参与编码的人能够按手册运行和使用系统，并记录真实页面状态。可选择“学生用户手册与主流程”“管理员/部署说明与页面证据”两个岗位。页面布局问题提交给 M10 修复，组员负责在新 SHA 上复查，不直接修改生产页面。

### 最终演示与提交方向（建议 2 人）

在功能和 UI 冻结后制作课程演示。可选择“PPT、课程要求与证据来源”“讲稿、双账号演示、彩排和 MP4”两个岗位。演示成员负责遵守真实评估结论和 NO_GO 限制，不提前把变化中的页面录成最终视频。

### 自选登记规则

九名成员分别选择一个主要方向和个人岗位，在 Issue #129 登记姓名、成员编号、方向、岗位、交付文件、组内复核人和个人分支。登记后如需调整，由本人在 Issue 留言说明原因、已完成材料接收人及新负责人，再更新登记；不得由技术负责人静默代分组。

认领前所有岗位均为“待认领”，建议人数不代表已经组好队。可兼岗或拆分岗位，但每项文件只能有一个编辑负责人，所有交付均须有人认领。组员同时推选材料集成人，负责登记、共享索引及材料汇总；该职责不自动分配给任何成员。

### 技术负责人

M10 陈梓弘，20253801098，不属于上面九人的材料分组。M10 继续负责：

- 前端批准界面、响应式 UI、路由、游客访问、登录态和真实 SDK 接入；
- FastAPI、OpenAPI、数据库迁移、权限、状态机、消息和对象存储联调；
- 修复测试组登记的代码缺陷，维护每日可运行分支；
- 提供每轮可验收 SHA、虚构账号、数据复位方法和启动方式；
- 审核跨模块改动，合并阶段集成分支和最终技术版本；
- 在代码改变后通知受影响的测试、文书、手册和演示成员。

M10 不替九名成员伪造 Review、测试执行、课程演示、签名或贡献评价。技术代码可以由 M10 集中完成，但材料组必须完成自己的真实交付。

## 各组具体交付

### 文书与技术报告组

“需求与报告统稿”岗位的个人任务：

1. 写英文 Introduction and Project Context，说明校园二手交易问题、目标用户、范围、项目目标和价值。
2. 维护 Requirements 章节和需求追踪清单，把每个重要需求关联到 Issue、代码入口、测试证据和当前状态。
3. 汇总系统设计岗位提供的章节、测试组的实际结果、手册组的页面证据和 M10 的限制说明。
4. 维护 `docs/submission/technical-report/technical-report.md`、`references.md`、`report-evidence-index.md` 和 `member-contributions.md`。
5. 每个大版本后更新受影响章节，并在 PR 描述中写出本次改动影响了哪些结论、数字、截图和限制。
6. 最终导出 `CampusLoop_Technical_Report.docx` 和 `CampusLoop_Technical_Report.pdf`，检查目录、图表编号、页码、引用、40 至 60 页正文和 Appendix A。

“系统设计与技术证据”岗位的个人任务：

1. 根据实际仓库写系统设计、架构、数据库、API/SDK、实时消息、权限和状态机说明。
2. 写智能方法章节，区分关键词/规则基线、可用的降级能力、实验候选和 NO_GO 的学习模型。
3. 为每张架构图、时序图、状态图建立来源记录，写明代码路径、OpenAPI 路径或测试证据。
4. 记录技术选择、替代方案、性能限制、数据来源、模型限制和许可风险。
5. 每次 M10 修改 API、字段、状态、权限、页面流程或智能输出时，在两个工作日内更新受影响章节和图源。
6. 接受报告统稿岗位的事实复核，并请 M10 核对实现；如果证据不足，必须标记“待验证”或“当前不支持”，不能为了完整性补写结论。

共同交付目录：

- `docs/submission/technical-report/introduction.md`
- `docs/submission/technical-report/requirements.md`
- `docs/submission/technical-report/design.md`
- `docs/submission/technical-report/implementation.md`
- `docs/submission/technical-report/ai-methods-and-limitations.md`
- `docs/submission/technical-report/testing-and-evaluation.md`
- `docs/submission/technical-report/conclusions.md`
- `docs/submission/technical-report/references.md`
- `docs/submission/technical-report/report-evidence-index.md`
- `docs/submission/technical-report/technical-report.md`
- `docs/submission/technical-report/CampusLoop_Technical_Report.docx`
- `docs/submission/technical-report/CampusLoop_Technical_Report.pdf`

验收：测试组核对测试数字，手册组核对页面路径，M10 核对实现事实。报告只有在每个关键结论能回到一个提交 SHA 和证据文件时才算通过。

### 独立测试与验收组

“身份权限与隐私测试”岗位的个人任务：

1. 编写游客、普通学生、买方、卖方、管理员、非参与方和禁用账号的权限用例。
2. 验证邮箱、令牌、私聊、见面地点、举报证据和内部风险字段不会越权暴露。
3. 验证注册、登录、退出、刷新、会话失效、错误密码和账号禁用结果。
4. 对每个权限缺陷写严重度、角色、最短复现、预期、实际、请求/响应和 SHA。
5. 在 M10 修复后重新执行同一用例，并保留修复前失败记录。

“双账号交易与状态测试”岗位的个人任务：

1. 用两个隔离浏览器账号执行游客浏览、注册、发布商品、搜索、收藏、联系、报价、接受报价和唯一订单。
2. 验证约定时间/地点版本、双方确认、完成、评价、取消、争议、通知和刷新后的持久化。
3. 测试重复提交、重复消息、并发接受同一商品、非法状态转换和非参与方访问。
4. 记录商品 ID、会话 ID、报价 ID、订单 ID、约定版本、双方账号和实际结果；不得记录真实隐私。
5. 将演示主路径交给讲稿与演示岗位，但只有在第二轮复测通过后才允许进入最终演示脚本。

“部署、性能与恢复测试”岗位的个人任务：

1. 按部署手册从干净目录启动前后端、数据库、Redis、MinIO、Worker 和智能基线。
2. 验证迁移、回滚、种子幂等、健康检查、CI、日志和配置模板。
3. 在专用审计数据库和 Redis DB14/15 执行并发、性能、故障降级和恢复；禁止写日常账号库。
4. 记录 API p50/p95/p99、请求数、并发数、数据量、硬件/容器、时间和原始日志路径。
5. 验证损坏备份在写入前被拒绝，并检查 PostgreSQL 数据与 MinIO 媒体恢复范围的差异。

共同交付目录：

- `docs/collaboration/phase-<n>/testing/functional-test-cases.md`
- `docs/collaboration/phase-<n>/testing/boundary-test-cases.md`
- `docs/collaboration/phase-<n>/testing/execution-log.md`
- `docs/collaboration/phase-<n>/testing/defects.md`
- `docs/collaboration/phase-<n>/testing/retest-log.md`
- `docs/collaboration/phase-<n>/testing/environment-verification.md`
- `docs/collaboration/phase-<n>/testing/non-functional-results.md`
- `docs/collaboration/phase-<n>/testing/test-summary.md`
- `docs/collaboration/phase-<n>/testing/evidence-index.md`

每条测试记录必须包含：用例 ID、Issue/需求 ID、前置、账号/角色、数据、步骤、预期、实际、结果、执行人、时间、源码 SHA 和证据路径。通过、失败、阻塞、不适用分别统计，不得把阻塞写成通过。

### 用户手册与页面证据组

“学生用户手册与主流程”岗位的个人任务：

1. 写用户手册中的安装入口、游客浏览、注册登录、登录来源恢复、商品、求购、收藏、聊天、报价、订单、见面、完成、评价、通知和举报。
2. 每个步骤写页面地址、角色、输入、按钮、预期结果、失败处理和重新登录条件。
3. 在 1440×900 与 390×844 检查游客、学生和管理员主流程，建立截图索引。
4. 每次 M10 改动路由、按钮、字段、错误提示、权限或页面布局后，更新手册并在新 SHA 上复测。
5. 与测试组核对页面步骤和 API 实际结果，不使用旧版本截图。

“管理员/部署说明与页面证据”岗位的个人任务：

1. 写管理员手册、部署手册和故障排查指南，包含端口、环境变量、迁移、种子、健康检查、停止和恢复。
2. 维护 `screenshot-index.md`、`page-issues.md`、`demo-data-plan.md` 和页面状态矩阵。
3. 检查侧栏、右上角账号/通知、弹窗、滚动、空状态、错误状态、无权限状态和移动端溢出。
4. 每个页面问题关联路由、角色、复现步骤、浏览器、视口、SHA、截图和 GitHub Issue；M10 修复后记录复测结论。
5. 为演示组提供虚构账号、商品、订单和失败场景的 ID 与复位方法，不提交真实密码或数据库。

共同交付目录：

- `docs/submission/manuals/user-manual.md`
- `docs/submission/manuals/admin-manual.md`
- `docs/submission/manuals/deployment-manual.md`
- `docs/submission/manuals/troubleshooting.md`
- `docs/submission/manuals/CampusLoop_User_Manual.docx`
- `docs/submission/manuals/CampusLoop_User_Manual.pdf`
- `docs/collaboration/phase-<n>/experience/screenshot-index.md`
- `docs/collaboration/phase-<n>/experience/page-issues.md`
- `docs/collaboration/phase-<n>/experience/demo-data-plan.md`
- `docs/collaboration/phase-<n>/experience/manual-verification.md`

验收：没有参与编码的人按手册完成主路径；测试组验证部署手册；所有截图来自同一 SHA，且不显示邮箱、令牌、真实私聊和真实举报证据。

### 最终演示与提交组

“PPT、课程要求与证据来源”岗位的个人任务：

1. 逐条核对课程要求中的 15 分钟时长、PPT、MP4、演示者出镜和提交 ZIP。
2. 制作英文 PPT，覆盖问题、目标、方法/架构、核心交易流程、智能能力、测试结果、限制、结论和贡献。
3. 为每页维护来源索引：需求 ID、报告章节、截图路径、测试记录、源码 SHA 和讲述人。
4. 在功能和 UI 冻结前只做演示结构草稿，不录最终视频；冻结后输出 `CampusLoop_Final_Presentation.pptx` 和 PDF 备份。
5. 检查全部数字、术语、截图和限制与报告、手册、软件版本一致。

“讲稿、双账号演示、彩排和 MP4”岗位的个人任务：

1. 写英文 15 分钟讲稿和逐秒演示脚本，安排每位成员的讲述段落。
2. 用两个虚构学生账号执行游客浏览到交易完成的主路径，写明 URL、账号角色、数据 ID、步骤、预期和备用动作。
3. 展示一个权限或状态边界，以及一个真实智能降级场景；不得把 NO_GO 模型讲成上线模型。
4. 组织第一轮彩排，记录失败点；M10 修复并由测试组复测后组织第二轮彩排。
5. 在最终冻结 SHA 上录制 MP4，视频中必须出现实际演示者；记录时长、分辨率、声音、可播放性和文件 SHA。
6. 准备断网、登录失败、智能服务关闭和接口延迟的备用方案，并明确备用录像不是现场运行成功。

共同交付目录：

- `docs/submission/presentation/CampusLoop_Final_Presentation.pptx`
- `docs/submission/presentation/CampusLoop_Final_Presentation.pdf`
- `docs/submission/presentation/presentation-script.md`
- `docs/submission/presentation/demo-runbook.md`
- `docs/submission/presentation/rehearsal-log.md`
- `docs/submission/presentation/media-manifest.md`
- `CampusLoop_Demo.mp4`（按课程提交方式存放，不默认提交 Git）

验收：文书组核对事实，测试组执行脚本，手册组核对截图与数据，M10 确认演示 SHA 与实际系统一致。所有组员参与要求按课程和团队实际安排记录，不代填。

## 大改动同步规则

### 什么算大改动

下列任一项都必须触发“代码、测试、文书、手册同步”：

- 新增、删除或改变路由、页面流程、登录守卫或游客权限；
- 修改 OpenAPI、请求/响应字段、错误码、生成 SDK、数据库模型或迁移；
- 修改商品、求购、聊天、报价、订单、见面、完成、评价、举报或通知状态；
- 修改 AI 输入输出、规则、模型、降级、解释、阈值或数据集；
- 修改页面布局、按钮、表单字段、错误提示、响应式断点或权限可见性；
- 修改端口、环境变量、Docker Compose、种子、启动命令、备份恢复或 CI；
- 修复会影响用户路径、测试预期、报告数字、截图或演示脚本的缺陷。

只改错别字、注释或不影响行为的排版，可以由文件 Owner 直接提交，但仍需在 PR 中说明“无行为变化”。

### 强制闭环顺序

1. M10 在代码 PR 或 Issue 中写变更原因、影响模块、需求 ID、风险、目标分支和预期验收场景。
2. 测试组在两个工作日内更新受影响用例；先保存旧失败或旧预期，再补新版本执行记录。
3. 文书组更新需求追踪、设计/实现章节、限制和报告数字；没有变化的章节也要在 PR 中说明已核对。
4. 手册组更新操作步骤、错误处理、截图索引和页面问题复测；旧截图必须标记过期，不得静默替换。
5. 只有测试和手册在同一候选 SHA 上通过后，报告负责人才能把报告相关 PR 合并到文书分支。
6. 功能和 UI 冻结后，演示组才更新最终 PPT、讲稿、彩排和 MP4；冻结前的 PPT 只能标为草稿。
7. M10 在阶段集成分支执行最终验收，确认软件、测试、报告、手册和演示使用同一 SHA；材料集成人复核范围和提交清单，随后再阶段收口。

这里“同一 SHA”指所有材料注明并验证的同一个软件基线 SHA，不要求文档 PR 的提交哈希与代码提交相同。材料 PR 应分别记录软件基线和材料版本；重测后如软件基线变化，必须补做影响检查。最终提交还须记录包含代码与材料的发布提交或标签。

### PR 必填内容

每个大改动 PR 必须写：

- 变更类型和需求/Issue ID；
- 影响的前端路由、后端接口、数据库/SDK、测试、手册和报告文件；
- 旧行为、新行为、失败状态和权限边界；
- 测试命令、数据环境、账号角色、源码 SHA 和实际结果；
- 文书/测试/手册同步 PR 链接；
- 未完成项、Owner、下一步和截止日期；
- 是否允许进入最终演示。默认答案为“否”，直到功能和 UI 冻结。

## 分支与 GitHub 协作

技术代码由 M10 按当前阶段建立技术分支，例如 `task/m10-phase5-ui-api-fix`，先合并到对应阶段技术集成分支。九名组员从同一验收 SHA 建立材料分支：

- `docs/p<阶段>-report`：文书组；
- `docs/p<阶段>-testing`：测试组；
- `docs/p<阶段>-manuals`：手册与页面证据组；
- `docs/p<阶段>-presentation`：演示与提交组。

各方向分支是材料集成分支，个人另建 `docs/p<阶段>-<方向>-m<编号>-<主题>` 分支，向对应材料集成分支发 PR。每个人只能编辑自己的主责文件；共享文件指定唯一 Owner，任务日志放在自己的成员目录，如 `testing/m05/task-log.md`。个人 PR 经另一名组员 Review 后，由推选的材料集成人汇总到阶段文档分支。未经测试、手册和范围同步，不得直接把代码 PR 合并到阶段收口分支。材料集成人准备收口 PR，由 M10 技术验收后按仓库权限与保护规则合并到 `main`；认领材料工作不代表获得合并权限。

每个阶段仍按一周完成：

- 第 1 天：M10 发布 SHA、运行方式、账号/数据、改动范围；九人确认分工和阻塞。
- 第 2 天：测试组补用例，文书组补章节，手册组补步骤和截图计划，演示组只写草稿。
- 第 3 至 4 天：测试执行并提缺陷；M10 修复；文书和手册同步更新。
- 第 5 天：测试组复测，手册组复查页面，文书组锁定本周数字；演示组准备第一轮彩排草稿。
- 第 6 天：同 SHA 交叉 Review，检查链接、文件名、证据、隐私和贡献记录。
- 第 7 天：阶段验收、交接、阻塞登记；只有功能和 UI 冻结阶段才进行第二轮彩排和最终视频。

## 个人任务日志与贡献记录

每位成员在 `docs/collaboration/phase-<n>/<方向>/m<编号>/task-log.md` 记录日期、任务、输入 SHA、产出文件、PR、实际执行、阻塞和接收人。每次大改动由材料集成人在 `docs/collaboration/phase-<n>/change-log.md` 登记变更 ID、代码 PR、测试 PR、文书 PR、手册 PR 和复测结论，其他人通过 PR 提供条目，避免多人同时改共享记录。

最终 Group Workload Profile 只在团队共同核对后填写。贡献评价使用课程给定的 0%、±10%、±25%、±50%、±100% 选项，必须有 PR、测试、文档、演示和 Review 记录支持；其中 0% 表示贡献相等，不表示没有贡献。本文件不预填成员的贡献百分比，也不代替任何人的签名。

## 完成标准

本协作计划只有同时满足以下条件才算完成：

1. M10 的软件候选 SHA 可在干净环境启动，核心旅程和失败边界可复现。
2. 测试组完成独立功能、权限、异常、环境和非功能测试，失败项已修复或明确阻塞。
3. 文书组完成 40 至 60 页技术报告正文及引用、贡献和证据追踪。
4. 手册组完成 8 至 12 页用户手册和管理员/部署/故障文档，非作者可按步骤运行。
5. 功能与 UI 已冻结，演示组在同一 SHA 上完成两轮彩排、15 分钟演示材料和真人出镜 MP4。
6. 软件、报告、手册、PPT、视频和 Group Workload Profile 的版本、术语、数字和限制一致。
7. 所有外部来源、AI 使用、隐私数据、许可证和未完成项已披露；材料集成人、M10 和课程要求的 Review/签收真实完成。

没有证据的项目保持“待完成”或“阻塞”，不通过口头确认关闭 Issue。
