# CampusLoop Frontend

CampusLoop 前端使用 React、TypeScript、Vite、Ant Design、React Router 和 Zustand。当前仓库包含第一阶段静态/Mock 原型；真实 HTTP、WebSocket 和持久化能力按后续阶段验收。

## 本地运行

```bash
npm install
npm run dev
```

开发地址默认为 `http://localhost:5173`。常用验收入口：

- `/market`：市场与商品入口
- `/wanted`：求购与匹配入口
- `/chat`：聊天列表
- `/transactions`：订单与交易
- `/notifications`：通知中心
- `/admin`：管理员页面，需管理员演示身份

## 检查命令

```bash
npm run lint
npm run build
npm run sdk:check
```

## OpenAPI SDK

- 契约源：`../openapi/campusloop.v1.yaml`
- 生成配置：`openapi-ts.config.ts`
- 稳定入口：`src/sdk/index.ts`
- 生成目录：`src/sdk/generated/`，禁止手工修改
- HTTP 地址：`VITE_API_BASE_URL=http://localhost:8000`
- WebSocket 地址：Phase 1/2 保持 `VITE_WS_URL` 为空并使用显式 Mock；Phase 3 联调时设置为 `ws://localhost:8000/ws`

契约变更后先运行 `npm run sdk:generate`，再运行 `npm run sdk:check`、`npm run lint` 和 `npm run build`。Phase 2 的 SDK 只代表契约可消费，不代表后端已经实现或页面已经完成真实联调。

## 原型边界

- 未配置真实服务时，聊天与交易使用明确标识的 Mock 数据和状态层。
- Mock 只能证明页面、状态和交互设计，不代表真实接口或数据库已完成。
- 用户、商品、交易和聊天消息举报共用 `ReportModal`，从对应上下文进入，不使用独立 `/report` 页面。
- 第一阶段交付与验收记录位于 `../docs/frontend/`。
