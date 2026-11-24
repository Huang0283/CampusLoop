# [演示组] D1/D2 PPT、讲稿、彩排、视频与最终提交

关联：总导航 [#143](https://github.com/Huang0283/CampusLoop/issues/143)、总协作 [#129](https://github.com/Huang0283/CampusLoop/issues/129)、其他组见#143导航。长期分支 `team/presentation`；个人分支 `work/presentation/slides-evidence`、`work/presentation/demo-video`。个人 PR 先入组分支，组汇总 PR 再入 `main`。已有认领沿用评论，尚未认领者自行登记。

课程要求包括一次 15 分钟项目演示、PowerPoint 和真人出镜 MP4；至少三次 Project Update（计划四次）。这些是课程交付，其他彩排清单与证据索引是团队为保证可复现而增加的工作要求。演示内容必须反映冻结版本的真实能力、测试结论和限制；不能把计划用例说成通过，不能用自动录屏替代真人讲解。

## 2026-11-05 双账号演示直接复用

软件基线更新为 main@c93d95cfc675364faf048474021fc5fcbb4a3ef8（PR #152），双账号数据版本campusloop-demo-v1。登录及环境统一见[测试组 #145](https://github.com/Huang0283/CampusLoop/issues/145)顶部；公开合成演示凭据可用于本机演示，真人凭据和会话令牌不得共享。

D1/D2从T2/U2接收现有已确认的稳定副本及演示步骤，不要求从已接收环境迁到另一副本；直接用现成15笔成交、聊天、举报/警告/申诉作场景，不需要再造一套历史。原商城5174中的双账号商品与原市场在一起；有处罚或改状态的彩排用隔离副本，保留后续演示场景。三个角色使用独立浏览器配置，多个无痕窗口可能共享身份。

视频里明确“合成演示数据”，不说成真实用户交易、已通过测试数或模型训练样本。价格建议的在售标价参考与成交训练样本分别说明。沿用原操作单、讲稿和彩排记录，不增加一套材料；真人出镜、两轮彩排和真实Review仍由组员完成。

## 路径、个人记录与接收规则

以下 `P` 指 `docs/collaboration/phase-5`，`C` 指 `docs/collaboration/phase-5/changes/C20261103-ADMIN`；不是让组员创建名字叫P或C的目录。`F` 指 `tests/collaboration/phase-5/data-permissions`。沿用已存在的文件，不另建同内容副本。软件验收基线为 `main@c93d95cfc675364faf048474021fc5fcbb4a3ef8`；材料commit另记，代码变化由M10另发新SHA。

每人自己的岗位目录下分别交 `task-log.md`（实际做了什么、依据/PR链接）、`delivery-checklist.md`（哪些文件齐了、哪些还缺、非作者Review链接）；测试三岗另交 `daily-report.md`（当天计划数和五类结果、阻塞、下一步）。它们用于交接和贡献追溯，不代替测试日志、正文或学校签名。每份文件只有一位编辑负责人，其他组引用原链接；不得互相复制成第二份。总索引/本轮摘要只列原文件链接和变化，不要求把同一段过程复制进多份日志。

交接消息必须包含：交付人/接收人、软件SHA、材料PR/commit、文件链接、数据版本、已通过/失败/阻塞/未执行、接收人第一步和预期、缺口负责人、预计回复日期。接收人实际尝试后回复“接收/部分接收/退回补充＋实际结果”；只发“做完了”不算交接。个人PR→本组team分支→非作者Review→组汇总PR→main，当前不再投已关闭的阶段分支。组联络人为R1/T2/U2/D2；学校提交、签名、真人体验和Review须由实际人员完成。

## 2026-11-24 演示图表与讲稿可读性补充

- D1统一检查每页字体和字号在实际投影/播放视图下可读，图表、标签、单位、图例、颜色对比和来源齐全；页面拥挤时拆页或简化信息，不把报告大图缩成无法阅读的缩略图。最终PPT和导出的PDF逐页检查裁切、重叠和文字遮挡，并记录在已有 `slide-review.md`。
- 技术图优先复用R2经源码核验的同源可编辑图，维持报告的字体、字号、配色、边框、箭头和图例。若为演示重排，应保持同一技术语义，保留源图链接、报告图号和软件SHA，并由M10/R2复核；不能复制旧截图或自行绘制与代码不符的新版本。
- 每页讲稿使用演讲者能理解并口头解释的具体语言，关键术语、指标、图表结论和限制都能说明来源；不得堆砌空泛AI术语或照读无法解释的长段。非作者Review随机抽查页面和讲稿，记录核验人与需改写项。
- 不用或编造Survey/问卷结论装饰演示；需求和用户体验证据引用课程约束、源码/接口、真实测试和U01-U08真人任务。演示数据与实际真人体验/测试结果分开标识。

本轮验收门禁：逐页在实际播放/投影视图检查可读性；复用技术图可追溯至报告源图与SHA；非作者抽查讲稿后，演讲者能讲清抽中的图、指标、证据与限制。没通过的页留在未完成清单，不得用作者自评代替复核。

## D1：演示结构、PPT与证据

岗位分支 `work/presentation/slides-evidence`。D1依据R1报告、T2/T3真实测试汇总、U2手册/截图索引及M10确认的软件 SHA 编排演示。准备 15 分钟PPT（建议14页初稿，可依叙事调整），每页观点都标明事实来源；不得把AI规则说成训练模型或夸大效果。

| 交付物 | 里面放什么 | 为什么要交 / 交给谁 |
|---|---|---|
| `docs/submission/presentation/slides-outline.md` | 14页英文初稿每页结论、图/动作、讲述人、证据、时长；最终增减原因 | 让D2知道讲什么，14页是内部初稿基准不是课程要求 |
| `docs/submission/presentation/CampusLoop_Final_Presentation.pptx、CampusLoop_Final_Presentation.pdf` | 冻结且两轮彩排后同版的可编辑PPT和PDF备份 | 正式演示/课程提交，离线打不开PPT时仍可展示PDF |
| `docs/submission/presentation/slides-source/` | 本人可编辑图表/生成源与说明；复用R2图给原链接 | 便于后续改图并追溯贡献，不只交一张不可改截图 |
| `docs/submission/presentation/slide-evidence-index.md` | 每页图/数字/主张对应报告、测试、截图、代码SHA、外部许可 | R1核数字、U2核图、M10核技术，避免无依据成功结论 |
| `docs/submission/presentation/submission-checklist.md` | 课程每项交付、来源、负责人、学校入口/正式日期/时区/提交人/回执状态 | D1唯一维护课程清单，防漏报告/PoC/手册/视频/PPT/贡献表/至少3次更新 |
| `docs/submission/presentation/slide-review.md` | 逐页可读性、事实核对、D2/R1/M10真实Review链接 | 证明实际复核完成，未确认项保留待办 |
| `C/presentation-impact.md` | 本轮后台和近期修复影响了哪些页/证据、还缺什么 | 交D2/M10安排彩排，不修改D2的讲稿 |

个人日志/清单放 `P/presentation/slides-evidence/`。14页初稿依次为封面成员、问题、目标边界、需求角色、架构、交易状态、交易演示入口、搜索匹配、价格/信誉/风险、测试数据方法、实际结果、困难/协作/贡献、限制未来、总结问答。后台治理并入相关页或短演示，不夸大成自动封号。

## D2：双账号演示、讲稿执行与视频

岗位分支 `work/presentation/demo-video`。D2准备演讲者真人出镜视频，实操双角色演示并验证备用路线；同一人可操作两个隔离浏览器会话，但要明确展示角色切换，公开合成账号见#145，真人凭据和令牌不得共享，不混淆买家/卖家状态。

| 交付物 | 里面放什么 | 为什么要交 / 交给谁 |
|---|---|---|
| `docs/submission/presentation/presentation-script.md` | 逐页英文讲稿、真实讲述人、各环节计划时长及实际彩排时长 | D2唯一维护，配合D1的PPT控制15分钟 |
| `docs/submission/presentation/demo-runbook.md` | 主交易链、权限/状态被拒绝、智能降级的逐步角色/URL/ID/输入/预期/复位 | T2/U2/M10核实，别人按表也能演示；后台加举报提交→处理→回看 |
| `docs/submission/presentation/fallback-runbook.md` | 断网、登录失败、API超时、智能服务不可用、数据用完五种回退步骤 | 现场失败时能诚实说明；预录资料标明预录，不伪装现场成功 |
| `docs/submission/presentation/rehearsal-log.md` | 至少两轮真人彩排的日期/参与人/SHA/实际时长/卡点/Issue/修复与原执行人复测 | D1调整PPT，D2调整操作与讲稿；第二轮仍阻断就保留未完成 |
| `CampusLoop_Demo.mp4（课程认可存放位置）` | 冻结版本的15分钟项目演示，实际演示者本人出镜 | 课程正式视频交付；不默认把大视频推Git |
| `docs/submission/presentation/media-manifest.md` | 视频位置/权限/文件名/大小/时长/分辨率/SHA-256/软件SHA/异机播放验证人和结果 | 接收人确认拿到正确、完整且可播放的视频 |
| `docs/submission/presentation/release-handoff.md` | 软件SHA、材料commit、报告/手册/PPT/视频路径、校验和、限制、Review、接收人、真实提交回执链接 | M10核技术，实际课程提交人上传学校；GitHub推送不等于交作业 |
| `C/demo-impact.md` | 本轮演示路径/讲稿/视频需改之处和受影响复测/重录 | 交D1/M10协调冻结，不代填别人Review |

个人日志/清单放 `P/presentation/demo-video/`。操作单记录角色/对象ID/实际环境，账号来源链接#145或原私有交接文件，不另做账号清单。复用T2/U2现有稳定场景和截图，只有新增演示缺口才补数据；软件变化后只补测或重录受影响片段，保留版本标识。

## 证据接收、冻结与彩排

1. R1/R2交最终报告版本和结论来源；T2交真实测试汇总及已通过业务流程；T3交环境限制；U2交手册、截图索引和演示数据方案；M10确认演示 SHA 与专用环境。D1在 `slide-evidence-index.md` 标出每一项收到/缺失，缺证据的主张先删去或注明待验证。
2. D1交PPT和证据索引，D2交本人维护的讲稿，给对方/M10/非作者Review人。M10核技术事实，T2核测试数值，R1核报告一致性，U2核界面截图版本；不由作者自审。
3. D2先按 `demo-runbook.md` 做完整桌面彩排，再做第二轮计时彩排。两轮都记录真人讲解、版本 SHA、总时长和问题。版本或数据变化后复测受影响步骤。
4. 录制 MP4 前冻结软件 SHA、演示数据与讲稿。视频录完后从头播放检查画面、音频、出镜、时长和文件完整性，并填写 manifest；若演示流程失败，保留真实限制并按备用讲解，不剪造成功结果。
5. D1/D2将PPT、MP4、报告/手册版本、证据索引、彩排日志、课程提交回执和未完成事项交总协作Issue #129及M10。组汇总PR合入 `main` 后，记录最终提交 SHA。

## 完成条件

- [ ] PPT与讲稿覆盖真实功能、测试结果、限制和来源，演讲目标为15分钟。
- [ ] 每页关键结论可从证据索引追溯到报告、测试、截图或代码版本。
- [ ] 两轮真人彩排有时间与问题记录；最终录制中演讲者本人出镜。
- [ ] MP4可从头播放，时长/哈希/播放检查已登记，课程要求文件齐全。
- [ ] 项目更新至少三次且内容与真实进展、困难、下一步及导师讨论相符。
- [ ] 非作者Review完成，组资料PR已合入 `main`，最终提交清单与回执可查。
- [ ] PPT/PDF逐页通过投影尺寸可读、图例/来源完整和无裁切重叠检查；复用技术图可追溯同源文件与SHA
- [ ] 非作者抽查讲稿和图表，演讲者能够解释关键术语/结论/限制；没有未核实的Survey主张或空泛术语

仓库中的[九人协作旧规划](https://github.com/Huang0283/CampusLoop/blob/main/docs/management/nine-member-collaboration-plan.md)及docs/issues分组文档保留作历史参考；当前任务、数量调整和交接按本Issue执行，不从旧规划额外追加已取消的造数、重复正文或重复材料任务。

## 分组导航

| 小组 / 各自岗位 | 详细任务 Issue | 本地说明 |
|---|---|---|
| 文书组 R1 / R2 | [#144](https://github.com/Huang0283/CampusLoop/issues/144) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-literature.md) |
| 测试组 T1 / T2 / T3 | [#145](https://github.com/Huang0283/CampusLoop/issues/145) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-testing.md) |
| 用户体验组 U1 / U2 | [#146](https://github.com/Huang0283/CampusLoop/issues/146) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-ux.md) |
| 演示组 D1 / D2 | [#147](https://github.com/Huang0283/CampusLoop/issues/147) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-presentation.md) |
