# 前端文档索引与命名规范

## 命名规范

- 阶段任务书统一使用 `frontend-phase-<阶段号>-<主题>.md`，放在 `docs/issues/`。
- 前端公共文档使用 `<两位序号>-<主题>.md`，放在 `docs/frontend/`。
- 成员文档使用 `docs/frontend/m<成员号>/<两位序号>-<主题>.md`。
- Markdown 一级标题统一使用 `M<成员号>-<两位序号> 中文标题（阶段）`；公共文档使用 `Frontend-<两位序号>`。
- 文件名仅使用小写 ASCII、数字和连字符；正文使用中文术语。

## 阶段任务书

- [第一阶段：范围、信息架构与低保真原型](../issues/frontend-phase-1-experience.md)
- [第二阶段：可点击原型与接口契约](../issues/frontend-phase-2-prototype-contracts.md)
- [第三阶段：MVP 真实接口联调](../issues/frontend-phase-3-mvp-integration.md)
- [第四阶段：智能结果、后台与冻结](../issues/frontend-phase-4-ai-integration-freeze.md)
- [第五阶段：前端稳定化与交付](../issues/frontend-phase-5-stabilization-delivery.md)
- [四组五阶段 Issue 总索引](../issues/README.md)

`phase-1` 至 `phase-5` 表示开发阶段，不再把 GitHub Issue 编号写入文件名，避免把 Issue 编号误认为阶段号。

## 第一阶段交付物

### 公共

- [Frontend-01 核心用户旅程](01-core-user-journeys.md)

### M2：框架、身份与页面规范

- [M2-01 前端现状审计](m2/01-frontend-audit.md)
- [M2-02 页面与路由总表](m2/02-page-route-table.md)
- [M2-03 导航结构](m2/03-navigation-structure.md)
- [M2-04 身份、资料流程与页面权限矩阵](m2/04-auth-profile-and-permissions.md)
- [M2-05 设计、公共组件与页面状态规范](m2/05-design-components-and-page-states.md)
- [M2-06 逐页面五类状态矩阵](m2/06-page-state-matrix.md)

### M3：市场、商品与求购

- [M3-01 市场与求购字段、交互和状态](m3/01-market-fields-interactions-and-states.md)
- [M3-02 商品与求购 Mock 流程](m3/02-product-and-wanted-flows.md)

### M4：聊天、订单与交易

- [M4-01 订单状态机与操作矩阵](m4/01-transaction-state-machine.md)
- [M4-02 交易异常交互规范](m4/02-exception-interactions.md)
- [M4-03 双账号交易泳道图](m4/03-two-account-swimlane.md)
- [M4-04 个人任务清单](m4/04-task-checklist.md)
- [M4-05 实时通信方案](m4/05-realtime-architecture.md)
- [M4-06 按钮级权限](m4/06-button-permissions.md)
- [M4-07 按钮级权限验收方案](m4/07-acceptance-button-permissions.md)

### 验收与追踪

- [Frontend-02 第一阶段本地验收与交付追踪](02-phase1-local-acceptance.md)

## 阶段边界

第一阶段负责页面范围、交互草图、低保真或静态 Mock 原型、核心旅程，以及状态与权限规则的书面定义。第一阶段不强制把所有行为实现为正式前端功能，但交付物必须清楚表达：

- 聊天列表与聊天详情的衔接关系，核心用户旅程不存在设计断点。
- 用户、商品、交易和聊天的举报入口及其页面位置。
- 未完成或已取消交易不能进入正常评价流程的规则。
- 不同订单状态和角色允许、禁止操作的矩阵。

第二阶段负责把上述设计做成可点击 Mock 原型并冻结接口契约；第三阶段才接入真实认证、HTTP/WebSocket、数据持久化和真实上传，完成基础交易闭环。第四阶段接入智能结果和最低管理后台并冻结功能，第五阶段只做修复、回归、文档和发布。

因此，缺少入口设计、状态规则或权限矩阵属于第一阶段交付缺失；可点击 Mock 与冻结契约在第二阶段验收；真实接口和持久化行为在第三阶段验收。任何阶段都不能拿下一阶段尚未提供的能力作为当前阶段验收前提。
