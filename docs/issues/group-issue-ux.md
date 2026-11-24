# [用户体验组] U1/U2 学生与管理员体验、手册和截图交接

<!-- final-environment-20261124:start -->
## 2026-11-24 最终协作环境与统一软件基线

**当前软件基线：`81bacfc1d8b170baf7413950cc6a180abc7f44ea`。后文旧 SHA/5198 等只保留为历史记录，不能继续作为本轮启动指引。** 这是固定协作入口，不代表所有组员任务已经验收完成。各人材料分支继续原分工；软件版本与材料 commit 分开写。

| 用途 | 页面 / API | 账号和数据 |
|---|---|---|
| 日常展示、最终截图、查看双演示账号历史 | http://127.0.0.1:5174/market / 8001；后台 `/admin` | 原商城＋两演示账号的15笔合成交易历史 |
| T2、U1/U2正式新建交易/举报/处罚等写入验收 | http://127.0.0.1:5184/market / 18024；后台 `/admin` | `business/run2`；T2交接的A/B等身份，R/S管理员 |
| T1权限验收 | http://127.0.0.1:5185/market / 18025；后台 `/admin` | `permission/run2`，其独立A/B等身份及R/S |
| T3本人异机/新VM验收 | http://127.0.0.1:5186/market / 18026 | `environment/run2`，由T3在目标机器实际准备 |

这些 localhost 都是各自电脑，GitHub不共享运行中的数据库。三套已存在环境保留原数据，修复后的应用代码一致；不再新增5198/5194/5197给组员使用。**包含首次依赖、固定版本检出、翻译模型准备、启动/升级命令与凭据位置的完整说明：[最终环境操作单](https://github.com/Huang0283/CampusLoop/blob/main/docs/collaboration/final-environment-20261124.md)。**

日常启动：`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -NoBrowser`。T2/U组写入使用 `python scripts/audit_env.py upgrade --namespace business --run-id run2`，随后另一终端 `python scripts/audit_env.py ui --namespace business --run-id run2`；首次没有该批次才将 upgrade 换 start。T1把business换permission，T3换environment。用已安装后端依赖的Python 3.12，不用缺依赖的系统Python。

首次商品翻译模型：`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-translation.ps1 -Prepare`；以后审计/日常启动会调用商品翻译服务。右上角中英切换，品牌/型号/容量/用户名/邮箱保留原值；图片内文字不会自动改变。私聊/举报/申诉原文不发送给公开商品翻译服务。

日常双账号：`demo.seller@example.invalid`、`demo.buyer@example.invalid`；公开合成密码均为 `CampusDemo@2026`。**这不是5184/5185的登录身份。** 审计R/S从本机 `.codex-tmp/audit/<namespace>/run2/admins.json` 获取；A/B等从该目录 `data-state/t1-<namespace>-run2.json` 获取；随机凭据不贴公开Issue。新机器先完成T1数据导入再测试，不把只有管理员的空库当完整环境。

维护者本机已保留数据升级日常/T1/T2，核对API/Worker关键源码和健康/搜索服务；**不等于组员自己的机器已升级**。本轮可引用回归：后端319条通过；追加封禁/锁专项23条（与全套有重叠，不能相加）；T1包18条；双语页面11条；商品/私密展示6条。[原始回归证据](https://github.com/Huang0283/CampusLoop/tree/main/docs/evidence/phase-5/management-quality/final-20261124)。自动化回归、合成演示历史、组员真人体验和独立模型效果分别标识。

### 本组现在如何接收

U1/U2：查看现成双账号历史/普通截图用5174；正式新建交易、举报、禁用/恢复及故障恢复用T2的5184隔离环境，先向T2接收角色/对象/已通过步骤。不要拿日常演示账号登录5184。主8–12页手册本身包含安装、配置、运行、使用；U2提供已核步骤，详细部署文档另附，不能把主手册安装内容全部移走。截图写语言、角色、视口、SHA；用户名/邮箱和图像内文字保留原文不等于系统漏翻。

<!-- final-environment-20261124:end -->

关联：总导航 [#143](https://github.com/Huang0283/CampusLoop/issues/143)、总协作 [#129](https://github.com/Huang0283/CampusLoop/issues/129)、测试组Issue https://github.com/Huang0283/CampusLoop/issues/145。长期分支 `team/user-experience`；个人分支 `work/user-experience/student-experience`、`work/user-experience/admin-deployment`。个人 PR 先入组分支，组汇总 PR 再入 `main`。已有认领沿用评论，尚未认领者自行登记。

本组负责让未参与开发的人看懂并能完成任务。截图和手册必须来自标明 SHA 的真实页面；模拟视口要标明“浏览器模拟”，不能写成真机测试。课程规定学生用户手册 8–12 页；管理员、部署和故障说明作为补充材料，不擅自声称有课程页数要求。

## 当前复用和减负安排

软件基线为main@c93d95cfc675364faf048474021fc5fcbb4a3ef8（PR #152）。账号、原商城与隔离测试环境见[测试组 #145](https://github.com/Huang0283/CampusLoop/issues/145)。T2现有已接收环境继续用，双账号稳定副本用于补成交/聊天/通知/举报/申诉历史；不要求换环境重来。

U1/U2直接接收T2确认的稳定场景，不再另造48件展示商品或重复创建历史。demo-data-plan.md只登记使用哪套现有数据、对象ID、哪些操作会改变状态、交接时还可演示什么；原T1数据或双账号都可用，按覆盖补缺，不凑数量。

截图以覆盖实际操作、桌面/手机、异常和后台联动为准，取消18/14/32等固定截图张数；已有合格图直接引用，没有场景不能拿重复截图充数。软件或页面变化时只补受影响截图，旧图保留原SHA。U1/U2的真人任务记录、非作者手册验证和课程页数要求仍保留。

正式正文只维护LaTeX＋同版PDF，不再写一份相同Markdown/DOCX手册；已有原图只维护一份。两个账号不是两位真人受访者，预置记录不是体验已经完成。

## 路径、个人记录与接收规则

以下 `P` 指 `docs/collaboration/phase-5`，`C` 指 `docs/collaboration/phase-5/changes/C20261103-ADMIN`；不是让组员创建名字叫P或C的目录。`F` 指 `tests/collaboration/phase-5/data-permissions`。沿用已存在的文件，不另建同内容副本。软件验收基线为 `main@c93d95cfc675364faf048474021fc5fcbb4a3ef8`；材料commit另记，代码变化由M10另发新SHA。

每人自己的岗位目录下分别交 `task-log.md`（实际做了什么、依据/PR链接）、`delivery-checklist.md`（哪些文件齐了、哪些还缺、非作者Review链接）；测试三岗另交 `daily-report.md`（当天计划数和五类结果、阻塞、下一步）。它们用于交接和贡献追溯，不代替测试日志、正文或学校签名。每份文件只有一位编辑负责人，其他组引用原链接；不得互相复制成第二份。总索引/本轮摘要只列原文件链接和变化，不要求把同一段过程复制进多份日志。

交接消息必须包含：交付人/接收人、软件SHA、材料PR/commit、文件链接、数据版本、已通过/失败/阻塞/未执行、接收人第一步和预期、缺口负责人、预计回复日期。接收人实际尝试后回复“接收/部分接收/退回补充＋实际结果”；只发“做完了”不算交接。个人PR→本组team分支→非作者Review→组汇总PR→main，当前不再投已关闭的阶段分支。组联络人为R1/T2/U2/D2；学校提交、签名、真人体验和Review须由实际人员完成。


## U1：学生体验与用户手册

岗位分支 `work/user-experience/student-experience`。在桌面 1440×900 和手机 390×844 执行六项学生任务：游客找商品、登录后咨询/报价、卖家发布管理、双方约定完成评价、求购/智能解释降级、手机操作及失败恢复。记录真实用户任务结果和卡点，不把两方登录会话误计为两名独立受访者。

| 交付物 | 里面放什么 | 为什么要交 / 交给谁 |
|---|---|---|
| `docs/submission/manuals/latex/user-manual.tex 及学生章节/图片` | 12小节英文学生操作说明：准备、登录、找商品、发布、聊天报价、订单、约定、完成评价、异常等 | U1唯一维护正式正文，学生照着用；不再维护同内容Markdown或DOCX |
| `docs/submission/manuals/CampusLoop_User_Manual_Overleaf.zip` | user-manual.tex主入口、样式、章节、图片、引用、README编译说明 | U1打包完整工程，非作者导入Overleaf复编；U2只协助统一样式不接管学生正文 |
| `docs/submission/manuals/CampusLoop_User_Manual.pdf` | 与ZIP同一commit的8–12页学生手册 | 课程用户手册提交和直接阅读；交U2/R1/D1 |
| `P/experience/student-experience/task-records/` | U01/U02/U03/U04/U05/U07各桌面/手机一份，共12份真人任务记录 | 记录哪里找不到/看不懂，供U2/R1总结体验，失败交M10 |
| `P/experience/student-experience/screenshots/、screenshot-index.csv` | 覆盖学生手册关键步骤、桌面/手机和失败恢复的真实图，注明角色/视口/SHA/用途；已有图复用 | U2汇入总索引，R1/D1引用；取消固定张数，不重复拍同一页面凑数 |
| `P/experience/student-experience/feedback.md、manual-verification.md` | 学生观察、问题Issue与U2非作者照手册操作结果 | 证明手册可用、页面问题已反馈；原体验人负责修后确认 |
| `C/user-student-experience.md` | 本轮改了哪些学生步骤/图片、通过/失败/阻塞和待处理项 | 交U2汇总、R1/D1判断是否能引用 |

个人日志/清单放 `P/experience/student-experience/`。本轮特别复查实时搜索、同人多商品会话、取消预订返回市场、上传头像、中文提示，以及商品被治理/卖家被禁用后的学生可见结果。

## U2：管理员体验、部署说明与组内汇总

岗位分支 `work/user-experience/admin-deployment`。独立完成管理员举报处置任务（桌面、手机），并准备管理员手册、部署手册和故障说明；收集 U1 的学生资料形成统一索引。管理员流程要区分“查看举报并处理”和“另行禁用用户/治理商品”，不能暗示举报处理会自动触发这些动作。当前版本未提供的仲裁、公告或待审核功能标成暂未支持。

| 交付物 | 里面放什么 | 为什么要交 / 交给谁 |
|---|---|---|
| `docs/submission/manuals/latex/admin-manual.tex` | 管理员合法身份取得、登录入口、用户/商品/举报/订单/日志、处理原因、前台回看及限制 | 给管理员按真实能力操作；U1复核说明，T2核业务事实 |
| `docs/submission/manuals/latex/deployment-manual.tex、troubleshooting.tex` | 依赖、启动脚本、健康检查、卷保留、停止恢复及原计划至少10项常见故障 | 让非作者复现运行；T3实际照做，M10核技术步骤 |
| `docs/submission/manuals/latex/README.md、共享样式与独立章节/图片` | 每个主入口、Overleaf上传、编译器、引用工具、相对路径、字体方案 | U2维护共享样式；不能覆盖U1章节或源图，每个工程可在干净项目复编 |
| `docs/submission/manuals/ 下管理员/部署/故障说明工程ZIP与对应PDF` | 与同一commit对应的完整源工程、最终阅读文件 | U2单独导出补充材料，不并入学生手册凑8–12页；交R1/D1/M10 |
| `P/experience/admin-deployment/U06-desktop.md、U06-mobile.md` | 举报人提交→管理员处理→前台回看，扩展用户管理、商品治理、订单和日志 | 两份真人任务记录里扩展步骤，保留原有任务ID不重复计数 |
| `P/experience/admin-deployment/U08-install-observation.md、student-manual-review.md` | 旁观T3照部署说明安装的卡点；本人独立照学生手册走流程的结果 | 让U1/U2修正缺步，交R1记录可用性限制 |
| `P/experience/admin-deployment/screenshots/、screenshot-index.csv` | 覆盖举报处理回看、用户禁用/恢复、商品治理/恢复及桌面/手机的实际图 | 证明后台前台联动，引用T2可用证据；取消固定张数，缺少阶段应补真实操作证据 |
| `P/experience/admin-deployment/feedback.md` | 管理员/安装体验问题、严重度、Issue、处置和原体验人复测 | 交M10处理，交U2组汇总 |
| `P/experience/screenshot-index.md` | U1/U2所有图的原文件链接、角色、视口、SHA与用途 | U2唯一维护，R1/D1共用证据定位而非复制后各改 |
| `P/experience/page-issues.md` | 页面/文案问题总索引、复现、Issue和处置 | 给M10定位问题，给R1说明限制 |
| `P/experience/demo-data-plan.md` | 现有稳定副本/版本、角色/对象ID、演示顺序、已消耗场景和复位限制，链接原数据登记 | 交D2/T1/M10接收，不另造48件商品，不复制日常数据库；公开演示凭据统一引用#145，真人凭据不入材料 |
| `P/experience/manual-verification.md` | T3/U1/U2非作者验证的结果索引和证据链接 | R1/M10确认不是作者自己说能用 |
| `C/user-summary.md` | 本轮学生/管理员任务通过/失败/阻塞、截图/手册PR、待M10项 | U2统一交R1/D1/D2/M10，各接收人回复收到或缺什么 |

个人日志/清单放 `P/experience/admin-deployment/`。后台不提供求购主页/仲裁接口，举报处理不自动处罚；账号取得和使用条件见测试组Issue的专用环境说明。

正式报告和手册使用可编译LaTeX/Overleaf工程及PDF；内部记录继续Markdown/CSV。真人头像、邮箱、私聊和举报附件需脱敏，真实凭据和令牌不进仓库/截图；公开合成账号只引用#145，不再另造账号清单。

## 交接顺序

1. T2/T3 将已通过的用户旅程、软件 SHA、准备条件和限制交 U1/U2；手册编写可以先做草稿，但未经独立验证的步骤标为待验证。
2. U1 把学生正文、任务结果和截图索引交 U2；U2回复文件/证据是否齐全，核对统一目录、样式和索引；学生手册仍由U1导出，U2独立导出管理员/部署材料。
3. T3 按部署手册独立运行；U1按管理员手册走管理员任务；T2核对举报状态与业务结果；M10核对技术和权限。问题回原作者修订，复测结果记录在 `P/experience/manual-verification.md`。
4. U2 将可引用资料包（SHA、手册 PR、PDF/ZIP、截图索引、任务结果、限制）交 R1/R2、D1/D2、M10，各接收人明确回复收到或列缺项。
5. 个人 PR 必须有非作者 Review；组联络人汇总进 `team/user-experience`，再向 `main` 提组 PR。

## 2026-11-24 手册可读性与证据补充

- U1/U2 在各自 LaTeX 工程的统一样式入口中维护版式，不在不同章节各自改字体、字号、标题、图表和间距；学生手册与管理员/部署补充材料风格一致，但分别保持各自工程与页数范围。
- 手册正文用简明、准确、作者本人能讲清的语言写操作步骤；专业词第一次出现时解释，不复制无法解释的 AI 段落。不得用或编造 Survey/问卷作为用户需求或手册验收证据，继续使用获准的 U01-U08 真人任务记录。
- 每张操作截图须对应真实软件 SHA、页面/角色/视口和步骤，在 PDF 实际阅读尺寸清晰可辨；检查关键文字、按钮、错误提示没有被裁掉、遮挡或缩成难辨小图。截图索引注明对应的手册小节/步骤及复核结果，旧版截图标明版本或替换。
- U1/U2 非作者 Review 实际照手册执行抽查任务，并检查关键段落是否准确易懂、作者能解释；卡点和复测写入现有 `manual-verification.md`、任务记录或反馈文件，不另造重复日志。

本轮验收门禁：非作者按当前SHA实际执行抽查；最终 PDF 中全部必要截图清晰无遮挡且步骤/角色/视口对应正确；手册样式统一、术语解释完整、作者能够口头说明关键步骤。任一未满足时标为未完成并记入现有 Review/验证记录。

## 完成条件

- [ ] U1六项学生任务、两个视口结果和学生手册可追溯到软件 SHA。
- [ ] U2管理员举报任务及手册只描述当前真实支持能力，未支持功能明确标注。
- [ ] 学生手册 PDF 为 8–12 页；管理员/部署补充材料完整，不虚构课程要求。
- [ ] Overleaf ZIP 可由非作者导入编译，PDF与源码一致，截图索引无过期图。
- [ ] T3/U1完成非作者手册验证；缺陷有 Issue、修订和复测记录。
- [ ] U1/U2手册各自样式统一、语言清楚；非作者能按步骤完成抽查，作者能解释关键内容
- [ ] 所有引用截图和说明图对应当前SHA且清晰无遮挡，索引含页面、角色、视口、手册步骤及人工检查结果；没有用Survey/问卷替代真人任务

仓库中的[九人协作旧规划](https://github.com/Huang0283/CampusLoop/blob/main/docs/management/nine-member-collaboration-plan.md)及docs/issues分组文档保留作历史参考；当前任务、数量调整和交接按本Issue执行，不从旧规划额外追加已取消的造数、重复正文或重复材料任务。

## 分组导航

| 小组 / 各自岗位 | 详细任务 Issue | 本地说明 |
|---|---|---|
| 文书组 R1 / R2 | [#144](https://github.com/Huang0283/CampusLoop/issues/144) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-literature.md) |
| 测试组 T1 / T2 / T3 | [#145](https://github.com/Huang0283/CampusLoop/issues/145) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-testing.md) |
| 用户体验组 U1 / U2 | [#146](https://github.com/Huang0283/CampusLoop/issues/146) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-ux.md) |
| 演示组 D1 / D2 | [#147](https://github.com/Huang0283/CampusLoop/issues/147) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-presentation.md) |
