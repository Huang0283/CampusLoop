# CampusLoop Frontend

React、TypeScript、Vite、Ant Design、React Router 和 Zustand。当前生产路由由 `src/router/index.tsx` 指向 `src/live/`，通过 `src/sdk/` 调用真实 API；`src/pages/` 的早期原型用于界面对照，不应恢复为生产 Mock 数据源。

## 日常运行

在仓库根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

首次运行需先在本目录执行 `npm ci`。日常页面为 http://127.0.0.1:5174/market ，API 为 http://127.0.0.1:8001 。完整依赖、数据保护和停止命令见[统一启动说明](../docs/development/local-startup.md)。当前检出分支决定预览内容，不代表已合入 main。

## 单独开发前端

仅在已经确认 API/数据环境、且未同时运行日常前端时，在本目录执行：

```powershell
npm ci
$env:VITE_API_BASE_URL = 'http://127.0.0.1:8001'
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

此命令只启动前端。写入测试须另用专用审计环境；不要将日常账号库当作验收库。使用 `/chat`、`/transactions`、`/notifications`、`/report` 需登录，`/admin` 需管理员权限；游客可浏览 `/market`、`/product/:id`、`/wanted` 及公开求购详情。

## 契约与检查

- 唯一 HTTP 契约：[openapi/campusloop.v1.yaml](../openapi/campusloop.v1.yaml)。旧手写 API 概要已移除。
- 生成配置：`openapi-ts.config.ts`；稳定消费入口：`src/sdk/index.ts`；`src/sdk/generated/` 禁止手工修改。
- 浏览器会话与实际 WebSocket 行为以 SDK/live 实现为准，不再按 Phase 1/2 的 Mock 开关说明配置当前生产路由。
- 阶段契约和交接要求：[SDK 阶段闭环](../docs/api/openapi-sdk-stage-closure.md)。

在本目录执行：

```powershell
npm run lint
npm run build
npm run sdk:check
```

`sdk:check` 会重新生成 SDK 并检查类型；应在干净检出中执行，再核对 `git diff -- src/sdk/generated`，发现漂移按契约流程处理。真实页面测试命令为 `npm run test:live`；运行前核对 Playwright 配置的 API、数据库与端口，只使用专用审计环境。测试范围和所需证据见[验收工作流](../docs/workflows/version-acceptance.md)。
