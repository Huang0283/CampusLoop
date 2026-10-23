# 阶段 5 浏览器与响应式验证记录

日期：2026-10-23
工作分支：prep/m2-p5-main-alignment
应用基线：1b3385a；前端实现提交：ae2edd0。
浏览器配置及会话测试提交：d5ad7a2。
本记录为本地验证证据，团队交叉评审与 M10 最终候选复验待完成。

## 环境与结果

| 浏览器 | 版本 | 测试范围 | 结果 | 原始日志 |
| --- | --- | --- | --- | --- |
| Microsoft Edge | 155.0.4283.62 | 界面恢复 7 项、真实商品治理 1 项 | 8 passed，57.0 秒 | [日志](verification-output/edge-interface.txt) |
| Microsoft Edge | 155.0.4283.62 | 账号菜单、上传键盘、深链接与会话恢复 | 6 passed，10.9 秒 | [日志](verification-output/edge-keyboard-session.txt) |
| Google Chrome | 156.0.8078.48 | 界面恢复、账号菜单、上传键盘、深链接与会话恢复 | 13 passed，44.3 秒 | [日志](verification-output/chrome-interface.txt) |

前端使用生产构建预览：http://localhost:5173。
真实商品治理使用独立 Docker 项目 campusloop-p5-alignment，API 为 http://localhost:8001，数据库版本为 0010。

Edge 执行时应用实现对应 ae2edd0；当时工作区中的浏览器配置和会话测试随后纳入 d5ad7a2。Chrome 直接在 d5ad7a2 上执行。

## 覆盖范围

- 两种浏览器均验证 23 个学生页面路由在 1440×1080 和 390×844 下的渲染、水平溢出与运行时错误。
- 管理员页面验证 1440×1080、390×1080 下的管理标签、表格入口与水平溢出。
- 聊天界面另验证 1720×960 的布局，以及 390×667、390×568 下发送按钮与底部导航的位置。
- 商品图片切换、收藏状态、聊天输入及会话刷新、个人资料、求购和交易卡片均有模拟接口检查。
- 两种浏览器均验证上传按钮 Tab、Enter、Space，以及账号菜单方向键、Esc 关闭和焦点返回。
- 两种浏览器均验证游客深链接登录返回、查询参数保留，以及会话恢复失败后的原地址重试。
- Edge 另通过真实商品发布、管理员下架、游客不可见、卖家禁止自行上架、管理员恢复后的公开可见性检查。

界面恢复、键盘和会话用例使用模拟接口。真实商品治理结果单独记录，不将模拟结果作为真实后端交付结论。

## 代表性截图

截图由界面恢复用例生成，使用模拟用户、商品和聊天数据。

| 浏览器 | 桌面市场 | 移动市场 | 移动聊天 |
| --- | --- | --- | --- |
| Edge | [截图](screenshots/edge/market-desktop.png) | [截图](screenshots/edge/market-mobile.png) | [截图](screenshots/edge/chat-mobile.png) |
| Chrome | [截图](screenshots/chrome/market-desktop.png) | [截图](screenshots/chrome/market-mobile.png) | [截图](screenshots/chrome/chat-mobile.png) |

完整截图保留在本机对应的 aligned-edge、aligned-chrome 证据目录。

## 验证命令

配置：frontend/playwright.browser.config.ts。

- Edge：interface-restoration.spec.ts、product-governance.spec.ts，使用 --project=edge。
- Edge：m2-shell-phase5.spec.ts、m2-upload-keyboard.spec.ts、m2-account-menu-keyboard.spec.ts，使用 --project=edge。
- Chrome：interface-restoration.spec.ts、m2-shell-phase5.spec.ts、m2-upload-keyboard.spec.ts、m2-account-menu-keyboard.spec.ts，使用 --project=chrome。

完整命令与输出见原始日志。

## 待完成事项

- 完整表单标签、对比度及交易确认弹窗的专项检查。
- 正式发布基线接入、M3/M4 交叉评审及 M10 在最终候选上的复验。
- 最终页面/API 矩阵、用户手册和交付清单同步。

本记录不作为阶段 5 全部完成、P0/P1 缺陷为零或关闭 Issue #34 的依据。
