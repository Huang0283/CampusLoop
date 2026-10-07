# Phase 2 前端验证记录

## 验证对象

- 代码提交：`fe8b9b0`
- 基线提交：`75014b4`
- 日期：2026-09-23
- 环境：Windows、Node.js `v24.21.0`、npm `11.19.0`

## 可复现命令

在 `frontend/` 执行：

```bash
npm run sdk:generate
npm run sdk:check
npm run lint
npm run build
```

实际结果：四条命令退出码均为 0；SDK 重新生成后无内容漂移；Vite 成功生成生产构建。构建存在单个 bundle 超过 500 kB 的性能警告，不影响 Phase 2 原型验收，代码拆分由后续性能任务处理。

## 浏览器场景

使用 Chromium 153、桌面 1440x900 和移动端 390x844 验证：

1. 登录页可以分别进入错误凭据、令牌失效和账号禁用状态，三种反馈均保持在登录页。
2. 游客访问 `/profile?tab=activity#bio` 后进入登录；正常登录返回原始 pathname、query 和 hash。
3. 390px 宽度下桌面侧栏不占空间，底部固定显示首页、求购、聊天、交易四个入口。
4. 桌面登录页控件无重叠，四个认证演示状态均可选择。

自动化冒烟结果：3 个场景通过，耗时约 7 秒。测试覆盖认证异常、完整来源恢复和移动端导航布局。

## 未通过本记录声称完成的内容

- M3/M4 页面尚未全部调用动作守卫，因此公开页面私有动作的端到端闭环仍待各页面 Owner 验证。
- 本记录不是 M5/M6/M7/M8 契约签字，也不是 M10/M1 阶段验收。
- 本记录不证明 Phase 3 真实 API 已接入。

## M3 PR #63 补充验证

- 日期：2026-09-27。
- 合并基线：最新 `phase2/frontend-prototype`。
- 检查范围：商品详情路由参数、求购匹配路由、游客动作守卫、求购搜索/筛选/排序/分页和三份 M3 交付文档。
- 可复现命令：`npm run sdk:check`、`npm run lint`、`npm run build`。
- 手工场景：游客打开商品/求购详情；游客点击收藏、联系、举报和匹配；求购关键词、预算、成色、排序、重置和翻页；无效 ID、接口错误及空结果。

## M3 第二阶段个人收尾验证

- 日期：2026-10-08。
- 分支：`task/m3-p2-closeout`。
- 基线：`phase2/frontend-prototype` 的 `a4b06fa`。
- 环境：Windows、Node.js `v24.21.0`、npm `11.19.0`。
- 自动命令：`npm run lint`、`npm run build`、`npm run sdk:check`、`git diff --check`；全部退出码为 0，生成 SDK 无内容漂移。
- 构建说明：生产构建成功；仅保留既有的单 bundle 超过 500 kB 警告，不阻塞 Phase 2 可点击原型验收。
- 商品闭环：登录后从 `/publish` 新建商品，在 `/my-products` 查看；进入 `/product/:id/edit` 修改；验证上下架、删除确认和刷新后状态。
- 草稿闭环：修改商品/求购表单后刷新，确认草稿恢复；点击返回按钮确认离开提示；成功提交后确认草稿清除。
- 求购闭环：从 `/wanted/publish` 新建，进入详情；编辑并保存；二次确认关闭；进入匹配结果查看规则降级、原因和非成交概率说明。
- 失败入口：`productMockUploadError`、`productMockSubmitError`、`wantedMockLoadError`、`wantedMockSubmitError` 四个 sessionStorage 标记。
- 边界：这是 Phase 2 可点击 Mock 验收，不声称真实 API、数据库、上传、智能服务或跨组契约已经完成。
