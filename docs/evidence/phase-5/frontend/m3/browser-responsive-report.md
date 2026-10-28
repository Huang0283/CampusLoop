# M3 浏览器与响应式复验（FE5-08，FE5-10 的 M3 部分）

2026-10-25；Windows、Node 24.21.0；Playwright 1.64.0。
隔离检出 `.codex-tmp/m3-p5-repair`，分支 `fix/m3-p5-acceptance`，预览 `http://127.0.0.1:5185`。日常 main、账号库和媒体卷未修改。

## 已执行范围

- Playwright bundled Chromium 156.0.8078.4；Microsoft Edge 152.0.4191.53（channel=`msedge`）。不能将 bundled Chromium 冒称为已安装的 Google Chrome。
- 375px 和 1440px 浏览器 viewport；这是响应式模拟，未执行真实手机 Safari。
- `m3-phase4.spec.ts` 10 项、`interface-restoration.spec.ts` 7 项、`m3-phase5.spec.ts` 5 项，按文件复验均通过。
- 原界面测试覆盖商品图片切换、卖家/地点/描述、聊天两栏和气泡/切会话/发送、个人资料、求购/交易卡片、学生路由及管理员布局。确认接回 main 没有将界面替换成简易表单。
- 大文本测试除页面 scrollWidth 外还检查卡片内部，避免用 overflow:hidden 假装没有溢出。

Microsoft Edge 可用临时 Playwright 配置复验，在 frontend 目录创建临时配置并运行：

```ts
import config from './playwright.config'
export default { ...config, use: { ...config.use, channel: 'msedge' } }
```

```powershell
$env:CAMPUSLOOP_UI_URL='http://127.0.0.1:5185'
npx playwright test tests/live/m3-phase5.spec.ts tests/live/m3-phase4.spec.ts tests/live/interface-restoration.spec.ts --config playwright.edge.config.ts
```

另执行干净 `npm ci`、lint/build。所有页面测试使用明确 API fixtures；真实接口和刷新后的数据库持久化需在统一发布候选复验，不以本报告关闭前端全组 Issue #34。阶段联合验收/依赖升级/正式模型能力均不在本次已通过结论内。
