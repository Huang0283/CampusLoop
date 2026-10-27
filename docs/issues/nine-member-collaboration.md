# 九人协作：文书、测试、用户体验与最终演示闭环

M10 陈梓弘继续优化代码/API/UI/SDK、修复缺陷并承担当前 M1 管理工作；其他九人自行认领岗位，建议文书 2、测试 3、用户体验 2、演示 2 人，不预先分配姓名。各人登记姓名、M 编号、岗位分支、独占文件、复核人和本周交付；一个岗位分支一人使用。原五个项目阶段每阶段仍为一周，日常变更是周内增量验收，课程日历日期以 Blackboard 为准。

## 当前文档与分支入口

- 总任务书：[九人协作规划](https://github.com/Huang0283/CampusLoop/blob/main/docs/management/nine-member-collaboration-plan.md)。
- 共用执行流程、T01–T15 功能目录与 U01–U08 真人任务：[升级验收工作流](https://github.com/Huang0283/CampusLoop/blob/main/docs/workflows/version-acceptance.md)。
- 本 Issue 源文：[docs/issues/nine-member-collaboration.md](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/nine-member-collaboration.md)。

四条长期组分支与九条岗位分支由 M10 建立。任务文档在 main 保留一套源稿，在对应组分支也可直接阅读同路径；单组 TASKS.md 从总任务书原文提取本组内容，其他组的具体任务删除，共用规则保留。原旧分支示例停用，旧版 PDF 不作为当前任务依据。

### 文书与技术报告组

- 长期组分支：[`team/reporting`](https://github.com/Huang0283/CampusLoop/tree/team/reporting)。
- [单组任务书](https://github.com/Huang0283/CampusLoop/blob/team/reporting/docs/collaboration/teams/reporting/TASKS.md)；[每日 Git/PR/Review 工作流](https://github.com/Huang0283/CampusLoop/blob/team/reporting/docs/collaboration/teams/reporting/WORKFLOW.md)。

#### R1 需求与报告统稿

- 岗位分支：`work/reporting/report-editor`；PR 目标：`team/reporting`。
- 独占文件范围：docs/submission/technical-report/ 下 introduction.md、requirements.md、testing-and-evaluation.md、conclusions.md、technical-report.md、references.md、report-evidence-index.md、member-contributions.md 及总报告导出 DOCX/PDF。

1. 接收 M10 的范围/版本、R2 的设计实现章节、测试组执行结果和用户组截图索引；列出缺失证据，不凭代码存在推断验收通过。
2. Introduction 按问题、当前做法不足、目标用户、目标、范围/排除项和预期价值写英文正文；Requirements 按需求 ID 写角色、触发条件、输入、成功结果、失败/权限边界、优先级与验收。
3. 需求追踪逐项关联 Issue、代码/契约入口、实际测试、报告章节和完成/部分/未完成状态；单独列游客可浏览和登录后才能操作的边界。
4. Testing 章节由测试组提供事实输入，R1 负责报告正文及数字核对；区分真人/自动化、真实 API/fixture/Mock、规则与模型评估，保留失败与未执行限制。
5. Conclusions 逐项回答目标，写结果依据、剩余限制及未来工作。统稿统一英文术语、编号、交叉引用、参考资料、AI 使用及真实贡献来源，不代签贡献表。
6. 每轮变更检查相关需求、结论、数字和图；汇总 R2 通过 Review 的章节，再导出课程要求格式的总报告，检查正文页数、目录、图表、页码、引用和 Appendix A。

验收与交接：交给 R2 复核事实与引用，测试执行人核对数字，M10 核对技术边界；报告每条关键结论可回到需求、软件 SHA 和证据。R1 只在 R2 PR 合并后引用其章节，不直接改 R2 文件。

#### R2 系统设计与技术证据

- 岗位分支：`work/reporting/system-evidence`；PR 目标：`team/reporting`。
- 独占文件范围：docs/submission/technical-report/ 下 design.md、implementation.md、ai-methods-and-limitations.md、technical-decisions.md、architecture-source-index.md 与 figures/design/ 可编辑图源。

1. 从指定软件 SHA 读取 frontend/src/live/、backend/app/、backend/alembic/、openapi/campusloop.v1.yaml 和相关智能资产；登记实际文件/符号和契约 operation，不只凭 README 写技术结论。
2. Design 写组件职责与数据流、数据库实体/关系/约束、认证会话与对象权限、REST/SDK、消息与后台任务；制作可编辑架构、ER、交易状态和关键时序图，注明正常/失败/权限路径。
3. Implementation 按注册会话、商品上传、报价唯一订单、约定版本/双方完成、通知/举报等实际主链路说明入口、校验、事务/幂等、持久化和失败恢复，引用代码位置而非粘贴大段源码。
4. 智能章节分别写关键词/规则基线、正常/降级、实验候选、NO_GO；对输入/输出、解释、数据来源/许可、独立评估和不能证明的效果写清边界。
5. 技术决策逐项写问题、采用方案、已考虑替代方案、选择依据、代价和实测限制；图源索引注明图 ID、源文件、实现 SHA、支持证据与复核人。
6. 收到 API/状态/权限/AI 或部署变化后更新受影响章节和图，向 R1 提交章节 PR 与可引用结论，给出引用建议但不编辑 R1 总稿/共享索引。

验收与交接：R1 检查术语/章节追踪，M10 复核技术事实；没有来源的图箭头/模型效果不进入正式报告，标为待确认或限制。
### 独立测试与验收组

- 长期组分支：[`team/testing`](https://github.com/Huang0283/CampusLoop/tree/team/testing)。
- [单组任务书](https://github.com/Huang0283/CampusLoop/blob/team/testing/docs/collaboration/teams/testing/TASKS.md)；[每日 Git/PR/Review 工作流](https://github.com/Huang0283/CampusLoop/blob/team/testing/docs/collaboration/teams/testing/WORKFLOW.md)。

#### T1 测试数据与身份权限

- 岗位分支：`work/testing/data-permissions`；PR 目标：`team/testing`。
- 独占文件范围：docs/collaboration/phase-<n>/testing/data-permissions/ 个人用例/日志/数据登记；tests/collaboration/phase-<n>/data-permissions/ 虚构数据和生成复位脚本；本人 changes/<变更ID>/test-data-permissions.md。

1. 接收版本与真实 API 契约，登记虚构卖家 A、买家 B、竞争买家 C、非参与者 D、管理员、游客/过期或禁用场景；列商品/求购/图片/订单数据的覆盖和预期。
2. 维护本岗位 dataset-register.md 与 setup-reset.md，写字段、来源/许可、规模、版本/哈希、生成/清理命令、数据 ID 与用例映射；让 T2/T3 各用独立账号/数据命名空间，复位不覆盖别人的证据。
3. 独立执行 T02 认证/资料和权限边界：注册/登录/退出/刷新/过期、私密字段、普通学生越权管理、非参与者读取私聊/约定/举报证据、对象归属；与 T2 场景共用数据定义但分别保存日志。
4. 接收 M7/M8 已有评估资产/口径，维护独立评估登记，组织标注复核、去重/划分与复算交给 T3 执行；数据授权/样本门禁未到位记阻塞，不能伪造成交或代签。
5. 把可用数据清单与最小使用例交给 T2/T3；运行结果写明真实 API/原型，缺陷交 M10，原失败保留并在修复 SHA 复测；每日写本岗位日报。
6. 每周核对 T2/T3 提交的场景数据映射、脱敏和许可；只汇总数据目录，不修改他们的测试结果、脚本或复测结论。

验收与交接：T2 使用说明独立生成一组可用数据，T3 复核环境隔离/脚本范围；M10 Review 生成脚本。数据工作与权限测试共同构成 T1 工作量，不是只收集几个样例。

#### T2 业务功能与双账号交易

- 岗位分支：`work/testing/business-journeys`；PR 目标：`team/testing`。
- 独占文件范围：docs/collaboration/phase-<n>/testing/business-journeys/ 功能用例/执行/缺陷/复测/日报；tests/collaboration/phase-<n>/business-journeys/；本人 changes/<变更ID>/test-business-journeys.md。

1. 接收 T1 数据清单，自己生成独立业务场景；核对版本 SHA、角色、前置、资源 ID 与预期，缺输入先报阻塞，不让同一测试账号并行互相改状态。
2. 按 T01/T03–T09 的业务部分执行游客市场/筛选、商品生命周期/收藏/求购、图片上传、聊天/报价、唯一订单、约定版本、双方完成、评价、通知/举报；身份与越权专项由 T1 负责，正常角色按钮与状态由 T2 负责。
3. 为正常路径及重复/非法状态/输入失败写可执行用例，特别检查过去时间、单方完成、旧版本确认、取消订单评价、会话重试和刷新持久化；并发脚本与环境由 T3 主责，T2 提供业务不变量。
4. 完成 T10/T11 用户可见智能正常/降级的业务表现，记录解释、声明、未评估限制；模型指标/故障注入由 T3，数据门禁与标注登记由 T1，不能三人重复认领同一产物。
5. 每个缺陷交 M10；修复后重跑原失败与相邻交易，保存失败/成功对照。每个工作日汇总三岗位已 Review 的数据为 testing-summary.md，原始日志各人保管，不能替别人填执行结果。
6. 向用户组交接已通过任务、SHA/数据别名、已知限制和可执行步骤；阻塞的任务不交为可用，用户组可先体验其他通过任务。

验收与交接：T1 复核数据/角色，T3 复核状态不变量与日志；M10 修复代码。T2 维护本轮 changes/<变更ID>/testing-summary.md，T1/T3 提交自己的摘要文件，避免同时编辑共享日报。

#### T3 异机环境、异常与恢复

- 岗位分支：`work/testing/environment-recovery`；PR 目标：`team/testing`。
- 独占文件范围：docs/collaboration/phase-<n>/testing/environment-recovery/ 环境/性能/恢复/复算/日报；tests/collaboration/phase-<n>/environment-recovery/；本人 changes/<变更ID>/test-environment-recovery.md。

1. 接收 T1 数据和 T2 核心步骤，在另一台组员电脑或全新 VM 按手册检出指定 SHA 或包，记录系统/硬件/依赖/端口/包哈希，不复用 M10 未提交文件或日常库。
2. 执行 T14/T15 安装、空审计库迁移/种子幂等、服务健康、重启保留、升级/回滚、数据库与媒体恢复范围；记录首次失败和手册缺步，交用户组改说明、M10 改技术问题。
3. 执行专用环境并发/重复/性能、消息重连、超时/断网/智能不可用等故障注入；并发唯一订单/幂等不变量由 T2 提供，T3 执行脚本并保存实际计数及原始日志。
4. 核对真实 API 契约/SDK 漂移、生产构建和可访问性/跨浏览器等技术检查；T12/T13 的自动化与异常执行在此归口，真人桌面/手机可用性由用户组主责。
5. 接收 T1 已审核数据与 M7/M8 指标命令独立复算，记录版本/划分/参数/原始输出与限制；没有合格授权数据时只复算可复现基线，保留候选 NO_GO。
6. 每日提交本人结果、阻塞和需运维事项，向 T2 提供摘要；修复后复测原环境/异常用例，向用户组提供实际启动命令与故障恢复结果，不编辑用户组手册。

验收与交接：T1 Review 数据/权限，T2 核对业务预期；M10 核对隔离和故障注入范围。另一电脑不足时显式阻塞，不能用本机换目录顶替。
### 用户体验与手册组

- 长期组分支：[`team/user-experience`](https://github.com/Huang0283/CampusLoop/tree/team/user-experience)。
- [单组任务书](https://github.com/Huang0283/CampusLoop/blob/team/user-experience/docs/collaboration/teams/user-experience/TASKS.md)；[每日 Git/PR/Review 工作流](https://github.com/Huang0283/CampusLoop/blob/team/user-experience/docs/collaboration/teams/user-experience/WORKFLOW.md)。

#### U1 学生用户体验与主流程手册

- 岗位分支：`work/user-experience/student-experience`；PR 目标：`team/user-experience`。
- 独占文件范围：docs/submission/manuals/user-manual.md 及 CampusLoop_User_Manual.docx/PDF；docs/collaboration/phase-<n>/experience/student-experience/ 本人任务/截图/问题/日报；本人 changes/<变更ID>/user-student-experience.md。

1. 接收测试组已通过的核心流程和 M10 版本通知；用专用虚构身份执行 U01–U05、U07 的游客/买卖方任务，不更改生产数据或通过改库绕过卡点。
2. 按任务目标自行寻找入口，记录实际点击、完成/失败、迷路/误解/等待、刷新返回和错误恢复；学生界面桌面与手机各检查，截图保留 SHA/路由/角色/数据 ID。
3. 功能错交缺陷 Issue，难找/难懂/遮挡交体验 Issue；反馈给 M10 后记录接受/暂缓/不改及原因，修复后由原执行人重走受影响任务。
4. 写学生用户手册：开始使用、游客浏览、注册/登录/恢复、商品/求购/收藏、聊天/报价、约定/完成/评价、通知/举报和智能限制；每步包含角色、入口、输入、动作、预期与失败恢复。
5. 维护学生截图索引和素材，不使用旧版图冒充新功能；每次改 UI/路由/文案后更新受影响步骤，未变部分注明检查。
6. 周内汇总学生体验、问题复测及手册 PR，交 U2 做非作者操作检查；导出课程 8–12 页用户手册时只写实际功能，不用截图凑页。

验收与交接：U2 照学生手册独立完成一轮，T2 核对功能结果，R1 引用批准截图；U1 不修改管理员/部署手册。

#### U2 管理员体验与部署说明

- 岗位分支：`work/user-experience/admin-deployment`；PR 目标：`team/user-experience`。
- 独占文件范围：docs/submission/manuals/ 下 admin-manual.md、deployment-manual.md、troubleshooting.md；docs/collaboration/phase-<n>/experience/admin-deployment/；本人 changes/<变更ID>/user-admin-deployment.md 与 user-summary.md。

1. 用专用管理员/举报人身份完成 U06，检查列表/详情/处理原因/审计、本人举报反馈和权限提示；不可自建无约束管理接口或读取真实举报证据。
2. 维护管理员手册和相关桌面/手机截图，说明哪些操作可用、状态如何变化、失败/无权如何处理；未交付能力列限制。
3. 与 T3 合作执行 U08：T3 在异机按手册操作并保存结果，U2 观察缺失步骤，写依赖/配置/迁移/种子/启动/端口/健康/停止/升级/恢复及排错；M10 维护实际脚本。
4. 记录演示数据计划：账号角色、商品与状态、数据 ID、初始化/复位入口；生产种子与演示导入实现由 M10，T1 管功能测试数据，U2 不复制私有库或擅改种子。
5. 维护 admin-deployment/ 下截图/页面问题/手册验证记录，Review U1 说明；全局界面问题由首先发现者提交一个 Issue 并关联，不重复建相同卡点。
6. 汇总已 Review 的 U1/U2 体验记录为 user-summary.md；协调 R1/D1 获取正确版本截图，不修改 U1 的正文和截图目录。修复后原执行人复测。

验收与交接：U1 核对可理解性，T3 实际验证安装/恢复命令，M10 确认技术边界；user-summary.md 只有 U2 编辑，U1 交个人摘要。
### 最终演示与提交组

- 长期组分支：[`team/presentation`](https://github.com/Huang0283/CampusLoop/tree/team/presentation)。
- [单组任务书](https://github.com/Huang0283/CampusLoop/blob/team/presentation/docs/collaboration/teams/presentation/TASKS.md)；[每日 Git/PR/Review 工作流](https://github.com/Huang0283/CampusLoop/blob/team/presentation/docs/collaboration/teams/presentation/WORKFLOW.md)。

#### D1 PPT、课程要求与证据来源

- 岗位分支：`work/presentation/slides-evidence`；PR 目标：`team/presentation`。
- 独占文件范围：docs/submission/presentation/ 下 CampusLoop_Final_Presentation.pptx/PDF、slides-source/、slide-evidence-index.md、submission-checklist.md；本人 changes/<变更ID>/presentation-impact.md。

1. 冻结前建立问题/目标/架构/流程/评估/限制/贡献的英文 PPT 草稿和课程提交核对清单，记录正式日期/时区/入口的来源；未知不猜日期。
2. 接收 R1 已 Review 报告、测试实际结果与 U1/U2 截图；每页登记结论、证据、软件 SHA、素材许可和讲述人，图表数字不凭印象填写。
3. 功能/UI 冻结后制作最终可编辑 PPT，支持 15 分钟结构，给 D2 明确每页目标和来源；不替 D2 写已彩排/已录制。
4. 检查术语、编号、可读性、截图、模型 NO_GO/降级声明与报告一致；与 D2 协调删减避免超时但不删真实限制。
5. 参加两轮彩排，按 D2 记录修订 PPT；有新代码/UI 变更先核对影响，受影响图和数字重新取证。
6. 核对最终 PPT/PDF/软件包/手册/视频/贡献表等应交材料存在与版本一致，记录实际文件路径/哈希及课程提交回执接收位置，不代填签名。

验收与交接：D2 检查可讲述性/时长，R1 核对事实，用户组核对截图；D1 唯一编辑 PPT 二进制文件，D2 通过 Issue/个人草稿提建议。

#### D2 讲稿、双账号演示与视频

- 岗位分支：`work/presentation/demo-video`；PR 目标：`team/presentation`。
- 独占文件范围：docs/submission/presentation/ 下 presentation-script.md、demo-runbook.md、rehearsal-log.md、media-manifest.md；demo-notes/ 与视频课程提交位置；本人 changes/<变更ID>/demo-impact.md。

1. 接收 D1 页面结构、T2 通过的业务步骤和 U2 演示数据计划，写英文讲稿与逐环节演示脚本，列 URL、角色别名、数据 ID、动作、预期、讲述与备用动作。
2. 安排 15 分钟总时长，区分真实 API/规则/候选 NO_GO；账号/测试数据为虚构，但操作者和演示记录真实。冻结前只交草稿，不录最终版。
3. 功能/UI 冻结后用双会话演练游客到交易完成评价，展示权限/状态边界与真实降级；失败按证据报 M10，不用预录片段冒充现场成功。
4. 组织第一轮彩排，记录执行人、SHA、实际时长、失败点/Issue；M10 修复、测试组复测后组织第二轮，保留两次结果。
5. 按课程录制演示者出镜 MP4，检查声画/清晰度/播放、字幕或敏感信息；记录文件哈希和软件 SHA，大视频按课程存放，不默认提交 Git。
6. 维护断网/登录失败/智能故障备用脚本与媒体清单，向 D1 交实际时长和提交位置，交 M10 技术核对；不编辑 D1 PPT 二进制。

验收与交接：D1 核对讲稿对应幻灯片，T2 复核演示旅程，U1/U2 核对步骤和截图；只有实际完成才能登记彩排/录像，不能代签。

## 数据边界：真人执行不等于必须使用真实交易数据

测试组用可生成/可复位的虚构账号、商品、求购、消息和订单，经真实接口验证功能。用户组由真实组员扮演游客、买家、卖家和管理员，使用专用虚构数据完成任务并记录真实观察；默认不上传真实学生资料、真实聊天或举报证据。演示商品可以保留在演示环境，但不是模型效果评估数据。M7/M8 独立评估的数据许可、标签/样本门禁、训练/测试隔离保持不变；L0 合成数据只证明结构/规则/降级，不代替合格 L3 真实价格评估，条件不足维持 NOT_EVALUATED/NO_GO。

## 每轮升级的固定交接

1. M10 推送后发布唯一变更 ID、分支/完整软件 SHA、预览地址与 API、角色/虚构数据版本、启动方式、旧/新行为、受影响 T/U 编号、预期、限制、接收目标与反馈日期。不能只写“改好了帮忙看”。[通知模板](https://github.com/Huang0283/CampusLoop/blob/main/docs/collaboration/templates/version-notice.md)。
2. 测试组按角色接收：T1 准备数据/权限，T2 测业务，T3 测异机/异常/恢复。每轮测直接影响、核心旅程与相邻回归，发布候选/阶段验收测全目录。步骤、预期/实际、数据 ID、SHA、执行人和脱敏证据逐条保存；通过/失败/阻塞/未执行/不适用分别统计。写入测试只用审计数据库、测试媒体卷和 Redis DB14/15，不动日常账号库。
3. 测试组每个工作日向 M10 汇报数量、故障/严重度/Issue、证据、复测、所需运维协助与下一步；严重故障立即报。M10 修复并给新 SHA，原执行人重测原用例和回归；保留旧失败，不用 PR 自动关闭代替复测。[测试与缺陷模板](https://github.com/Huang0283/CampusLoop/blob/main/docs/collaboration/templates/test-feedback.md)。
4. 已通过的核心流程交用户组；用户组真实登录执行 U01–U08，记录完成/失败、实际路径、难找入口、误解提示、恢复/刷新、桌面/手机体验与截图。功能错建缺陷、难用建体验 Issue，M10 逐项接受/暂缓/不采纳并给理由；修复后原体验人再走任务。[体验反馈模板](https://github.com/Huang0283/CampusLoop/blob/main/docs/collaboration/templates/user-task-feedback.md)。
5. 文书组更新受影响需求/设计/实现/数字/限制；用户组更新手册/截图，未影响章节也说明已核对。软件基线 SHA 与材料提交 SHA 分开写，旧截图标过期，不把候选/Mock/规则说成真实上线模型。
6. 组内 Review 后个人 PR 进 team/*，组汇总 PR 进通知指定的 phase<n>/integration；阶段已收口后的日常材料 PR 可进 main。M10 技术复验，材料集成人核对引用、范围和贡献；功能/UI 冻结后演示组才做最终 PPT、两轮彩排和真人出镜 MP4。

## 功能清单：不能漏掉

完整逐步预期见工作流第 5 节。当前路由/接口新增后同步补目录，能力未实现不得标通过，发布候选必须全部核对：

- T01 游客商品/求购浏览、搜索筛选排序分页、详情、返回/刷新、空/失效资源及登录动作边界。
- T02 注册登录退出、错误/禁用/过期会话、刷新恢复、深链接返回、资料与隐私字段。
- T03 商品发布/编辑/上下架/归属、自购限制、字段/价格/文本和图片上传及持久化。
- T04 收藏/取消、我的数据与求购发布/编辑/关闭、重复操作和非所有者拒绝。
- T05 双账号聊天、消息重试/重连/补拉/去重/顺序、会话隐私和报价状态链。
- T06 唯一订单、报价接受/并发竞争/重复请求、取消/争议及访问权限。
- T07 约定未来时间/地点/版本、旧确认失效、双方确认/完成、刷新重启保留。
- T08 完成后双方各一次评价、非法状态拒绝；通知未读/已读/全部已读及跳转。
- T09 买卖方举报原因/对象、本人举报、证据隐私、管理端实际审核动作与审计。
- T10 搜索/匹配硬约束、解释/排序/无结果、超时/索引未就绪/服务关闭降级。
- T11 价格/信誉/风险输入输出、区间/版本/声明、人工覆盖和 NO_GO 边界。
- T12 全路由适用的加载/成功/空/失败/无权状态，桌面/手机、键盘/焦点/弹窗/布局。
- T13 路由别名、404/403/无效资源、慢请求/服务不可达、刷新/返回恢复。
- T14 另一电脑/新 VM 空库安装/迁移/种子/健康/重启/升级、已交付 EXE 与主旅程。
- T15 对象权限与安全、专用环境并发/性能/依赖失败、数据库与媒体恢复范围。

用户组任务分别是 U01 游客寻找商品、U02 买家登录咨询报价、U03 卖家发布管理、U04 双方约定完成评价、U05 求购/智能解释降级、U06 举报/管理员、U07 手机与失败恢复、U08 新人按手册启动。前置不通写阻塞，已通任务可并行执行；具体步骤见工作流第 6 节。

## 文件、分支与工作量边界

一个文件一个编辑人：R1 总稿/引用，R2 设计/图源；T1 数据/权限，T2 业务并汇总 testing-summary.md，T3 环境/异常/恢复/复算；U1 学生手册，U2 管理/部署并汇总 user-summary.md；D1 PPT，D2 讲稿/彩排/视频。共享摘要由指定人汇总，其余人交个人文件；跨组 Review 用评论，不直接覆盖别人目录。生产功能/契约/SDK/迁移问题由 M10 技术 PR 修复，材料 PR 不改生产代码。

测试共享目录：T1 汇总数据/许可/划分，T2 汇总用例/执行/缺陷/复测与证据索引，T3 维护环境和非功能结果；个人原始结果由实际执行人保管。用户组根目录截图/页面问题/演示数据/手册验证索引由 U2 汇总，U1 交自己的链接。R1 唯一维护 testing-and-evaluation.md，测试组只提供已核对的事实输入。各文件归属详见单组任务书，转交必须先登记，不能两个岗位同时改同一汇总文件。

依赖顺序为 M10 基线 → T1 数据与规则 → T2/T3 独立执行 → 用户组真人任务 → 报告/手册证据更新 → 冻结后的演示。数据、用例与文书草稿可并行，接收缺失写阻塞。数据岗不只收样例还做权限测试与评估复核，环境岗还做异常和独立复算；每周按实际执行/材料/Review 核对工作量，失衡时在 Issue 明确转交独立任务和文件，不假定三个岗位天然完全等量。

禁止 push main/共享组分支、force-push、共享 rebase、提交密码/真实隐私、整目录覆盖或 git add . 混入无关文件。个人 PR 需写任务 ID、软件 SHA、文件、步骤/命令/结果、证据、遗留、接收人；同组非作者 Review 后合并。组汇总阶段待 M10 技术确认，自己修复不能冒充别人已复测。

main 和四条 team/* 长期保留；work/* 是本轮按岗位持续使用的分支，认领人仍使用时不删。旧任务/修复/阶段分支只有对应 PR 已合并、主干/标签可找成果、无独有提交/开放 PR/工作树或其他人依赖时才可删除；本轮不批量删远端分支。旧文档清理不删除原课程要求、历史验收证据或本地未提交文件。

## 关闭条件

- [ ] 九人自选岗位、文件负责人/复核人与分支已登记，每人有真实日志和 PR。
- [ ] 测试数据可复位，完整功能目录有实际结果；失败/阻塞单列，修复由原执行人复测。
- [ ] 真人用户任务、手册/截图和反馈处置完成，暂缓项有理由/Owner/检查日期。
- [ ] 英文技术报告正文 40–60 页、用户手册 8–12 页及课程格式/引用符合原要求，软件/报告/手册/测试的基线一致。
- [ ] 功能/UI 冻结后两轮彩排、15 分钟真人出镜 MP4、PPT、贡献表及课程提交清单真实完成。
- [ ] 异机/新 VM 按手册复现；许可、模型 NO_GO、测试/恢复边界和未完成项如实披露。
- [ ] 各组 PR/Review/范围验收真实完成，课程实际截止/提交人/入口和 Blackboard 回执登记；GitHub push 不等于课程已提交。

本 Issue 不因文档推送、代码合并或到周末而关闭；不得代签成员 Review、人工测试、贡献表或数据许可。
