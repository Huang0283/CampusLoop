# [协作补充] 后台治理验收、T1/T2/T3 分工与九岗位交付清单

GitHub执行Issue：[#143](https://github.com/Huang0283/CampusLoop/issues/143)。

变更 ID：`C20261103-ADMIN`。关联总协作 Issue：#129；沿用[九人协作与最终交付规划](../management/nine-member-collaboration-plan.md)，以下是本轮补充，不另建一套岗位或第六阶段。

## 这轮要做什么

现在系统除了学生交易前台，还提供管理员仪表盘、举报处理、用户管理、商品治理、订单查看、个人中心和操作日志。测试不能只看“后台能打开”，要验证：**管理员真的处理成功，学生端真的发生相应变化，刷新后仍然正确，普通用户不能越权。**

- 本轮待验收软件：`main`，完整 SHA：`bc67e7dfca3635c1ec974c6b38b9253dc70fabdd`，已经推送 GitHub。后续仅材料提交不改变这个软件基线；若修代码，M10 另发新软件 SHA 和回归范围。
- 九岗位沿用原计划，不代替组员认领姓名。各岗位在本 Issue 回复负责人、分支、复核人、PR 和预计反馈日期；日期由实际成员确认，不虚构截止时间。
- 所有结果先记“未执行”；已有自动化通过不能替代组员真实手动测试和独立签收。
- 首次接收最迟下一个团队工作日回复“可开始／部分可开始／缺什么”，不是要求一天做完所有工作。

## 先回答：T1 写好数据集以后是不是就结束了

**按原计划，不是。T1 负责数据和权限，T2 负责业务操作，T3 负责环境与异常。**

| 岗位 | 通俗理解 | 这轮重点 | 交给谁 |
|---|---|---|---|
| T1 | 准备可用的测试材料，再检查“谁有权做什么” | 账号、商品、图片、举报前置映射；后台越权、隐私、禁用会话、状态版本保护 | 数据先交 T2/T3，权限结果交 T2 汇总 |
| T2 | 真正点网页，把一件事情从头做到尾 | 交易与举报处理，用户禁用/恢复，商品下架/恢复，核对学生端联动 | 汇总给 M10；通过任务交 U2；真实结果交 R1 |
| T3 | 换环境、断服务、重启或并发时检查会不会坏 | 独立安装、故障恢复、并发治理、手机/桌面与持久化 | 结果交 T2，安装问题交 U2/M10 |

**T1 基础数据包可以先交，T2 接收后立即开始手动业务测试，不必等 T1 全部权限测试结束。** T1 缺订单/举报前置时，按 T2 提供的合法场景配方创建，再自行执行权限判断。不能双方互等，也不能把所有测试默认交给 T2。

### 当前 T1 交付状态，不能误报

- PR #142 已于 2026-10-30 合入 `team/testing`，不等于已经进入 `main`。接收材料从 `team/testing` 或其 PR 获取；运行的软件仍使用上面的 main SHA，不能直接把旧材料分支启动成最新版网站。
- 该数据包已有静态检查、专用环境 setup/verify、重复导入等历史运行证据；证据对应旧 SHA，需在本轮环境重新核对兼容性。
- `team/testing` 现有 `delivery-checklist.md` 中“未合并”是旧记录，T1 应更新为实际 PR 状态，明确“已合入组分支、尚未合入 main”。
- 同一份交付清单明确写着：36 条权限用例尚未完成执行，部分依赖 T2 业务前置；不能在群里写“T1 所有测试已通过”。
- reset 只支持部分清理；账号、媒体、历史等关联资源的彻底清理仍有缺口。使用新 runId 或经 M10 核验的专用环境复位，不能删除日常数据卷。

## 环境和操作边界

- M10 交付：本轮可访问的专用测试 UI/API 地址、数据库标识、Redis DB14/15、媒体范围、管理员初始化方式和私下获取凭据的方法。T2 首次接收时逐项核对；未提供就明确列出缺口，其他可测项继续。
- 日常网站地址仅供识别：UI `http://127.0.0.1:5174`，API `http://127.0.0.1:8001`。**这些 localhost 地址不是组员共享测试地址，禁止在日常账号库执行禁用、下架、举报造数、清库或故障注入。**
- 测试软件用本通知软件 SHA；数据/材料从岗位分支或 `team/testing` 获取，分别记录软件 SHA、材料 commit 和数据版本。本轮软件SHA已包含交易中心空间、空状态、操作引导与手机页签调整；T2复查订单筛选/翻页，U1更新学生截图，T3补布局与失败状态记录。
- 沿用 `permission`、`business`、`environment`、`experience`、`demo` 五种按需创建的命名空间，各人只操作自己的数据。下表按用户要求公开项目已有的虚构演示凭据；真实账号、运行时生成的个人凭据、令牌、私聊和证据原图不随测试日志提交。
- 举报“已处理/已驳回”本身只更新举报结果并通知举报人，**不会自动封号或下架商品**。需要处罚时另走用户管理或商品治理，并分别核对原因与审计，不能把“未自动处罚”误报为缺陷。
- 当前没有商品待审核状态，没有争议仲裁、分类管理、公告或敏感词管理能力。写清限制，不编造按钮，不要求测试员用数据库造一个“仲裁成功”。

### 管理员测试账号和密码（不是R/S别名）

下面是仓库 `backend/scripts/seed.py` 已定义的教学演示账号，适用于**已经初始化该种子的专用测试库**，不是声明组员的任意环境现在都已创建账号：

| 用途 | 登录邮箱 | 密码 | 说明 |
|---|---|---|---|
| 内置演示管理员 | `admin.demo@example.com` | `Demo@12345` | 登录专用测试UI的 `/login`，成功后进入 `/admin`，可测用户/举报/商品/订单/日志 |
| 学生演示账号 | `chen.demo@example.com` | `Demo@12345` | 用于学生前台和举报人/卖家测试；具体对象归属先查种子/运行清单 |
| 另一学生演示账号 | `lin.demo@example.com` | `Demo@12345` | 另开独立浏览器会话测试买卖双方；不能与管理员混在同一cookie会话 |

这些是内置演示身份，不能自动替代T1数据集的A/B/R/S命名空间账号。T1须在接收记录中明确“此环境哪个可登录邮箱对应R、哪个对应S”，并把测试管理员的账号和密码交给实际测试成员；第二管理员S需要M10用已审查的测试初始化方式提供，当前不能编造一个不存在的S登录邮箱。并发用例缺S时写阻塞，其余后台测试可以先做。

M10应把**实际专用测试UI/API地址、是否已种子初始化、管理员R/S实际账号密码、初始化/核对结果**补进本轮接收记录。`seed.py` 不覆盖已有密码，所以旧库若改过密码，上表不能保证仍适用，须登录核对后交接；不要为恢复默认密码重置日常账号。

## 文书统一使用 LaTeX / Overleaf（本轮新增要求）

按用户本轮要求，**正式技术报告和正式操作手册采用LaTeX，交可在Overleaf直接编译的完整工程和PDF**。内部Issue、日志、需求追踪和交接说明仍可用Markdown/CSV。下文沿用的章节名用于对照原计划，正式正文以对应 `.tex` 为唯一编辑源，不再要求组员同时维护一份同内容Markdown或DOCX正文。

- R1维护 `docs/submission/technical-report/latex/main.tex`、`preamble.tex`、总目录、`references.bib`、`README.md`、报告总装与最终导出；本人章节放 `chapters/introduction.tex`、`requirements.tex`、`testing-and-evaluation.tex`、`project-management.tex`、`conclusions.tex`。贡献表附录由实际成员核对，不代签。
- R2维护同工程 `chapters/design.tex`、`implementation.tex`、`ai-methods-and-limitations.tex`、`technical-decisions.tex`，提供图源及 `figures/` 的可编译导出文件。R1通过 `\input`/`\include`引用，不复制另一份正文，两人不同时编辑同一章。
- U1维护 `docs/submission/manuals/latex/user-manual.tex` 与学生章节；U2维护同工程的 `admin-manual.tex`、`deployment-manual.tex`、`troubleshooting.tex` 及其独立章节。共享样式由U2集成，不覆盖U1原始截图/章节。
- 每个工程 `README.md` 写Overleaf上传方法、主文件、编译器、参考文献工具和图片相对路径；英文课程正文沿用Arial或Times New Roman等课程允许字体、A4、四边2.54cm、12pt、1.5倍行距、单栏。Overleaf若没有课程指定字体，随工程提供许可字体或经课程允许的字体方案，不静默改字体后声称合规。
- 不使用本机绝对路径、不缺图片或 `.bib`，不把缓存/中间文件当源工程。至少由另一组员将ZIP导入新Overleaf项目编译一次，记录编译器、结果、页数和复核人。
- R1交 `CampusLoop_Technical_Report_Overleaf.zip`、最终 `CampusLoop_Technical_Report.pdf`（正文40–60页，附属部分计页按课程规定）；U1交 `CampusLoop_User_Manual_Overleaf.zip`、最终 `CampusLoop_User_Manual.pdf`（8–12页）；U2交管理员/部署说明源工程ZIP及相应PDF。DOCX不再作为本轮额外必交，若教师另有明确要求再补转换件。
- 本Issue不要求改网站成英文；网站中文提示和课程英文报告/手册是两件事。D1/D2仍按原计划交可编辑PPTX和真人出镜MP4，不强制把演示改成Beamer。

## T1：补数据，也补权限专项

### 数据怎么补

保留原有 8 账号、60 合法有图商品、12 求购、24 非法输入、20 模拟响应、30 搜索、24 价格、12 信誉/风险、12 场景配方与媒体清单；不是让 T1 全部重做。

1. 复用 R/S 两名管理员、A/B/C/D 等学生和 Z 禁用账号，不因有新后台就再造一批无用账号。维护 fixtureId→真实 ID 的私下映射。
2. 在原 60 条商品中核对并补齐 MacBook/游戏本/普通笔记本电脑、纸质笔记本、自行车/山地车、台式电脑、雨伞和摄影柔光伞等可区分内容。需要改样例时升级数据版本，保留旧版执行证据。
3. 新增 `search-checks-admin-v2.json`，12 条查询定义 Q31–Q42：笔记本、笔记本电脑、电脑、台式电脑、自行车、山地车、雨伞、移动电源/充电宝、仅简介命中、命中超过一页、分类/价格过滤、清空关键词。每条先人工核对完整测试商品快照，填写应包含/应排除 fixtureId 和理由；数量依据专用测试库，不照抄日常库数量。三种搜索模式分别记录支持行为与限制。
4. 新增 `admin-scenario-inputs.json`：四类举报对象 USER/PRODUCT/ORDER/CHAT_MESSAGE、待处理与合法处理后状态、用户禁用/恢复、可售/治理隐藏/卖家隐藏/预订/已售商品的角色与场景映射。T1 提供输入，T2 通过真实 API/网页形成订单、举报、处理历史与审计，禁止直接写状态充数。
5. 图片准备要分清商品公开图、头像和举报私有证据。正常样例用自制或许可图，登记来源/哈希；专门准备错误用途/其他账号的上传引用用于拒绝测试。

新增文件放 `tests/collaboration/phase-5/data-permissions/`，更新该目录 README、验证脚本和数据登记，不能只写本 Issue 而不交实际文件。

### 新增 T1-C37–C48，共 12 条

原 C01–C36 保留，并在本轮复测受影响项；新增用例不是已通过数。一个编号包含参数化输入时，要列全部子检查，不能执行一项就把整条标通过。

| ID | 动作 | 应看到什么 |
|---|---|---|
| T1-C37 | 游客/普通学生直接访问各后台页面，并请求仪表盘、订单、审计等管理 API | 页面登录引导/403，API 按契约拒绝；不能只靠隐藏菜单 |
| T1-C38 | 普通学生伪造禁用用户、治理商品和处理举报请求 | 全部拒绝，目标状态不变，没有成功处罚记录 |
| T1-C39 | 管理员尝试修改自己和另一管理员的账号状态 | 被拒绝，不破坏任何管理员账号 |
| T1-C40 | 学生已登录时管理员将其禁用，再用旧页面/会话请求受保护操作 | 权限失效，禁止继续写入；不能只测下一次登录 |
| T1-C41 | 恢复被禁用学生后再次使用旧会话，再正常重新登录 | 旧会话不因恢复自动复活；新登录按契约可用 |
| T1-C42 | 举报证据换 reportId/imageIndex，或无关用户访问私有图 | 关联与权限正确；不泄漏私有对象 URL 和其他事项内容 |
| T1-C43 | 用户状态、商品治理、举报处理提交空白原因 | 按契约拒绝，原状态不变，页面中文解释 |
| T1-C44 | 商品详情打开后被另一会话更新，再用旧 expectedUpdatedAt 治理 | 版本冲突并提示刷新，不能覆盖新内容 |
| T1-C45 | 举报已被他人处理，使用过时状态/处理时间提交改判 | 旧快照拒绝；原处理记录不被静默覆盖 |
| T1-C46 | 把他人的上传或非 avatar 用途引用设为本人头像 | 拒绝越权/错误用途，原头像不被写坏 |
| T1-C47 | 多商品聊天合并后切换用户，尝试读另一对方或订单的数据 | 合并展示不扩大后台资源权限，不串号/串订单 |
| T1-C48 | 普通学生访问后台导出/日志，管理员查看允许的导出与日志 | 学生拒绝；管理员输出遵循契约，无密码、令牌或无关私密证据 |

T1 交：补充输入文件、原36+新增12条定义、逐次执行日志、实际缺陷与复测、数据兼容性/复位限制；交 T2/T3 接收，T2 负责汇总。

## T2：补后台业务和近期改动的手动测试

保留 S01–S12 和 C01–C60。把 S10 扩为“举报人提交→管理员查看证据→填写原因处理/驳回→举报人看到状态与通知→查审计”；如需禁用/下架，再执行对应管理动作。

### 新增 T2-C61–C84，共 24 条

每条都记录前置角色/数据、URL、步骤、预期、实际、刷新后的结果、证据和软件 SHA。

| ID | 手动操作 | 核对结果 |
|---|---|---|
| T2-C61 | 管理员登录后进入首页，点品牌/后台导航，刷新再登录 | 正确进入后台；没有管理员求购主页/发布引导；学生首页保持学生功能 |
| T2-C62 | 举报列表切状态、搜索、清空、翻页并开详情 | 显示对应数据和中文状态，无结果后能恢复，不混入其他筛选结果 |
| T2-C63 | 对有效举报填写原因并处理，举报人用独立会话回看 | 状态/说明/通知真实更新且刷新保留，审计可关联；不自动处罚 |
| T2-C64 | 驳回另一份举报并由举报人回看 | 驳回状态、中文原因/通知、审计正确，原对象未被误处罚 |
| T2-C65 | 重复点击处理、重试相同请求 | 按幂等或已处理冲突返回，不重复通知、不重复处理 |
| T2-C66 | 按当前支持的入口/接口显式改判已处理举报 | 新原因与改判审计保留，需正确旧版本；无 UI 入口时记录 API 结果和 UI 限制 |
| T2-C67 | 查看四种举报对象、其允许的附件/详情，关闭后重开 | 对象与图正确、私有图按授权读取；无图/坏图有合理提示 |
| T2-C68 | 用户管理输入昵称/账号关键字，改状态筛选并清空 | 输入即筛选，不用再点搜索；连续输入不丢字，清空恢复 |
| T2-C69 | 有在售商品的普通学生被管理员禁用，学生端刷新市场 | 账号禁用真实生效，该卖家的商品从公开市场移除，不再允许写操作 |
| T2-C70 | 恢复该学生，重新登录、查看市场与本人商品 | 账号可重新使用；原本合法在售商品恢复可见，隐藏/已售商品不被误上架 |
| T2-C71 | 在用户详情寻找对自己/其他管理员的状态操作 | UI 有合理限制，绕过 UI 的拒绝交叉引用 T1-C39，不能把禁用管理员做成功演示 |
| T2-C72 | 商品治理连续输入关键字，结合状态/分类筛选并清空 | 实时命中正确商品、不丢字；详情对象始终匹配当前行 |
| T2-C73 | 对在售商品填写原因并治理下架 | 后台为治理隐藏，前台搜索/分类/详情按契约不可公开购买，刷新仍然生效 |
| T2-C74 | 对治理隐藏商品填写原因并恢复 | 满足契约条件时重新在售；市场和后台一致、审计完整；不恢复卖家自行隐藏商品 |
| T2-C75 | 卖家编辑被治理下架商品，尝试自行上架；另查预订/已售/删除状态治理 | 卖家不能绕过治理；禁止状态有确定拒绝；不破坏交易或复活删除数据 |
| T2-C76 | 订单管理连续搜索、筛状态、打开详情并导出 CSV | 实时筛选、居中同风格弹窗、正确订单内容；导出范围/字段符合当前契约 |
| T2-C77 | 打开操作日志切全部/决定、查看本轮举报/用户/商品动作 | 操作者、对象、时间、原因、前后状态能对应真实动作，不把查看记成处罚 |
| T2-C78 | 对照市场/API 核仪表盘统计，查看管理员个人处理记录 | 在售统计同口径，空分母不伪造百分比；“我的记录”不混入另一管理员 |
| T2-C79 | 分别搜索笔记本、笔记本电脑、电脑、台式电脑 | 广词含合理子类；笔记本可含纸本，笔记本电脑排除纸本；每种模式核应包含/排除样例 |
| T2-C80 | 搜自行车/别名/仅简介命中，翻页并加分类价格筛选，另搜雨伞 | 不只返回标题词面命中，翻页无遗漏/重复，筛选有效；生活雨伞不混入摄影柔光伞 |
| T2-C81 | 同一买卖双方咨询两件商品，再进行不同报价/订单 | 联系人展示合并；消息、报价和订单仍归正确商品；刷新持久化 |
| T2-C82 | 取消正常预订订单，再去市场搜索该商品 | 订单合法取消、商品按契约恢复在售并可被搜到，不能只看本人页状态 |
| T2-C83 | 对合法创建的治理隐藏/卖家隐藏/删除边界前置执行相关取消回归 | 隐藏/删除保护不被取消流程解除，市场仍不公开；不直接改库造前置，无法合法形成则报缺口 |
| T2-C84 | 上传正常头像、保存、刷新并查看个人页与聊天 | 新头像真实上传和保存、展示一致；错误文件提示中文且原头像仍可用 |

本轮后台不接受“能打开截图”作为处理成功证据。至少串起三条：①举报处理与举报人回看；②用户禁用/恢复与市场变化；③商品下架/恢复与市场变化。买家、卖家、管理员用独立浏览器会话，避免身份覆盖。

## T3：补后台页面、并发和异常

原 C01–C30 保留，新增 T3-C31–C36，共 6 条：

| ID | 要测什么 | 要交的证据 |
|---|---|---|
| T3-C31 | 当前实际全部后台路由的加载/成功/空/失败/无权限状态 | 扩展 route-state-matrix.csv，不能继续固定旧29条；不适用写理由 |
| T3-C32 | 桌面1440×900/手机390×844的后台与受影响前台弹窗、卡片、错误 | 中文模式系统文案为中文，邮箱/用户原文不乱翻译；居中弹窗无裁切、键盘/关闭可用；英文模式按实际支持情况登记 |
| T3-C33 | 管理操作遇到超时/断网/服务错误再恢复与重试 | 无假成功、不误改对象，查询真实结果后再重试，无重复处罚/通知 |
| T3-C34 | 两管理员同时处理一份举报/同一商品版本 | 只有合法决定生效；另一方得确定冲突或幂等结果，日志和通知正确 |
| T3-C35 | 专用环境重启后回看治理状态、举报原因、用户状态、头像和审计 | 数据/图片保留；恢复后主流程可用，不删卷“修复” |
| T3-C36 | 在本轮软件SHA上独立接收T1增补数据与运行说明 | 目标隔离、二次导入无重复、兼容性/复位限制真实记录；文档可照做，没能力的操作记阻塞 |

### 本轮怎么数测试

| 岗位 | 原计划 | 本轮新增 | 扩展后计划 |
|---|---:|---:|---:|
| T1 | 36 | 12 | 48 |
| T2 | 60 | 24 | 84 |
| T3 | 30 | 6 | 36 |
| 合计 | 126 | 42 | 168 |

168 是计划用例数，不是已执行/已通过。通过+失败+阻塞+未执行+不适用=当前计划总数；子检查缺失不能判整条通过。同一用例多浏览器、多模式、多次复测另算执行次数。已有覆盖可复用并明确映射，不复制标题凑数；原用例与新增用例各有对应业务/权限/异常目标。

## 九个岗位分别交什么，交付物有什么用

通用要求：每个岗位都交自己的 `task-log.md`（实际做过什么）、`delivery-checklist.md`（文件/状态/证据/接收人）和非作者 Review 链接。测试岗位另交 `daily-report.md`。下面沿用原计划文件名，首次未完成的照实标待交，本轮只更新受影响内容。

材料路径简写：`P = docs/collaboration/phase-5`；`C = P/changes/C20261103-ADMIN`。不是仓库根目录直接创建 P/C 文件夹。

### R1：报告统稿、需求和真实测试结论

分支 `work/reporting/report-editor` → `team/reporting`；接收 T2/U2/R2，交 R2 复核、D1 引用。

- `docs/submission/technical-report/latex/`：前述 `main.tex`、`preamble.tex`、本人五个章节 `.tex`、`references.bib`、`README.md`；`docs/submission/technical-report/` 另交 `requirements-traceability.csv`、`report-evidence-index.md`、`member-contributions.md`、`format-check.md`、最终报告PDF和Overleaf工程ZIP。原计划同名Markdown正文不再重复维护。
- 用途：把系统目标、实际实现、证据、限制与成员贡献写成一份可评分报告；需求CSV让每项要求能追到用例与结果。
- 本轮：在原至少30条需求基础上补后台角色、举报处理、禁用/恢复、商品治理、订单/审计、搜索边界的需求追踪；用实际计数更新测试章节，168只写计划。没有证据的部分写待验证。
- 个人记录 `P/reporting/report-editor/`；本轮交 `C/report-impact.md`。

### R2：系统设计、实现说明和图源

分支 `work/reporting/system-evidence` → `team/reporting`；接收 M10 代码/契约，交 R1/D1；R1复核表达，M10复核技术事实。

- `docs/submission/technical-report/latex/chapters/`：`design.tex`、`implementation.tex`、`ai-methods-and-limitations.tex`、`technical-decisions.tex`；技术报告根目录另交 `architecture-source-index.md`。
- 技术报告根目录 `figures/design/`：`architecture.mmd`、`data-model.mmd`、`transaction-states.mmd`、`session-sequence.mmd`、`order-meetup-sequence.mmd`、`ai-fallback.mmd`，各导出SVG并提供LaTeX可直接使用的PDF/PNG，纳入Overleaf工程 `figures/`。
- 用途：解释真实系统怎样工作、为何这样做，图能编辑、箭头有源码依据；沿用六条链路和至少六项技术决策，不交纯截图代替源图。
- 本轮：补管理员页面→SDK→API→数据/审计→学生端变化，明确举报决定与处罚分离，补实时搜索与搜索范围限制，不能声称已有仲裁或自动处罚。
- 个人记录 `P/reporting/system-evidence/`；本轮交 `C/system-evidence-impact.md`。

### T1：数据包、身份权限

分支 `work/testing/data-permissions` → `team/testing`；T2接数据，T3查隔离，M10审脚本边界。

- `tests/collaboration/phase-5/data-permissions/`：`accounts.json`、`products.json`、`wanted.json`、`invalid-inputs.json`、`mock-responses.json`、`search-checks.json`、`price-checks.json`、`trust-risk-checks.json`、`scenario-inputs.json`；`media/`、`media-manifest.csv`、`generate_invalid_media.py`；`setup_data.py`、`reset_data.py`、`verify_data.py`、`README.md`；本轮新增前述两个JSON。
- `P/testing/data-permissions/`：`test-cases.md`、`execution-log.csv`、`defects.md`、`retest-log.csv`、`dataset-register.md`、`setup-reset.md`、`dataset-verification.md`、`independent-evaluation-register.md`，加通用日志/清单/日报。
- T1唯一维护 `P/testing/dataset-register.md`、`test-data-setup.md`、`independent-evaluation.md`；本轮交 `C/test-data-permissions.md`。
- 用途：让接收人可以独立造出相同测试前置，并证明身份/数据没有越权。不是只交JSON，也不是要求T1包办交易手动测试。

### T2：业务执行和测试组汇总

分支 `work/testing/business-journeys` → `team/testing`；收T1/T3，交M10修复、U2体验、R1写结论；T1/T3交叉复核原始结果。

- `P/testing/business-journeys/`：`scenario-recipes.md`、`test-cases.md`、`execution-log.csv`、`defects.md`、`retest-log.csv`、`business-data-counts.csv`、`user-handoff.md`，加通用日志/清单/日报。
- T2唯一维护 `P/testing/` 下 `functional-test-cases.md`、`boundary-test-cases.md`、`execution-log.md`、`defects.md`、`retest-log.md`、`test-summary.md`、`evidence-index.md`；本轮 `C/testing-summary.md`。
- 用途：场景配方让别人照着重走，执行日志记录实际成功/失败，handoff告诉用户组哪些流程可开始；汇总只引用T1/T3，不能代写他们的执行。
- 保留原S01–S12及最低6会话/24文本/8收藏/一笔双边完成交易与两条评价/四类举报的真实生成动作和ID；新增后台联动证据。脚本如有，放 `tests/collaboration/phase-5/business-journeys/` 并交运行说明。

### T3：安装、故障、性能和恢复

分支 `work/testing/environment-recovery` → `team/testing`；收T1数据/U2手册，交T2汇总、U2修手册、M10修技术问题。

- `P/testing/environment-recovery/`：`test-cases.md`、`execution-log.csv`、`defects.md`、`retest-log.csv`、`environment.md`、`install-session.md`、`logs/`、`performance.csv`、`concurrency.md`、`recovery.md`、`route-state-matrix.csv`、`component-state-results.csv`、`independent-evaluation.md`，加通用日志/清单/日报。
- 唯一维护 `P/testing/environment-verification.md`、`non-functional-results.md`；本轮 `C/test-environment-recovery.md`。脚本说明放 `tests/collaboration/phase-5/environment-recovery/`。
- 用途：证明别人电脑能安装、异常后能恢复、并发不乱、数据不丢。保留原异机/VM、两次停启、性能9组900次计量请求、竞争3轮、备份/媒体/损坏备份核验；没有实际设备/能力写阻塞，不拿本机换目录冒充异机。
- 独立智能效果仍按原许可/封存/合格数据门槛；本轮功能样例不能冒充真实成交或正式模型评估。

### U1：学生手册和真人操作记录

分支 `work/user-experience/student-experience` → `team/user-experience`；收T2已通过任务，由U2复核手册，交U2汇总。

- `docs/submission/manuals/latex/user-manual.tex`、本人学生章节和图片；最终 `CampusLoop_User_Manual.pdf` 与 `CampusLoop_User_Manual_Overleaf.zip`：12小节英文学生手册，最终PDF 8–12页。
- `P/experience/student-experience/`：`task-records/` 中U01/U02/U03/U04/U05/U07各桌面/手机一份共12份记录；`screenshots/`至少18张、`screenshot-index.csv`、`feedback.md`、`manual-verification.md`，加通用日志/清单。
- 用途：说明学生如何使用，真人记录哪里找不到/看不懂；不是再替T2跑一份自动化。
- 本轮：更新搜索、同人多商品聊天、取消预订后的市场、头像与中文提示；补“商品被管理员下架/卖家被禁用”的学生可见结果。只引用已测任务，不拿旧图当新版本。
- 本轮交 `C/user-student-experience.md`。

### U2：后台手册、安装说明和截图汇总

分支 `work/user-experience/admin-deployment` → `team/user-experience`；收T2/T3/U1，交R1/D1。T3验证安装，U1复核说明，T2核业务事实。

- `docs/submission/manuals/latex/`：`admin-manual.tex`、`deployment-manual.tex`、`troubleshooting.tex` 及相关章节/图片/编译说明；另交可编译的管理员/部署文档工程ZIP与各PDF。
- `P/experience/admin-deployment/`：`U06-desktop.md`、`U06-mobile.md`、`U08-install-observation.md`、`student-manual-review.md`；`screenshots/`至少10张、`screenshot-index.csv`、`feedback.md`，加通用日志/清单。
- U2唯一维护 `P/experience/screenshot-index.md`、`page-issues.md`、`demo-data-plan.md`、`manual-verification.md`；本轮 `C/user-summary.md`。
- 用途：让非开发者知道后台怎么进、如何处理及何时找M10，安装说明经T3实际照做；图索引供报告和PPT引用。
- 本轮U06桌面/手机记录扩展到举报、用户管理、商品治理、订单、日志；在原10图外至少补4张不同证据图：用户禁用、用户恢复、商品治理下架、商品治理恢复。U2最低14图，U1+U2最低32图；同时保留前台回看证据，不能用改名重复计图。原16份任务记录仍沿用，在原U06记录中扩展步骤。
- 明确处理举报不自动处罚、没有求购后台主页、没有仲裁接口；部署/故障指南保留原至少10项。

### D1：PPT、证据和课程清单

分支 `work/presentation/slides-evidence` → `team/presentation`；收R1/T2/U2/R2，交D2；R1核数字、U2核图、M10核技术范围。

- `docs/submission/presentation/`：`slides-outline.md`、`CampusLoop_Final_Presentation.pptx/.pdf`、`slides-source/`、`slide-evidence-index.md`、`submission-checklist.md`、`slide-review.md`。
- 用途：把已验证事实讲清楚，每页数字/截图有来源，课程要求不遗漏；沿用14页英文初稿基准，彩排后调整留理由。
- 本轮把后台治理纳入角色/实现/测试结果展示，可用一页或现有页内片段，不把它讲成自动封号系统；只在实测后写成功，冻结前全部标Draft。
- 个人记录 `P/presentation/slides-evidence/`；本轮 `C/presentation-impact.md`。

### D2：讲稿、演示、两轮彩排和出镜视频

分支 `work/presentation/demo-video` → `team/presentation`；收D1/T2/U2和M10冻结通知，交M10及实际课程提交人；D1/T2/U2交叉核验。

- `docs/submission/presentation/`：`presentation-script.md`、`demo-runbook.md`、`fallback-runbook.md`、`rehearsal-log.md`、`media-manifest.md`、`release-handoff.md`；最终真人出镜 `CampusLoop_Demo.mp4` 放课程认可位置，清单记录位置/权限/哈希/时长/播放验证，不默认把大视频推Git。
- 用途：别人能按操作单演示，现场失败有诚实备用说明，最终文件可接收；总计划15分钟、至少两轮真实彩排，保留原五种备用情况。
- 本轮给后台留一个简短真实演示：举报人提交→管理员处理→举报人回看，视时间加用户禁用/恢复或商品下架/恢复。先等对应T2/U2通过；专用demo空间准备数据，不能现场操作日常账号。
- 个人记录 `P/presentation/demo-video/`；本轮 `C/demo-impact.md`。代码有变影响场景时补测/重录，未冻结不录“最终通过版”。

## 按这个顺序交接，不用九个人互相催

1. **M10→四组联络人R1/T2/U2/D2**：发软件SHA、可测环境、这次改什么、受影响范围。缺审计环境/管理员初始化由M10补。
2. **T1→T2/T3**：先交基础数据PR/版本、README、导入/核对/复位限制。T2在business空间试导，T3在environment空间核隔离/二次导入；各自回复真实结果。
3. **T1/T2/T3并行执行**：T1测权限，T2测业务并给T1合法前置配方，T3测环境异常。失败单独建缺陷Issue，写软件SHA、最短步骤、预期/实际与脱敏证据。
4. **M10修复→原执行人复测**：新SHA跑原失败和相邻回归；保留旧失败。代码合并不能代替测试员确认，更不能直接改旧日志为通过。
5. **T2→U2→U1**：逐项交已经可用的任务和数据ID，不必等所有功能全部通过。U1/U2真人记录，发现难用问题另建Issue。
6. **T2/U2/M10→R1/R2**：报告只引用收到的真实数据/图/技术事实；未执行写限制，不虚构通过率。
7. **R1/T2/U2→D1/D2**：冻结后做同版PPT、两轮彩排、真人出镜视频；实际学校提交和回执由指定人处理，GitHub推送不等于交作业。
8. **个人岗位PR→组分支→main**：当前前五阶段已收口，本轮组汇总PR目标为main。不要重新启用旧phase集成分支，不直接推别人岗位分支。各文件唯一维护人不变，跨组引用链接不复制一份重写。

## 接收回复模板

```text
岗位/姓名/复核人：
岗位分支 → 组分支：
软件完整SHA / 材料PR或commit / 数据版本：
本轮要交的文件和用例：
已试的第一步、实际结果和证据链接：
可开始 / 部分可开始 / 缺什么（由谁补）：
预计下次反馈日期：
```

## 本轮关闭条件

- [ ] 九岗位认领与PR/Review/接收人登记齐全，通用日志清单真实。
- [ ] T1基础数据已由T2/T3独立接收，新增数据和权限测试有实际结果，复位缺口明确。
- [ ] 168条计划均有五类状态及证据，未执行不写通过；原失败由原执行人在新SHA复测。
- [ ] 后台举报处理、用户禁用/恢复、商品下架/恢复都有真实前台联动、持久化、权限与审计证据。
- [ ] U2后台手册与最低14图、U1学生手册/18图和任务记录更新；报告和演示引用同版真实结论。
- [ ] 阻断主流程/越权问题已修复复测，其他限制登记负责人；最终冻结、彩排、导出及课程提交沿用#129要求，不代签、不假报完成。
