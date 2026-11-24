# [文书组] R1/R2 任务、交付物与 LaTeX / Overleaf 交接

关联：总协作 [#129](https://github.com/Huang0283/CampusLoop/issues/129)；四组总览见 [#143](https://github.com/Huang0283/CampusLoop/issues/143)；本组内分工与接收都在本Issue。阶段五材料组分支 `team/reporting`，R1岗位分支 `work/reporting/report-editor`，R2岗位分支 `work/reporting/system-evidence`。当前五阶段已收口，个人PR先回 `team/reporting`，组汇总PR到 `main`。

本Issue负责把真实的软件需求、设计、测试结果、限制和贡献写成可复核的英文课程材料。测试没跑完不等于所有章节停工；未验证数字写待验证，不能编造结论、文献、成员贡献或签名。

## 2026-11-05 本轮数据与报告口径

软件基线更新为 main@c93d95cfc675364faf048474021fc5fcbb4a3ef8（PR #152），双账号数据版本campusloop-demo-v1。账号、测试环境和各岗复用分工统一见[测试组 #145](https://github.com/Huang0283/CampusLoop/issues/145)顶部。

R1引用T1/T2实际执行与复测日志；预置的15笔成交、聊天、举报和警告只说明演示场景已准备，不能写成组员已完成测试、真人交易或真实市场估价证据。两账号看见的是同一批15笔订单，不能合计30笔；合成成交不自动作为价格模型训练样本。R2按本轮实现更新数据初始化/价格参考说明，只改受影响内容。交付物及岗位分支沿用，不额外新增一套报告。R1/R2引用现有测试和数据登记，不重建数据统计文件；有效技术图继续复用，代码变化才改受影响图，不从零重画六张。

## 路径、个人记录与接收规则

以下 `P` 指 `docs/collaboration/phase-5`，`C` 指 `docs/collaboration/phase-5/changes/C20261103-ADMIN`；不是让组员创建名字叫P或C的目录。`F` 指 `tests/collaboration/phase-5/data-permissions`。沿用已存在的文件，不另建同内容副本。当前软件验收基线以 M10 最近通知为准（核对日 main@28e30a248168e0a0a32a7cc0b560401a649d1dff）；材料commit另记，代码变化由M10另发新SHA。历史实际执行仍绑定其原始SHA。

每人自己的岗位目录下分别交 `task-log.md`（实际做了什么、依据/PR链接）、`delivery-checklist.md`（哪些文件齐了、哪些还缺、非作者Review链接）；测试三岗另交 `daily-report.md`（当天计划数和五类结果、阻塞、下一步）。它们用于交接和贡献追溯，不代替测试日志、正文或学校签名。每份文件只有一位编辑负责人，其他组引用原链接；不得互相复制成第二份。总索引/本轮摘要只列原文件链接和变化，不要求把同一段过程复制进多份日志。

交接消息必须包含：交付人/接收人、软件SHA、材料PR/commit、文件链接、数据版本、已通过/失败/阻塞/未执行、接收人第一步和预期、缺口负责人、预计回复日期。接收人实际尝试后回复“接收/部分接收/退回补充＋实际结果”；只发“做完了”不算交接。个人PR→本组team分支→非作者Review→组汇总PR→main，当前不再投已关闭的阶段分支。组联络人为R1/T2/U2/D2；学校提交、签名、真人体验和Review须由实际人员完成。


## 组员R1：需求、测试结论和报告统稿

岗位分支：`work/reporting/report-editor` → `team/reporting`。R1是文书联络人，接收M10的软件事实、R2的技术章节、T2测试汇总和U2的手册/截图索引；将明确的材料接收和缺口登记到#129并链接本Issue。

R1单独负责：

- 将15个功能域的需求梳理成至少30条可检查REQ，已有编号优先沿用。每项含角色、入口、输入、正常/失败结果、优先级、实现依据、用例、状态。
- 正文Introduction、Requirements、Testing and Evaluation、Project Management/Reflection、Conclusions；最终把R2章节装入同一报告，不复制另一份正文。
- 对照T2/T3真实运行表复算数量，区分功能符合性、独立AI效果、自动化测试和真人体验；报告版本SHA、数据、环境、失败、阻塞和未评估限制。
- 汇总实际代码/模型/外部图/图片/数据/AI工具来源和成员贡献证据；贡献内容交组员确认，不能代签或推断贡献比例。
- 负责课程格式、引用、图表编号、总稿编译和PDF逐页核验，交D1可引用的结论和证据定位。

### R1交付物分别是什么

所有正式英文正文源文件放 `docs/submission/technical-report/latex/`，LaTeX是唯一正文编辑源，不要求再维护同内容Markdown或DOCX：

| 文件 | 装什么 | 有什么用 / 交给谁 |
|---|---|---|
| `main.tex` | 唯一报告入口、章节顺序、目录、文献和附录引用 | 一键编译整份报告；R2只交章节，R1统装 |
| `preamble.tex` | 全文通用字体、页边距、字号、行距、图表和链接样式 | 保证全篇格式一致，方便一次改格式 |
| `chapters/introduction.tex` | 校园二手问题、用户、目标、范围和不做的功能 | 让老师知道为什么做、做到哪里 |
| `chapters/requirements.tex` | 需求背景、角色、至少30条REQ的正文概述与来源 | 说明软件按什么要求实现，并可追踪到测试 |
| `chapters/testing-and-evaluation.tex` | T2/T3结果、软件SHA、数据规模、方法、真实指标与缺口 | 证明结论来自真实运行，不把计划用例写成通过数 |
| `chapters/project-management.tex` | 阶段、分支/PR、协作方式、真实问题和解决办法 | 说明项目如何推进、成员怎样交接 |
| `chapters/conclusions.tex` | 目标逐项回应、达到的结果、限制、后续工作 | 收束报告且明确没有完成的事 |
| `references.bib` | 实际引用来源的作者、标题、年份、出版信息、DOI/URL | 由LaTeX生成参考文献；不放未读或虚构引用 |
| `README.md` | 主文件、Overleaf上传方法、XeLaTeX等编译器、BibTeX/Biber和编译步骤 | 让接收人第一次导入ZIP就能成功编译 |
| `CampusLoop_Technical_Report_Overleaf.zip` | 完整可编译工程、所有.tex/.bib/图片/模板说明 | 直接导入Overleaf或本地解压复现 |
| `CampusLoop_Technical_Report.pdf` | ZIP对应同一commit的最终版PDF | 提交和逐页阅读核验 |
| `requirements-traceability.csv` | 每行REQ→Issue→代码/接口→测试编号→报告章节→SHA→证据 | 让评审从一句需求查到真实结果 |
| `report-evidence-index.md` | 报告数字/图/结论到测试、截图、源码和版本的定位 | R2/D1和审核人快速复核每项事实 |
| `member-contributions.md` | 每人的真实PR、Review、测试或文档产物链接及确认状态 | 支持Appendix A贡献记录；不一致时标待确认 |
| `format-check.md` | 正文页数、纸张、字体、页边距、行距、引用、最终编译记录 | 证明报告满足课程版式 |

按课程要求正文40–60页，A4、单栏、四边2.54cm、12pt、1.5倍行距；References、封面、目录、Appendix A计页按课程规则处理。Overleaf导入ZIP后必须由非作者组员再编译一次，登记编译器和结果。教师若明确要求DOCX，再补DOCX；本轮不让组员重复维护两套正文。

## 组员R2：系统设计、实现说明、技术图源

岗位分支：`work/reporting/system-evidence` → `team/reporting`。R2接收M10给出的代码/契约和完整软件SHA，查实际前后端源码后写作；完成后把章节PR、图源及SHA交R1，由R1装进主稿、M10复核技术事实。

R2单独负责：浏览器、API、数据库、Redis、Worker、媒体、智能服务架构；用户/商品/交易/举报实体和权限；六条源码链路（认证恢复、商品发布、聊天报价、唯一订单、约定与双方完成、举报处理与审计）；搜索/求购匹配/价格/信誉/风险的真实输入输出、降级和限制；至少六项真实技术决策与取舍。

### R2交付物分别是什么

| 文件 | 装什么 | 有什么用 / 交给谁 |
|---|---|---|
| `chapters/design.tex` | 真实组件、数据/权限边界、部署依赖 | 解释系统由什么组成；交R1装入总报告 |
| `chapters/implementation.tex` | 六条链路的页面、SDK operation、后端符号、持久化和失败边界 | 证明文中描述可回到源码；交R1/M10核事实 |
| `chapters/ai-methods-and-limitations.tex` | 五种智能能力、基线/模型界限、输入输出、降级和评估状态 | 防止把规则冒充训练模型或把未评估说成高准确率 |
| `chapters/technical-decisions.tex` | 至少六项问题/决定/替代/取舍/代码证据 | 解释方案为什么这样设计 |
| `architecture-source-index.md` | 每张图的编号、可编辑源、软件SHA、源码依据与Review人 | 让图能追溯和修改；交R1/D1 |
| `figures/design/*.mmd` | 架构、ERD、代码Class Diagram、交易状态、会话、订单约定、AI降级等可编辑图 | 所有图均能编辑、核实符号并追溯到当前源码 |
| `figures/design/*.svg`及LaTeX可用PDF/PNG | 从源图导出的图形 | 嵌入报告及PPT，导出后检查字体、箭头和裁切 |

R2的.tex/.bib/图像与R1文件同处一个Overleaf报告工程；R2不能另交一套完整报告ZIP或覆盖R1的`main.tex`。R1通过`\input{chapters/design}`等命令引用章节。图片使用相对路径，不写本机绝对路径。

## 本组交接步骤

1. 已有R1/R2认领沿用，尚未认领者在本Issue登记；组内选一名非作者复核人，R1不能Review自己，R2也不能Review自己。
2. R2收到M10的SHA后，先回“收到的SHA/要写章节/缺什么”；完成独立章节PR到`team/reporting`，PR写软件SHA和源码锚点。R1检查章节是否编译、引用是否存在；M10检查技术事实。
3. T2每次交`C/testing-summary.md`及CSV/日志链接，写清软件SHA、测试计划数、通过/失败/阻塞/未执行、不适用、数据、原执行人和Issue。R1回复收件数量/所改章节；缺实际结果就留待验证。
4. U2交可公开引用的截图索引、任务结果和手册SHA；R1按图索引引用，不复制原图后另行维护。敏感邮箱、令牌、私聊和举报原图不得放报告工程。
5. R1做整合PR到`team/reporting`，邀请R2、测试执行人、M10做对应范围Review。记录编译日志和PDF；只有接受人的真实评论才算Review。
6. 小组联络R1把分支PR、最终PDF/Overleaf ZIP、报告SHA、未完成项和接收人链接回报#129。组材料稳定后由R1向`main`开汇总PR；不向已关闭阶段分支提交。
7. 测试失败找原测试岗位补证据或找M10处理代码；文献/事实来源缺失由章节作者补；编译失败由负责该.tex章节的人修，R1负责整合，不将所有问题丢给统稿人。

## R1/R2个人接收模板

```text
姓名 / R1或R2 / 组内复核人：
个人分支：work/reporting/...
软件SHA / 文档commit / PR：
本人具体章节和文件：
第一步编译/核对结果：
待接收证据 / 缺口及负责人：
下一位接收人：R1、R2、T2、U2、M10或D1
```

## 完成条件

- [ ] R1、R2分别有岗位分支、独立文件、非作者Review和个人交付清单。
- [ ] Overleaf报告ZIP可从干净项目导入编译，PDF和源文件来自同一版本。
- [ ] 课程报告格式与正文页数检查可复现，所有数字、图片和重要结论有证据索引。
- [ ] T2/T3实际结果与REQ追踪相符；未执行、失败、NO_GO或未知项目如实留下。
- [ ] R1整合PR已由组员Review，并交D1可引用的冻结版或明确标Draft。

## 本轮补充与文件归属

R1个人日志/清单放 `P/reporting/report-editor/`，本轮 `C/report-impact.md` 写后台/搜索等变更影响哪些REQ、章节、图表和缺失证据，用于向R2/D1交接更新范围。R2个人日志/清单放 `P/reporting/system-evidence/`，本轮 `C/system-evidence-impact.md` 写受影响技术链路、图和事实依据，交R1/M10复核。报告根目录中的CSV、索引、贡献和格式检查不放进 `latex/chapters/`；正式章节以.tex为唯一正文。

R1在原至少30条需求基础上补管理员角色、举报、用户禁用/恢复、商品治理、订单/审计和搜索边界。168仅是测试计划数；实际结果取T2/T3原日志。R2补管理员页面→SDK→API→数据/审计→学生端变化，明确举报处理与处罚分离，无仲裁或自动处罚能力不能写成已有功能。

R2六张图分别为 `architecture.mmd`（组件与边界）、`data-model.mmd`（实体关系）、`transaction-states.mmd`（状态合法迁移）、`session-sequence.mmd`（同人多商品会话）、`order-meetup-sequence.mmd`（订单约定与双方确认）、`ai-fallback.mmd`（智能失败降级）。各图都有可编辑源、SVG及LaTeX可用PDF/PNG，导出文件纳入Overleaf工程；图索引注明源码/SHA，便于R1/D1复用与复核。

仓库中的[九人协作旧规划](https://github.com/Huang0283/CampusLoop/blob/main/docs/management/nine-member-collaboration-plan.md)及docs/issues分组文档保留作历史参考；当前任务、数量调整和交接按本Issue执行，不从旧规划额外追加已取消的造数、重复正文或重复材料任务。

## 分组导航

| 小组 / 各自岗位 | 详细任务 Issue | 本地说明 |
|---|---|---|
| 文书组 R1 / R2 | [#144](https://github.com/Huang0283/CampusLoop/issues/144) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-literature.md) |
| 测试组 T1 / T2 / T3 | [#145](https://github.com/Huang0283/CampusLoop/issues/145) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-testing.md) |
| 用户体验组 U1 / U2 | [#146](https://github.com/Huang0283/CampusLoop/issues/146) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-ux.md) |
| 演示组 D1 / D2 | [#147](https://github.com/Huang0283/CampusLoop/issues/147) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-presentation.md) |

## 2026-11-24 高分报告写作与图表验收补充

本节是 R1/R2 的正式新增验收要求，不改已有岗位、分支、文件归属和历史记录。不得把报告评阅建议本身写成已经完成；每项结果必须能定位到当前报告页码、图号、源码或证据。

### R1 主责：来源、理由、评价和引用

- Introduction、Requirements、Technical Decisions、Evaluation 中的每个背景痛点、REQ、选型、指标口径和数据结论，都要说明由来与依据：为何重要、来源是什么、为何采用当前方案。REQ 同时追踪到对应课程/业务来源、OpenAPI 或代码、测试用例和真实状态；指标注明分子/分母或计算口径、样本范围、数据版本、SHA、环境、时间及限制。
- **禁止使用或编造 Survey/问卷调查**作为需求调查或用户评估。需求来源只采用有证据的校园二手交易痛点、课程要求、当前 OpenAPI/源码、T1/T2/T3 实际测试和 U01-U08 真人任务记录。若某痛点只是团队假设，明确写成假设，不能称为用户研究发现。不得把合成演示数据说成真实交易或市场调查。
- 全文文字由作者用能够解释清楚的英文表达。明确解释缩写、专业词与图表结论；不要堆砌空泛 AI 话术或复制自己无法解释的段落。每张图/表在正文中引用，说明读者应看什么、图表能支持什么结论。
- `references.bib` 只收录真实、可查、作者实际阅读并在正文引用的材料；正文使用一致的 `\cite{...}` 引用。背景、实际使用的技术/标准/算法和外部图表按需要引用相应论文或官方文档。FastAPI、React、PostgreSQL、pgvector、Redis、MinIO、OpenAPI、Argon2id、JWT、OWASP、UML/ERD、BM25、BGE、贝叶斯平滑等仅在报告实际描述或采用时引用，不得为凑清单硬塞未使用/未读来源。核对作者、标题、年份、出版信息及 DOI/稳定 URL，适用时写访问日期；引用与 References 一一对应。
- R1 将全文样式统一维护在 `docs/submission/technical-report/latex/preamble.tex`：A4、四边 2.54 cm、单栏、12pt Arial/Times New Roman、1.5 倍行距，以及标题层级、表格、图题/表题、编号、交叉引用、代码/接口排版和参考文献样式。章节作者不得局部覆盖样式；若课程模板要求例外，先在 `preamble.tex` 统一处理并登记依据。

### R2 主责：规范图与当前源码一一对应

- 所有技术图必须先有可编辑源（Draw.io、PlantUML 或经人工排版校对的 Mermaid 等），再导出清晰矢量 SVG/PDF；不直接使用 AI 生成的粗糙图片或未经人工重排、校对的默认草图。AI 可协助起草，但最终的图必须由 R2 核对语义、代码映射和排版。
- **ERD `data-model`** 对照真实 `backend/app/models/*.py` 和 `backend/alembic/versions/0001` 至 `0013` 绘制，实体、字段/类型、PK、FK、唯一约束和基数/可选关系与当前模型/迁移一致。关系基数使用清楚且一致的 Crow's Foot 或 `0..1` / `1..*` 等标记，说明符号含义；不得添加未实现的支付、认证或其他实体。
- **Class Diagram `class-diagram` 是单独必交图。** 类、核心属性、方法及关系必须逐项对应当前软件 SHA 的真实代码；优先选用实际定义的 ORM Model、Schema 或其他真实类。Service 若由模块与函数构成，不得伪造一个同名“Service 类”放入类图。`architecture-source-index.md` 必须逐类给出仓库源码文件路径和可定位的类/字段/方法；不适用的属性或方法不编造。已核对可用源码目录包括 `backend/app/models/`、`backend/app/schemas/`、`backend/app/services/`；类图里的每个符号仍须以实际类定义为准。
- 所有 Class、Sequence、State、Architecture、ERD 及其他线图，在导出前依课程 Lecture 讲义核验符号及含义，并在图索引登记所据讲义/页码或章节。至少逐项检查：关系线型和箭头（继承、实现、依赖、关联、聚合、组合不能混用）；时序生命线、激活条、同步调用与返回消息，以及实际存在的 `alt/opt` 条件；状态图的初始/终态、触发事件和守卫条件；架构图调用方向、数据方向与真实协议标签（HTTP/WS/SQL/Redis/S3/RPC 等，仅列实际使用项）。ERD 符号另按其图例/课程规则核查。课堂资料未支持的符号不自行宣称为课程规范。
- 架构、交易状态、会话/订单时序和 AI 降级图中的组件、状态、字段、接口、协议、调用和降级路径必须与指定软件 SHA 的真实实现一致。对未实现或未评估能力明确标注范围；图不得暗示模型效果已被验证。AI 图若无可追溯实现/评估证据，删去或改成有证据的流程图，不能把通用 AI 草图当项目架构。
- R1/R2/D1 使用的技术图保持统一字体、字号、配色、边框、箭头和图例风格；样式在图源/图索引中统一说明，PPT 复用报告图时保留同源文件和软件 SHA，不截屏后各自重画。

### PDF 清晰度、表达与非作者复核门禁

- R2 出图、R1 在 `format-check.md` 和 `architecture-source-index.md` 留记录；打开最终编译 PDF 按 A4 实际尺寸逐图人工复核。100% 阅读/打印视图下图中文字清晰可辨。图过密时拆图或用横向整页，不压缩成缩略图。严禁文字截断、文字卡在线/边框中间、标签重叠、箭头穿字、裁边或模糊位图。
- 每图登记图号、用途、可编辑源、导出文件、报告页码、软件 SHA、源码/迁移/数据锚点、Lecture 符号核验来源、100% 清晰度核验、复核人及结果。R1 逐页检查最终 PDF 中图表编号、图例、交叉引用、版式和清晰度。
- 折线图必须解释横纵轴、单位、顺序、样本量、来源、缺失值处理、汇总方式和连线理由；只有适合有序数据时才用折线。阈值/规则和符号给定义及来源，不可把示意或稀疏数据包装成真实趋势/模型表现。
- R1/R2 的非作者 Review 增加“可解释性抽查”：评审人随机抽查关键段落与图，确认事实准确、表述平实，并能由作者口头解释其来源与含义。评审将段落/图号、检查人、结果和需要改写的位置记入 Review 或 `format-check.md`；不能通过的内容退回作者改写。

### 本轮附加完成条件

- [ ] Introduction、Requirements、Technical Decisions、Evaluation 的主张均说明由来和依据；没有问卷/Survey 结论，需求/评估只用获准的课程、源码、测试和 U01-U08 真人任务证据，假设与合成数据明确标注。
- [ ] `preamble.tex` 是正文统一样式入口；最终 PDF 格式、References 与图表逐页检查记录齐全。
- [ ] ERD 与 Class Diagram 均有可编辑源；ERD 对应 Models 和 0001-0013 迁移，类图每个类/核心成员均对应真实源码与 SHA。
- [ ] 图表符号按课程 Lecture 核验并登记；PDF 中每张图通过 100% 可读性检查，无文字/连线重叠或裁切。
- [ ] 技术图不使用未经人工重排校对的 AI 默认草图；R2/R1/M10 完成对应复核，R1/R2 非作者 Review 含可解释性抽查结果。
- [ ] 每条参考文献真实可查、实际阅读、正文有引用；没有虚构、未读或未实际采用的方法/技术条目。
