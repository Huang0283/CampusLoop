# 阶段 5 前端验证记录

> 2026-10-25 PR #120 ????????????????????????? [M2 ??????](m2-pr120-acceptance.md)???????????????????????

更新日期：2026-10-24
本地代码基线：7d16270
工作分支：prep/m2-p5-main-alignment

本记录汇总分批执行的本地验证。
尚未取得统一发布候选及 M10 同提交复验结果，
不作为阶段最终验收结论。

## 当前代码对应检查

| 检查 | 实际结果 | 证据 |
| --- | --- | --- |
| ESLint | 通过；zod 修复后再次通过 | verification-output/lint-current.txt |
| TypeScript 和生产构建 | 主题及短文字修复过程中通过 | frontend-build-guide.md、accessibility-review.md |
| 当前依赖审计 | 0 项漏洞；zod 更新为 4.6.7 | verification-output/dependency-audit-current.txt |
| 表单可读名称 | Edge、Chrome 各 37 项通过 | verification-output/accessibility-scan-after.txt |
| 11 页自动文字对比度 | Edge、Chrome 均未检出违规 | verification-output/accessibility-manual-regression.txt |
| 短文字与图片覆盖层 | 每个浏览器 8 处数值断言通过 | verification-output/accessibility-manual-regression.txt |
| 人工核对定位 | 原 16 处已完成本地核对或补修验证 | accessibility-review.md、manual-review/before-short-text-fix/ |

最后一轮页面扫描和短文字回归共 4 项通过，耗时 28.3 秒。
构建仍有大体积主入口警告，未通过修改阈值隐藏。

## 已有分批验证

| 范围 | 结果与性质 | 证据 |
| --- | --- | --- |
| 干净安装、SDK 漂移、lint 和构建 | ad28a23 对应依赖修复阶段通过；生成内容归一化比较无差异 | dependency-audit.md |
| 真实双账号交易等旅程 | 6 项通过，真实 API | shell-defects.md |
| 真实管理员分页与会话撤销 | 1 项通过，真实 API | shell-defects.md |
| Edge 界面及商品治理 | 8 项通过，含 1 项真实商品治理 | browser-responsive-report.md |
| Edge 键盘与会话恢复 | 6 项通过，模拟会话 | browser-responsive-report.md |
| Chrome 界面、键盘及会话恢复 | 13 项通过，模拟接口 | browser-responsive-report.md |
| 交易确认与用户抽屉焦点 | 双浏览器 4 项通过，契约模拟 | verification-output/dialog-keyboard.txt |
| 通知共享轮询及已读同步 | 双浏览器 2 项通过，契约模拟 | verification-output/notification-sync.txt |
| 六页请求与控制台采样 | 未捕获警告、错误或非预期 API；通知重复轮询已修复 | request-console-review.md |
| 源码专用异步状态与错误边界 | 开发服务器 1 项通过 | verification-output/async-state-source.txt |
| 游客实际加载 JS | 首页减少约 19.0%，登录页约 35.1%；为当时构建的解压后体积 | verification-output/initial-js.txt |

以上验证发生于不同提交或其对应工作区，
不得合并表述为最终候选一次完整回归。

## 环境与复现

- 独立检出：D:\CampusLoop-p5-align-1b3385a。
- Docker 项目：campusloop-p5-alignment，数据库迁移曾确认 0010 head。
- API：http://localhost:8001。
- 开发服务器或生产预览：http://localhost:5173。
- Node 24.14.1、npm 11.11.0，为此前记录版本。
- 2026-10-23 曾记录 Edge 155.0.4283.62、Chrome 156.0.8078.48。
- 最终候选运行时需重新登记实际浏览器和工具版本。
- 当前本机后端拒绝 localhost:5174 的跨域会话恢复，请核对 Origin。

构建前设置 VITE_API_BASE_URL，具体命令见 frontend-build-guide.md。
执行 npm ci 前停止同目录的 Vite，避免 Windows 原生模块占用。

生产预览执行功能回归时，排除源码专用用例：
npm run test:live -- --grep-invert "shared async component"

源码专用用例在开发服务器上单独执行：
npm run test:live -- m2-async-state.spec.ts

双浏览器检查使用 playwright.browser.config.ts，
并设置 CAMPUSLOOP_UI_URL=http://localhost:5173。

## 最终候选待执行

- 在最终锁文件和候选提交上重新干净安装、检查 SDK 漂移、lint、测试及构建。
- 对主题修复后的候选补齐完整界面、移动宽度和关键键盘流程冒烟。
- 固定 API、智能版本及部署地址，复核真实服务与失败恢复。
- 由 M10 在同一集成提交复验，登记缺陷及接收结论。
- M1 确认最终标签和范围；当前无最终发布标签及 P0/P1 清零结论。

## 2026-10-24 本地候选整套回归结果

应用及测试基线：e66980d。

- npm ci 成功，审计报告 0 项漏洞。
- SDK 生成及 TypeScript 检查通过，生成内容差异退出码为 0。
- lint 和生产构建通过，主入口约 906.65 kB，体积警告保留。
- 生产预览执行 42 项测试：41 项通过，1 项失败，耗时 2.7 分钟。
- 源码专用异步组件测试已另行通过，不包含在本轮 42 项中。
- 实际浏览器版本：Playwright Chromium 156.0.8078.4、
  Edge 156.0.4314.42、Chrome 156.0.8078.48。
- 本轮 42 项使用默认 Playwright Chromium 项目执行。

失败项为真实双账号交易旅程：
确认见面后未找到“我已完成交易”按钮。
失败快照中的订单 6004 为待约定，买家已确认、卖家未确认。
具体接口原因仍待定位，由 M2 汇总证据，M4/M6 协同核对。
本轮不能记为全量通过，也不作为缺陷清零或正式发布结论。

证据：
verification-output/clean-check-e66980d.txt；
verification-output/live-preview-e66980d.txt。

## 2026-10-24 见面确认死锁证据

本地候选 e66980d 的生产预览回归为 41 项通过、1 项失败。
干净安装、SDK 内容无漂移、lint 和生产构建均通过，依赖审计为 0 漏洞。

失败发生于真实双账号交易，订单编号 6004。
2026-10-24 14:19:38 UTC（北京时间 22:19:38）的日志显示：

- PostgreSQL 报告 deadlock detected。
- 见面确认 POST /orders/{orderId}/meetup/confirm 返回 503，
  requestId 为 96bb54c14e7f。
- 随后另一条见面确认请求返回 200，
  requestId 为 682da9c459cb。
- 页面快照显示买家已确认、卖家未确认，订单仍为待约定。

现有证据确认数据库死锁影响了见面确认。
具体锁链和修复方案由 M6 核对，M4 配合验证交易及失败恢复；
M2 汇总证据并在修复后复验。
当前不能登记为整套回归通过。

证据：
verification-output/clean-check-e66980d.txt；
verification-output/live-preview-e66980d.txt；
verification-output/meetup-confirm-diagnostic.txt。
