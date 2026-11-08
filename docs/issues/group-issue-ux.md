# [用户体验组] U1/U2 学生与管理员体验、手册和截图交接

关联：总导航 [#143](https://github.com/Huang0283/CampusLoop/issues/143)、总协作 [#129](https://github.com/Huang0283/CampusLoop/issues/129)、测试组Issue https://github.com/Huang0283/CampusLoop/issues/145。长期分支 `team/user-experience`；个人分支 `work/user-experience/student-experience`、`work/user-experience/admin-deployment`。个人 PR 先入组分支，组汇总 PR 再入 `main`。姓名由九人自行认领。

本组负责让未参与开发的人看懂并能完成任务。截图和手册必须来自标明 SHA 的真实页面；模拟视口要标明“浏览器模拟”，不能写成真机测试。课程规定学生用户手册 8–12 页；管理员、部署和故障说明作为补充材料，不擅自声称有课程页数要求。

## 路径、个人记录与接收规则

以下 `P` 指 `docs/collaboration/phase-5`，`C` 指 `docs/collaboration/phase-5/changes/C20261103-ADMIN`；不是让组员创建名字叫P或C的目录。`F` 指 `tests/collaboration/phase-5/data-permissions`。沿用已存在的文件，不另建同内容副本。软件验收基线为 `main@5fdeb0a8501d4503cf8504f364a4cb945361d7ff`；材料commit另记，代码变化由M10另发新SHA。

每人自己的岗位目录下分别交 `task-log.md`（实际做了什么、依据/PR链接）、`delivery-checklist.md`（哪些文件齐了、哪些还缺、非作者Review链接）；测试三岗另交 `daily-report.md`（当天计划数和五类结果、阻塞、下一步）。它们用于交接和贡献追溯，不代替测试日志、正文或学校签名。每份文件只有一位编辑负责人，其他组引用原链接；不得互相复制成第二份。

交接消息必须包含：交付人/接收人、软件SHA、材料PR/commit、文件链接、数据版本、已通过/失败/阻塞/未执行、接收人第一步和预期、缺口负责人、预计回复日期。接收人实际尝试后回复“接收/部分接收/退回补充＋实际结果”；只发“做完了”不算交接。个人PR→本组team分支→非作者Review→组汇总PR→main，当前不再投已关闭的阶段分支。组联络人为R1/T2/U2/D2；学校提交、签名、真人体验和Review须由实际人员完成。


## U1：学生体验与用户手册

岗位分支 `work/user-experience/student-experience`。在桌面 1440×900 和手机 390×844 执行六项学生任务：游客找商品、登录后咨询/报价、卖家发布管理、双方约定完成评价、求购/智能解释降级、手机操作及失败恢复。记录真实用户任务结果和卡点，不把两方登录会话误计为两名独立受访者。

| 交付物 | 里面放什么 | 为什么要交 / 交给谁 |
|---|---|---|
| `docs/submission/manuals/latex/user-manual.tex 及学生章节/图片` | 12小节英文学生操作说明：准备、登录、找商品、发布、聊天报价、订单、约定、完成评价、异常等 | U1唯一维护正式正文，学生照着用；不再维护同内容Markdown或DOCX |
| `docs/submission/manuals/CampusLoop_User_Manual_Overleaf.zip` | user-manual.tex主入口、样式、章节、图片、引用、README编译说明 | U1打包完整工程，非作者导入Overleaf复编；U2只协助统一样式不接管学生正文 |
| `docs/submission/manuals/CampusLoop_User_Manual.pdf` | 与ZIP同一commit的8–12页学生手册 | 课程用户手册提交和直接阅读；交U2/R1/D1 |
| `P/experience/student-experience/task-records/` | U01/U02/U03/U04/U05/U07各桌面/手机一份，共12份真人任务记录 | 记录哪里找不到/看不懂，供U2/R1总结体验，失败交M10 |
| `P/experience/student-experience/screenshots/、screenshot-index.csv` | 至少18张真实截图及图编号、页面、角色、视口、SHA、任务/手册步骤 | U2汇入总索引，R1/D1据此引用 |
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
| `P/experience/admin-deployment/screenshots/、screenshot-index.csv` | 原10张图＋用户禁用/恢复、商品下架/恢复至少4张，共最低14张不同截图 | 证明后台和前台真实联动；全组至少32张，不靠改名重复计数 |
| `P/experience/admin-deployment/feedback.md` | 管理员/安装体验问题、严重度、Issue、处置和原体验人复测 | 交M10处理，交U2组汇总 |
| `P/experience/screenshot-index.md` | U1/U2所有图的原文件链接、角色、视口、SHA与用途 | U2唯一维护，R1/D1共用证据定位而非复制后各改 |
| `P/experience/page-issues.md` | 页面/文案问题总索引、复现、Issue和处置 | 给M10定位问题，给R1说明限制 |
| `P/experience/demo-data-plan.md` | demo命名空间、48件基础展示商品、角色/场景、受审复位步骤，不含凭据 | 交D2/T1/M10准备演示数据，不能复制日常数据库 |
| `P/experience/manual-verification.md` | T3/U1/U2非作者验证的结果索引和证据链接 | R1/M10确认不是作者自己说能用 |
| `C/user-summary.md` | 本轮学生/管理员任务通过/失败/阻塞、截图/手册PR、待M10项 | U2统一交R1/D1/D2/M10，各接收人回复收到或缺什么 |

个人日志/清单放 `P/experience/admin-deployment/`。后台不提供求购主页/仲裁接口，举报处理不自动处罚；账号取得和使用条件见测试组Issue的专用环境说明。

正式报告和手册使用可编译 LaTeX/Overleaf 工程及 PDF；内部记录可用 Markdown/CSV。所有用户头像、邮箱、私聊、举报附件需脱敏；不得把凭据放仓库或截图。

## 交接顺序

1. T2/T3 将已通过的用户旅程、软件 SHA、准备条件和限制交 U1/U2；手册编写可以先做草稿，但未经独立验证的步骤标为待验证。
2. U1 把学生正文、任务结果和截图索引交 U2；U2回复文件/证据是否齐全，核对统一目录、样式和索引；学生手册仍由U1导出，U2独立导出管理员/部署材料。
3. T3 按部署手册独立运行；U1按管理员手册走管理员任务；T2核对举报状态与业务结果；M10核对技术和权限。问题回原作者修订，复测结果记录在 `P/experience/manual-verification.md`。
4. U2 将可引用资料包（SHA、手册 PR、PDF/ZIP、截图索引、任务结果、限制）交 R1/R2、D1/D2、M10，各接收人明确回复收到或列缺项。
5. 个人 PR 必须有非作者 Review；组联络人汇总进 `team/user-experience`，再向 `main` 提组 PR。

## 完成条件

- [ ] U1六项学生任务、两个视口结果和学生手册可追溯到软件 SHA。
- [ ] U2管理员举报任务及手册只描述当前真实支持能力，未支持功能明确标注。
- [ ] 学生手册 PDF 为 8–12 页；管理员/部署补充材料完整，不虚构课程要求。
- [ ] Overleaf ZIP 可由非作者导入编译，PDF与源码一致，截图索引无过期图。
- [ ] T3/U1完成非作者手册验证；缺陷有 Issue、修订和复测记录。

岗位任务细节沿用[九人协作与最终交付规划](https://github.com/Huang0283/CampusLoop/blob/main/docs/management/nine-member-collaboration-plan.md)；本组Issue中的本轮扩展、LaTeX格式和当前交接方式优先于旧计划中对应表述。

## 分组导航

| 小组 / 各自岗位 | 详细任务 Issue | 本地说明 |
|---|---|---|
| 文书组 R1 / R2 | [#144](https://github.com/Huang0283/CampusLoop/issues/144) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-literature.md) |
| 测试组 T1 / T2 / T3 | [#145](https://github.com/Huang0283/CampusLoop/issues/145) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-testing.md) |
| 用户体验组 U1 / U2 | [#146](https://github.com/Huang0283/CampusLoop/issues/146) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-ux.md) |
| 演示组 D1 / D2 | [#147](https://github.com/Huang0283/CampusLoop/issues/147) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-presentation.md) |
