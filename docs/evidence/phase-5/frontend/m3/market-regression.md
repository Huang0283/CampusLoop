# M3 第五阶段市场回归（FE5-04）

复验日期：2026-10-25。执行角色：M10；M3 原交付 PR #123。
原组分支：`2dd97c557510a6cb6492d11ed1d86e7fdbf931f9`；接入 main `1b3385ac0df557ddf34d7d9d52d608a9c26e7df7` 的合并提交：`d5965b3`。
本报告对应修复 PR 中的源码和测试，以 PR 最终 HEAD 为准。

## 发现与修复

- P5 原分支未包含 main 中第四阶段集成和原界面恢复，不能把旧分支绿灯当作最终验收。通过真实 merge 引入 main，保留 M3 的 200 字符限制与断网提示。
- 100 字符连续英文商品名在 375px/1440px 卡片内被截断；昵称同样溢出。新增测试先复现失败，再仅调整市场/求购卡片的换行，保留原布局。
- 补充能够重复执行的测试，替代没有步骤和原始断言的宽泛“全部通过”结论。

## 自动化场景与结果

`frontend/tests/live/m3-phase5.spec.ts` 共 5 项，在 Chromium 和 Microsoft Edge 均通过：

1. 375px：100 字符标题、128 字符地点、50 字符昵称、3000 字符求购说明。检查页面无横向溢出，同时检查卡片内部文本没有被隐藏截断。
2. 1440px：同样的大文本数据检查。
3. 市场/求购搜索限制 200 字符；请求断网后出现错误，草稿仍在；重试恢复列表，旧错误消失。
4. 关键词、分类、成色、排序切换第二页并刷新；验证 URL 与实际请求的筛选值保持一致。
5. 图片上传 503 后保存被阻止；移除失败图片并重新上传可恢复。保存请求人为挂起期间显示加载状态；返回 503 后标题、价格、地点和图片保留，并断言实际提交体。

复现（frontend 目录，先在本检出启动 Vite）：

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5185 --strictPort
# 在另一终端：
$env:CAMPUSLOOP_UI_URL='http://127.0.0.1:5185'
npx playwright test tests/live/m3-phase5.spec.ts tests/live/m3-phase4.spec.ts tests/live/interface-restoration.spec.ts
```

`npm run lint`、`npm run build` 通过；构建仍有大文件分块提示。本次使用真实生产路由/SDK组件和明确的 API fixtures，不访问日常数据库，不证明真实接口持久化或智能模型质量。最终组间集成、发布环境和 M10/M1 阶段收口需在统一提交复验。
