# Phase 2 前端交付登记

## 当前基线

- 小组分支：`phase2/frontend-prototype`
- 本轮 M2 修复分支：`task/m2-p2-acceptance-fixes`
- 修复基线：`75014b4`
- M2 修复提交：`fe8b9b0`
- 本文件只登记已合并或已提交证据，不代表 M3/M4 和小组关闭门禁已经完成。

## M2 已提交

- FE2-01：`route-role-map.md`、路由守卫、`useRequireAuthAction`、桌面/移动端共享导航。
- FE2-02：`auth-profile-prototype.md`、登录/注册/资料原型；登录页可以演示成功、错误凭据、令牌失效和账号禁用。
- FE2-03：`component-specification.md`、`PageState` 五态组件及真实公共组件 API。
- FE2-04：`page-api-map.md`、生成 SDK 入口和当前契约缺口登记。
- FE2-12：`contract-review.md`、`mock-replacement-plan.md`、本目录验证和交接记录。
- FE2-11（M2 范围）：`page-state-matrix.md`，逐页登记 M2 公共、认证、资料和管理入口的加载、空、成功、失败、无权限状态或不适用理由。

## M3 已提交

- FE2-05：`market-prototype.md`，商品详情公开读取、收藏/联系/举报动作守卫和连续返回路径。
- FE2-06：`product-management-prototype.md`，图片上传、商品创建、幂等与失败反馈原型。
- FE2-07：`wanted-ai-result-prototype.md`，求购公开读取、搜索/筛选/排序/分页和个性化匹配解释原型。
- 任务 PR：#63 `task/m3-transaction-pages -> phase2/frontend-prototype`。

## 尚未计入完成

- M4 的 FE2-08 至 FE2-10 交付和任务 PR 验收。
- M3、M4 各自页面的五态矩阵；M2 范围已登记，但不能据此勾选全组 FE2-11。
- M3/M4 在公开业务页面接入 `useRequireAuthAction` 后的端到端动作回跳验收。
- M5/M6/M7/M8 契约对签、M10 可测试性验收、M1 范围复核。
- 小组汇总 PR 合入 `phase2/integration`。

因此 Issue #18 必须保持打开，不能由本轮 M2 修复单独关闭。
