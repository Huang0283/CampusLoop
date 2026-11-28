<!-- manual-slot-followup-20261129:start -->
## 2026-11-29 对接本地手册草稿：截图槽位与文件名

M10本地已有用户手册LaTeX/Overleaf草稿，材料分支 `work/submission/manual-and-poc-prep`，提交 `5fab3a2`（软件引用基线 `ecc22d2`）。**本轮核对时分支尚未推送/合入main；12页PDF仍含21处截图占位，不是已验收的正式手册。** 仓库远程没有这些文件时不代表U组拉取失败。本节只提前给交图格式；不能据此标记图片、真人任务、编译复核或PoC已完成。

下面21项是草稿的图片槽位/命名约定，**不是新增21张最低截图指标，也不是课程规定必须把21张全部塞进PDF**。优先复用已有合格图；同一流程可做清楚的分图，不能把无关页面硬拼成看不清的小图。缺图先登记缺口；M10可在保证UM-01–UM-12、AD-01–AD-06功能覆盖的前提下合并/删减槽位并同步索引。后台图是否留在学生主手册由M10按8–12页和可读性决定，详细后台操作仍属U2补充材料。

| 草稿槽位 | 交付文件名 | 主要角色 | 视口 | 参考页面/操作区（`:id`需换实际对象ID） |
|---|---|---|---|---|
| `UM-01A` | `um01_landing_market_ready.png` | Guest | `1440x900` | `/market` |
| `UM-02A` | `um02a_login_register_en.png` | Guest | `1440x900` | `/login` (+ `/register`) |
| `UM-02B` | `um02b_auth_error_profile.png` | Buyer · Xiao Zhou | `1440x900` | `/login` error + `/profile` |
| `UM-03A` | `um03a_market_search_filters.png` | Guest / Buyer | `1440x900` | `/market?query=...` |
| `UM-04A` | `um04a_product_detail_actions.png` | Buyer · Xiao Zhou | `1440x900` | `/product/:id` |
| `UM-05A` | `um05a_publish_and_my_listings.png` | Seller · Xiao Lin | `1440x900` | `/publish` + `/my-products` |
| `UM-06A` | `um06a_wanted_square_and_detail.png` | Buyer / Seller | `1440x900` | `/wanted` + `/wanted/:id` |
| `UM-06B` | `um06b_wanted_matches_result.png` | Buyer · Xiao Zhou | `1440x900` | `/wanted/:id/matches` |
| `UM-07A` | `um07a_chat_buyer_offer.png` | Buyer · Xiao Zhou | `1440x900` | `/chat/:id` |
| `UM-07B` | `um07b_chat_seller_accept.png` | Seller · Xiao Lin | `1440x900` | `/chat/:id` |
| `UM-08A` | `um08a_order_meetup_version.png` | Buyer / Seller | `1440x900` | `/transactions/:id` |
| `UM-09A` | `um09a_order_completed_review.png` | Buyer · Xiao Zhou | `1440x900` | `/transactions/:id/review` |
| `UM-10A` | `um10a_notifications_and_reports.png` | Buyer · Xiao Zhou | `1440x900` | `/notifications` + `/report` |
| `UM-10B` | `um10b_account_decision_appeal.png` | Seller / Buyer | `1440x900` | `/account/decisions/:id` |
| `UM-11A` | `um11a_price_advice_reference.png` | Buyer · Xiao Zhou | `1440x900` | `/publish/price-advice` |
| `UM-12A` | `um12a_mobile_student_flow.png` | Buyer · Xiao Zhou | `390x844` | `/market` + `/chat/:id` |
| `UM-12B` | `um12b_error_recovery_state.png` | Buyer / Seller | `1440x900` | `/transactions/:id` or `/publish` |
| `AD-01A` | `ad01a_admin_dashboard_export.png` | Admin | `1440x900` | `/admin` |
| `AD-02A` | `ad02a_admin_reports_products.png` | Admin | `1440x900` | `/admin/reports` + `/admin/products` |
| `AD-03A` | `ad03a_admin_users_risk_appeals.png` | Admin | `1440x900` | `/admin/users` + `/admin/appeals` |
| `AD-05A` | `ad05a_admin_orders_audit.png` | Admin | `1440x900` | `/admin/orders` + `/admin/audit` |

### 每个槽位到底截到什么

- UM-01A：启动后可浏览的商城，非仅终端；UM-02A/B：登录/注册入口及真实校验提示，资料编辑结果可单独成分图；UM-03A：关键词+筛选条件+相关结果；UM-04A：图、价格/状态和学生操作入口。
- UM-05A：有效图片和字段的发布/编辑区域＋发布后本人商品；UM-06A/B：求购条件/状态＋实际匹配结果及返回入口；UM-07A/B：同一交易买卖双方报价、接受等关键状态，商品上下文可辨。
- UM-08A：订单与约定版本、双方确认区；UM-09A：已完成订单及评价入口/已提交结果，不能暗示可重复评价；UM-10A/B：通知/本人举报回看与真实处理记录/申诉状态；UM-11A：价格建议的数值、参考样本/不足/降级及限制；UM-12A/B：手机操作和一项真实错误后的恢复结果。
- AD-01A：控制台主要导航/KPI，导出画面仅在确有需要时附；AD-02A：举报详情→处理→举报人结果，与商品人工治理分清；AD-03A：用户处理、风险参考与申诉复核的实际状态；AD-05A：同一订单详情/时间线和关联操作审计。AD-04商品治理、AD-06资料/手机/部署的原覆盖要求没有因草稿未单设槽位而取消，可在补充材料另图/证据交付。

### 怎么交图，谁负责接收

1. U1交学生原图/索引，U2汇总及补后台图，T2提供处罚/申诉等隔离写入场景；M10接收、选图、编手册，U1/U2非作者照步骤复核，T3仍本人异机安装。既有分工不改，U1不另写相同手册正文。
2. 原图仍保留在各自岗位的 `screenshots/` 和现有索引；按文件名或索引映射交M10，**不是要求U组直接推M10的材料分支**。M10复制入其LaTeX工程 `docs/submission/manuals/latex/figures/screenshots/` 后重新编译；不能假设换入PNG后仍恰好12页或保持清晰。
3. 索引每项写：槽位/UM或AD功能编号、原图GitHub链接、实际软件完整SHA、UI/API、角色/对象ID、语言、视口、日期、脱敏、步骤/结果、可用/待补/过期。常规只读图用5174小林/小周，交易处罚等正式写入用T2隔离环境，不为补图破坏日常演示历史。
4. 英文UI/英文图注；遮去密码/令牌/私人内容；品牌/用户名/图片原字保留。最终PDF按100%阅读检查每图，必要时裁出操作区、分图或调整排版，不以截图张数或占位模板的页数代替验收。
5. M10完成真实截图替换、步骤/命令核对、同版编译、非作者验证后再交正式PDF/Overleaf ZIP。PoC源码ZIP、冻结SHA/校验和和T3纯净机器解压运行仍另行待完成，不能因已有打包脚本写“安全/可运行已验收”。
<!-- manual-slot-followup-20261129:end -->

---

<!-- manual-screenshot-20261128:start -->
## 2026-11-28 调整：M10 编写用户手册；按功能覆盖截图

**M10（陈梓弘）接手课程 8–12 页英文用户手册的正式编写、选图、LaTeX 排版、Overleaf ZIP 打包与 PDF 导出。** 本节优先于后文“U1 唯一维护/导出学生手册”等旧分工；历史贡献、认领、分支和记录保留，不要求 U1 再写一份相同正文。管理员、部署和故障补充说明仍由 U2 负责，本次没有转交；M10 从 U2 接收已核实的安装步骤，主手册仍须包括安装、配置、运行和使用。

### 现在各人具体交什么

| 负责人 | 当前任务与交付 | 接收与验收 |
|---|---|---|
| M10 | 维护 `docs/submission/manuals/latex/user-manual.tex` 及学生章节、引用图片；输出 `docs/submission/manuals/CampusLoop_User_Manual_Overleaf.zip` 和同版 `CampusLoop_User_Manual.pdf`，保持 8–12 页；填写编译说明和已用图号 | 交 U1/U2 非作者照步骤验证、R1/D1/D2 引用；作者不能给自己签“独立验收通过” |
| U1 | 原六项学生任务的桌面/手机真人记录、卡点与复测照常做；按下表交已有学生截图、`screenshot-index.csv` 和缺图清单；按 M10 手册做非作者抽查 | 学生图留在原 `docs/collaboration/phase-5/experience/student-experience/screenshots/`；原手册草稿如已写，作为输入交 M10，记录实际作者，不继续平行写正文 |
| U2 | 汇总学生/管理员图与可复现场景到原 `docs/collaboration/phase-5/experience/screenshot-index.md`；补后台图、管理员/部署/故障材料；维护非作者验证索引 | 交 M10 选图、R1/R2 写报告、D1/D2 做演示；可编辑源各自唯一维护，不覆盖 M10 正文 |
| T2 / T3 | T2 提供需要写入的交易、举报、处罚和恢复场景及真实结果；T3 在本人目标机器照部署步骤验收 | 缺场景写缺口；M10 写手册不替代 T3 异机验收，也不替组员补写真人记录 |

M10 本次接手为材料归属例外，不改变 U1/U2 原岗位分支 → `team/user-experience` → `main` 的规则。M10 的手册改动通过材料 PR 交非作者 Review 后合入 `main`，不得将本次任务调整写成手册已经完成。

### 学生用户手册必须覆盖哪些图

**不是把网站每个页面、每个弹窗全部塞进去。下表是本组编辑/验收清单，不是老师额外规定的截图张数。** 每行必须有可定位的操作说明；“正文必有”场景要配清楚的关键图，可把同一流程的起点/结果组成可读分图。一张图可以支持多行，但必须分别解释它证明什么；不靠重复页面或缩小几十张图凑覆盖。

| 编号 / 功能 | 手册要讲清什么 | 截图内容与放置要求 |
|---|---|---|
| UM-01 安装、配置、运行与进入网站 | 依赖/准备、实际启动命令、正确 UI/API、首次模型准备与限制；按说明进入网站 | 正文有启动成功后的登录/商城入口图；命令用可复制文字，冗长终端日志留证据，不整屏贴满手册 |
| UM-02 注册、登录、退出与会话异常 | 邮箱/密码格式以当前页面为准；登录、退出、错误后怎么改 | 正文有登录/注册关键入口和一项真实格式或登录错误提示，可做分图；不展示密码和令牌，不写不存在的找回密码按钮 |
| UM-03 商城、搜索与筛选 | 关键词、分类/排序、结果、清除条件和无结果恢复 | 正文有输入关键词后的真实结果与筛选条件；无结果可文字说明或并入错误恢复图，不能只截无查询的首页 |
| UM-04 商品详情、收藏与个人入口 | 图片、名称/价格/状态、联系卖家、收藏、我的商品/收藏；编辑资料与头像入口 | 正文有详情页主要操作区；收藏列表和资料/头像完整步骤写文字，已有图可引用，不要求每个资料弹窗各一张 |
| UM-05 发布、编辑、上下架 | 图片上传、名称/简介/分类/价格、校内位置、提交结果、编辑和状态变化 | 正文有带有效输入/图片的发布或编辑页及发布后的商品结果；不要用只有空字段的表单证明发布成功 |
| UM-06 求购与匹配 | 发布/关闭、预算等条件、查看匹配/匹配通知、返回原页面 | 正文有求购及匹配结果的关键图（可分图）；无匹配按真实状态解释，不为截图伪造命中 |
| UM-07 聊天与报价 | 联系对象、当前商品、发文字/图片、报价/还价/接受/拒绝/撤回入口、同人多商品上下文 | 正文有商品上下文清楚的聊天与报价卡片；多种报价动作可用文字解释，不要求每种卡片全截；仅用获准合成内容 |
| UM-08 订单、见面约定与取消 | 接受报价后去哪找订单、双方身份/状态、未来见面时间与版本确认；取消预订后商品状态 | 正文有订单详情与约定/确认区；取消分支用真实结果图或可追溯证据配文字说明，不暗示履行中订单可随意取消 |
| UM-09 双方完成与评价 | 双方分别确认、单方确认不等于完成、完成后评价入口、提交/刷新后的评价 | 正文有已完成订单与评价结果，可组成分图；不把已提交评价的界面写成还能重复评价 |
| UM-10 通知、举报和申诉 | 通知入口/已读/返回；举报目标/原因/证据/结果回看；警告或禁用通知、申诉入口及限制 | 正文有通知或本人记录页、举报提交关键区与处理结果/申诉关键区的分图；说明举报处理与另行处罚是不同动作，禁用/申诉场景由 T2 隔离环境提供 |
| UM-11 智能说明与语言切换 | 当前界面可见的价格建议、信誉/风险提示、匹配解释和降级限制；中英切换保留品牌/型号/用户名 | 正文有价格建议或实际降级结果并解释含义；信誉/风险仅按真实可见入口说明，不编造额外学生按钮；中英只需一组代表性对照，无需全部页面双份截 |
| UM-12 手机与失败恢复 | 手机下找商品/聊天/订单等操作；返回、错误后修改输入/重试，必要时重新登录 | 正文至少有代表性手机流程图和一项错误后恢复结果（可复用上行图）；其余已执行手机图留索引，不能把模拟视口写成真机测试 |

### 后台与部署图放在哪里

这些由 U2 整理给管理员/部署补充材料及 R1/R2，不把后台所有页面硬塞入学生手册凑页：

| 编号 | 必须覆盖的场景与证据 |
|---|---|
| AD-01 管理入口与权限 | 管理员登录后的控制台/导航；普通学生无后台权限的实际提示或 T1 证据；不公开管理员凭据 |
| AD-02 举报处理闭环 | 举报列表筛选 → 详情/获准证据 → 处理原因和结果 → 举报人回看；同一对象 ID 和阶段对应清楚 |
| AD-03 用户处理与申诉 | 警告/禁用原因、用户收到通知、申诉、独立管理员复核/恢复的当前实际流程；禁止自己复核自己的决定；缺阶段标待补 |
| AD-04 商品治理 | 商品筛选/详情、人工下架原因、前台可见结果与合法恢复；不要把卖家自行下架当管理员治理 |
| AD-05 订单与日志 | 订单筛选/详情/时间线、支持时的争议处理、操作审计；图注解释谁在何时做了什么，导出示例需脱敏 |
| AD-06 个人资料、手机与部署 | 管理员资料/头像入口与保存结果、代表性手机后台；启动/健康成功证据与已验证故障恢复；命令写文本，原日志链接存索引 |

### 每张图怎么交，M10 怎么选

1. 常规只读截图优先用 5174 小林/小周已有历史，后台用获准管理员；正式新建交易、举报、处罚/禁用恢复等写入场景用 T2 隔离环境。先核对实际软件 SHA/UI/API，不因本地拉了新代码就声称运行容器已升级；旧证据保留旧 SHA，不冒充最新。
2. U1/U2 将上表 UM/AD 编号写入现有截图索引，列出原图链接、角色、环境/UI/API、软件完整 SHA、数据版本/对象 ID、语言、桌面/手机尺寸、日期、步骤/图意、脱敏情况和“可用/待补/过期”。已有合格图直接复用；未拍写缺图、负责人及所需场景，不伪造页面。
3. M10 按覆盖选入主手册，标明小节/图号并链接原索引；手册工程只携带编译所需图片副本，原图与来源索引由原负责人维护。R1/R2/D1/D2复用同源图，不另拍一套冲突版本。
4. 正式英文材料用英文 UI、英文图注和步骤；用户昵称/品牌和图片中文字可保留。截图不能露出密码、Cookie、令牌、真实私人聊天或举报原图；敏感内容用获准合成数据或清晰脱敏，不遮住关键按钮/结果。
5. 图注写“角色 + 做了什么 + 结果/下一步”，箭头/数字与正文步骤一致；按最终 PDF 100% 阅读尺寸检查文字、按钮、提示和状态可辨，无裁切/遮挡/拉伸。复杂页面裁出必要操作区或分图，不把整页缩成缩略图。
6. 主手册须满足安装、配置、运行、使用和错误恢复的完整性以及 8–12 页限制。正文图按覆盖与清晰度选择；未选的合格图仍可留索引/证据，不能据此要求全部放进 PDF。U1/U2实际照 M10 手册抽查，T3保留独立安装验证，记录卡点、修改和复测；不得仅以“图够了”验收。

本轮完成条件：M10交同版可编译工程/PDF；UM-01–UM-12逐项有章节/图号或合理的文字覆盖；AD-01–AD-06补充材料有对应图/证据或明确缺口；U1/U2真人任务、截图索引与非作者手册验证仍如实交付。文书组网站截图清单另见 [#144](https://github.com/Huang0283/CampusLoop/issues/144)。
<!-- manual-screenshot-20261128:end -->

---

# [用户体验组] U1/U2 学生与管理员体验、手册和截图交接

<!-- final-demo-screenshots-20261125:start -->
## 2026-11-25 补充：最终截图与演示优先使用小林 / 小周

**最终报告、学生手册、PPT 和视频中的常规学生端截图，优先统一使用日常商城 5174 的现成双演示账号。** 这两人已有成交、聊天及治理/通知等合成历史，适合展示有内容的页面；不要求各组重新注册空账号、另造一套商品或重新积累 15 笔交易。本补充优先于后文旧的“截图账号任选”表述，原分支、交付路径、认领和历史记录保留。

| 角色 | 账号 | 初始化合成密码 | 用途 |
|---|---|---|---|
| 卖家·小林 | `demo.seller@example.invalid` | `CampusDemo@2026` | 查看卖家商品、已有会话、出售订单和评价等记录 |
| 买家·小周 | `demo.buyer@example.invalid` | `CampusDemo@2026` | 查看买家订单、聊天、通知和账号处理/申诉等现有记录 |

- **入口**：`http://127.0.0.1:5174/login`，商城 `/market`，API `8001`；不是 5184/5185 的身份。每个人的 localhost 是自己的电脑，需拉取规定软件版本、完成依赖/翻译模型准备，再运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -NoBrowser`。启动器会按已提交种子导入现成双账号；不会同步其他人之后手动产生的新记录。
- 上表是仓库种子的公开合成凭据，不是对手动改过密码的旧库作保证。登录失败先核对 5174、当前版本、启动导入日志和本机密码变更，不新建 5198、不删除数据库卷、不批量重置密码。详见[统一环境与启动操作单](https://github.com/Huang0283/CampusLoop/blob/main/docs/collaboration/final-environment-20261124.md)和[双账号数据说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/development/demo-dataset.md)。
- 两个身份同时演示请用两个独立浏览器或普通窗口加无痕窗口；同一浏览器普通标签共享登录 Cookie，不能把切号后的页面误当另一人的身份。
- **截图场景**：商品/商城、现有聊天、买到/卖出订单、已完成交易与评价、通知、账号处理/申诉历史，以及能实际取得建议的估价页面。U2先核对具体对象 ID、状态和当前页面是否可用，再交可引用截图；哪个账号确实有哪条记录以实际核查为准，不声称两人各自覆盖全部状态。价格建议如样本不足、低置信度或降级，按页面真实结果说明，不为了截图伪造样本或隐藏限制。
- **后台画面另用日常商城现有管理员**：管理员在 `/admin` 查看与小林/小周相关的商品、订单、举报处理和用户记录；普通双账号没有后台权限，管理员凭据沿用私有交接，不在 Issue 另公开。
- **需要新建交易、举报、处罚、禁用/恢复或故障注入的正式测试/写入操作**，继续由 T2 在 `business/run2` 的 5184/18024 使用其 A/B、R/S 身份执行。不能为补一张图破坏 5174 双账号的稳定历史；确实缺少过程场景时，U2和D2先接收T2的可复现场景、记录环境差异，再补图，不直接改日常库。
- **材料标注**：这 15 笔成交和配套对话/举报记录属于合成演示数据，不是 15 位真人的使用证据、模型效果评估或 T 组全量测试通过证明。截图索引至少写软件 SHA、5174/环境、卖家/买家/管理员角色、页面/对象 ID、语言、视口和日期。正式英文材料使用英文界面及图注；昵称、品牌和图片内原文字样可以保留。截图不展示密码、令牌、Cookie或真实私人内容。
- 交接统一复用 U2 的截图索引和原图；R1/D1/D2引用该来源，不各自维护不同账号/不同软件版本的重复截图包。真人 U01–U08 任务、非作者手册可用性复核和 T3 本人异机验收仍须按原要求实际完成。

### 本组具体接收与交付

U1：以小林/小周为学生手册主线，讲清买卖双方操作，真人任务另记。U2：先检查现成记录，建立场景→角色→对象ID→页面→原图→软件SHA的索引，补后台管理员对应截图，标出缺失/不可演示状态；将图包和限制交R1/R2、D1/D2。demo-data-plan.md登记复用方案，不再安排重造历史。

<!-- final-demo-screenshots-20261125:end -->

<!-- final-environment-20261124:start -->
## 2026-11-24 最终协作环境与统一软件基线

**当前软件基线：`edb9e32871eac2966750993294078acbfdba65f9`。后文旧 SHA/5198 等只保留为历史记录，不能继续作为本轮启动指引。** 这是固定协作入口，不代表所有组员任务已经验收完成。各人材料分支继续原分工；软件版本与材料 commit 分开写。

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



**当日晚间补丁**：当前基线已修复中英切回中文时原商品名被重译的问题；商城无关键词浏览默认“推荐”，常见分类先于其他分类，搜索/分类仍可找到全部商品。维护者本机日常/T1/T2保留原数据升级并只读核查；成员自己的电脑仍需按操作单升级。旧证据保留原SHA，不重写为新版本通过。



**新商品翻译升级**：当前版本改用本机 HY-MT1.5-1.8B 整句翻译，保留品牌/型号/数量/原语言，不覆盖商品原始字段。首次或从旧版升级需运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-translation.ps1 -Prepare`，下载约4.1GB权重，FP32运行约需8GB内存，正常推理不联网。16条新句子语义样例和独立库两件商品实际上传/往返/刷新已验证；不等于任意输入100%准确。首次未缓存内容需要数秒，冷启动更慢。[模型准备与限制](https://github.com/Huang0283/CampusLoop/blob/main/docs/development/frontend-bilingual-20261103.md)。

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
