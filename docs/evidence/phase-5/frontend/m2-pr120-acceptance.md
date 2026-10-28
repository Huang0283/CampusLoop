# M2 第五阶段 PR #120 验收与 CI 修复

日期：2026-10-25。关联 Issue #34；仅验收 M2 的 FE5-01/02/03/09 及 FE5-08/10 的个人交付部分。

## 候选与环境

- PR 分支：`task/m2-p5-frontend-release`，目标为 `phase5/frontend-release`。
- 原交付 `43f36f5`；目标组分支 `99d849e`（含已验收 M3 修改），以合并提交 `3ed2cb4` 同步，未覆盖 M3。
- 本轮代码修复：`a47a9f6`。实际验收检出：`.codex-tmp/m2-pr120`，本地工作分支 `fix/m2-pr120-acceptance`。
- 真实 API：`http://127.0.0.1:8018`，容器 `campusloop-m2-p5-audit`；挂载本候选后端源码，使用独立数据库 `campusloop_m6_p5_audit`、Redis DB15 和独立 MinIO。
- 开发模式：`http://127.0.0.1:5191`；生产预览：`http://127.0.0.1:5192`。生产构建显式指定 `VITE_WS_URL=ws://localhost:8018/ws`，不同于 API 派生的 `ws://127.0.0.1:8018/ws`。
- 这些端口和账号仅用于验收。日常环境仍由根目录 `scripts/start-local.ps1` 管理，网站 `http://127.0.0.1:5174/market`、API `http://127.0.0.1:8001`；未清空日常数据库、账号或媒体卷。

## CI 为什么失败

[失败运行 40104200767](https://github.com/Huang0283/CampusLoop/actions/runs/40104200767) 的失败步骤是
`Live browser acceptance against the real API and storage`。该步骤放在名为
`backend / migrations, seed & tests` 的 job 里，因此 GitHub 显示 backend 红灯，
但此次实际失败为 9 个 M2 浏览器用例，34 个通过；并非迁移或 Python 测试失败。

五份 M2 测试文件将接口 origin 写死为 `http://localhost:8001`，而 CI 的 Vite
明确设置 `VITE_API_BASE_URL=http://localhost:8000`。预设会话和业务响应未被拦截，
导致页面无法进入测试所需状态，最终报商品名称、交易按钮、管理员抽屉或通知不存在。
本地按 CI 地址配置复现了两个会话用例失败；修复后，同一配置的九项专项全部通过。

修复使用统一 `tests/api-fixture.ts`：只拦截应用 fetch/xhr，按接口路径、方法返回预设响应，
让页面和静态资源继续加载真实前端。未预期接口仍明确失败并计入断言，不转发真实写请求，
没有增加 skip、宽松断言、重试次数或延长超时来掩盖失败。

## 额外发现与修复

FE5-03 要求固定 API/WS 配置规则，但聊天原来未读取 `VITE_WS_URL`，文档也将它列为缺口。
现在 SDK 的 `webSocketUrl` 供真实聊天使用：显式配置优先，留空从 API 推导 `/ws`，
支持 HTTPS 对应 WSS，拒绝错误的 HTTP WebSocket 配置。
补充独立网关/默认地址测试，以及生产预览聊天实际 socket 地址断言；修正文档与 `.env.example`
中遗留的 Mock 说明。没有恢复 Mock store 或更换页面布局。

## 按任务验收

- **FE5-01 外壳与认证**：验证游客深链接登录返回并保留 query、恢复失败原地重试、刷新恢复、退出、401 续期、跨标签页换号保护、角色拒绝、404/错误边界、离线和导航焦点。契约故障注入与真实 API 旅程分别记录，不互相冒充。
- **FE5-02 可访问性**：上传入口 Tab/Enter/Space、账号菜单方向键/Escape、交易确认取消、管理员抽屉焦点循环及返回通过。Chrome/Edge 专项 20 项通过；页面标签、抽样文字对比度和图片覆盖层亦纳入全套回归。axe 抽样无已检测违规；工具的 incomplete 项不视为完整 WCAG 认证。
- **FE5-03 构建与请求**：独立 `npm ci`、SDK 生成及 Git 内容漂移检查、lint、生产构建通过；`npm audit --registry=https://registry.npmjs.org` 为 0 漏洞。当前机器的 npmmirror 不提供 audit API，不能把它返回的 404 当作扫描通过。六页请求采样均无未预期 API/控制台或页面错误，通知保持一个轮询来源。
- **FE5-09 文档**：已有页面/身份/路由/API/状态矩阵和用户手册，补正构建变量、每日启动地址、测试环境和源码专项的执行边界。
- **FE5-08/10 个人交付**：本报告、原始验证输出和 PR 提供可复验候选；不代替全组统一发布候选、签字或关闭整个 Issue #34。

## 本轮运行记录

- 首轮开发回归 48/49：唯一失败为验收 MinIO 公共桶当时仍为 private，图片 naturalWidth 为 0。修正的仅是独立验收桶权限：public download，private none；不是修改产品断言或日常数据。
- 权限修正后，生产预览 48/48，通过真实注册、上传、发布、收藏、聊天报价、见面双方确认、完成和评价，以及治理、权限、桌面/移动与失败恢复。
- 生产预览仅排除必须从 Vite 源码加载的 `shared async component`；该项由开发服务器完整回归覆盖。开发最终结果见随附 `live-development.txt`。
- 原始输出：[生产预览](verification-output/m2-pr120-20261025/live-production.txt)、[开发模式](verification-output/m2-pr120-20261025/live-development.txt)、[请求采样](verification-output/m2-pr120-20261025/requests.txt)、[生产构建](verification-output/m2-pr120-20261025/build.txt)。

## 接收边界

M2 的上述代码、构建和浏览器范围以本轮记录为准，旧文档的 41/42 是历史失败记录，不能作为本轮结果。
仍保留两个发布边界：

- 主入口约 906.92 kB、gzip 291.20 kB，仍有 500 kB 提示；没有提高阈值或宣称体积告警清零。
- 历史双账号见面确认死锁是真实后端缺陷，不能归咎于上述 CI 端口问题。本轮真实交易通过不证明旧后端不存在并发风险；`phase5/backend-release@05f41ed` 已包含 M6/M5 相关验收修复，其中认证锁调整需随统一集成进入最终候选。本 PR 不混入另一组的整套后端提交，最终集成仍需使用已验收后端再复验。

推送后还需查看 GitHub 新运行结果；本报告不预填远端 CI 通过，不合并 main，不关闭 Issue #34。
