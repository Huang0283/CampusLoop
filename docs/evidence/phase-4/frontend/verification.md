# M2 Phase4 验证
日期 2026-10-12；代码 8803e639302324e13183af336431dbbb550aea2f，后端 main 的 Phase3 实现；实际环境见 integration-regression.md。
从 frontend 运行：
```powershell
npm run sdk:check
npm run lint
npm run build
$env:CAMPUSLOOP_UI_URL='http://localhost:5174'
npx playwright test journey.spec.ts
npx playwright test m2-phase4.spec.ts m2-async-state.spec.ts
```
结果：SDK 无语义漂移；lint 无警告；build 成功（体积警告）；已有 5 项、新增 6 项 UI 通过。
补充举报POST/私密Blob/不确定结果幂等重试契约测试另1项通过，新增M2总计7项；lint再次通过。属于夹具，不能当真实举报后台完成。
真实管理员测试依赖隔离 seed 管理员；不要在生产执行禁用测试。已有数据库聚合确认 admin_users_read、admin_risk_clues_read、admin_user_disabled、admin_user_active 存在；聚合只证实审计机制，不冒充每次测试的唯一审计行。
首次新增测试的按钮精确文字及动态模块加载选择失败，已改为表单提交按钮、实际列表响应读取 total；当前最终完整套件通过。测试日志/私密截图不提交仓库。
整体端到端尚不能通过：报告管理接口缺失、商品治理契约缺失、正式语义候选 NO_GO。交接文档记录 Owner 与复验步骤。

## M4 追加（2026-10-19）

- 分支 `task/m4-p4-governance-regression`，提交 `6c69925`（已同步 main 的 #99/#103 修复）。
- 逻辑层：`npm run test:m4` 15 项通过；`npm run test:transaction` 8 项通过；`npm run lint`、`npm run build` 通过。
- 浏览器层：`CAMPUSLOOP_UI_URL=http://localhost:5173 npx playwright test`，在 API `8001` + PostgreSQL/Redis/MinIO 上按 spec 分批执行，共 23 项通过（journey 6、m2-phase4 6、m3-phase4 10、m2-async-state 1）。
- 分批原因：注册限流为每 IP 10 次/小时，执行前清空 Redis `auth:*` 键；未修改鉴权策略。
- 详情见 `m4-governance-regression.md`；本段是 M4 自报证据，不代替 M10/M1 验收。
