# M2-01 前端现状审计（第一阶段）

## 1. 工程结构

| 项目 | 路径 | 处理 | 说明 |
|---|---|---|---|
| Vite 配置 | frontend/vite.config.ts | 保留 | Vite 默认配置 |
| TypeScript 配置 | frontend/tsconfig.json | 保留 | TS 默认配置 |
| 入口 | frontend/src/main.tsx | 保留 | 挂载 RouterProvider |
| 根组件 | frontend/src/App.tsx | 删除 | 路由接入后未使用 |
| 全局样式 | frontend/src/index.css | 待确认 | 可能与 styles/global.css 冲突 |
| 设计变量 | frontend/src/styles/variables.css | 保留 | 颜色、字号、间距 |
| 全局样式 | frontend/src/styles/global.css | 保留 | 基础样式 |

## 2. 路由

| 项目 | 路径 | 处理 | 说明 |
|---|---|---|---|
| 路由配置 | frontend/src/router/index.tsx | 保留 | 统一路由表 |
| 登录校验 | frontend/src/router/RequireAuth.tsx | 保留 | token 校验 |
| 角色校验 | frontend/src/router/RequireRole.tsx | 保留 | 角色校验 |
| 403 页 | /403 | 保留 | 使用 NoPermission |
| 404 页 | /404 | 保留 | 使用 Placeholder |
| 旧路径重定向 | /orders、/meeting | 保留 | 重定向到 /transactions |

## 3. 接口层

| 项目 | 路径 | 处理 | 说明 |
|---|---|---|---|
| Axios 实例 | frontend/src/api/request.ts | 保留 | 注入 token，处理 401/403 |
| 登录接口 | frontend/src/api/auth.ts | 保留 | login、register、logout、me |
| 用户接口 | frontend/src/api/user.ts | 保留 | 资料读取与更新 |
| 聊天接口 | frontend/src/api/chat.ts | 保留为后续契约候选 | 第一阶段只按 Mock 使用 |
| WebSocket 接口 | frontend/src/api/ws.ts | 保留为后续契约候选 | 第三阶段才验真实连接 |
| 模拟 WS 传输 | frontend/src/api/mockWsTransport.ts | 保留 | 原型模式明确标识 |

## 4. 公共组件

| 项目 | 路径 | 处理 | 说明 |
|---|---|---|---|
| Loading | frontend/src/components/Loading | 保留 | |
| EmptyState | frontend/src/components/EmptyState | 保留 | |
| ErrorState | frontend/src/components/ErrorState | 保留 | |
| NoPermission | frontend/src/components/NoPermission | 保留 | |
| PageContainer | frontend/src/components/PageContainer | 保留 | |
| AppSidebar | frontend/src/components/AppSidebar.tsx | 保留 | 全站共享侧栏 |
| Can | frontend/src/components/Can.tsx | 保留 | 交易按钮级权限原型 |
| 交易组件 | frontend/src/components/transaction | 保留 | 报价、时间线、评价和举报原型 |

## 5. 页面

| 页面 | 路由 | 角色 | 负责人 | 状态 |
|---|---|---|---|---|
| 登录 | /login | 公开 | M2 | 已完成（静态） |
| 注册 | /register | 公开 | M2 | 已完成（静态） |
| 首页 | / | 学生 | M3 | 重定向至市场 |
| 个人中心 | /profile | 学生 | M2 | 已完成（静态） |
| 管理后台 | /admin | 管理员 | M2 | 已完成（静态） |
| 市场 | /market | 学生 | M3 | 静态 Mock |
| 商品详情 | /product/:id | 学生 | M3 | 静态 Mock |
| 发布商品 | /publish | 学生 | M3 | 静态 Mock |
| 我的发布 | /my-products | 学生 | M3 | 静态 Mock |
| 我的收藏 | /favorites | 学生 | M3 | 静态 Mock |
| 求购市场 | /wanted | 学生 | M3 | 静态 Mock |
| 聊天列表 | /chat | 学生 | M4 | 原型 |
| 聊天详情 | /chat/:id | 学生 | M4 | 原型 |
| 订单列表 | /transactions | 学生 | M4 | 原型 |
| 订单详情 | /transactions/:id | 学生 | M4 | 原型 |
| 见面约定 | /transactions/:id/meetup | 学生 | M4 | 原型 |
| 通知 | /notifications | 学生 | M4 | 原型 |
| 个人交易中心 | /transactions | 学生 | M4 | 已合并到订单列表；旧路径重定向 |

## 6. 发现的问题

1. `App.tsx`、`App.css` 和模板图片未被入口引用，后续清理时可删除；不得误改当前路由入口。
2. 侧边栏已统一为 `AppSidebar`，顶部栏仍由页面重复实现，第二阶段提取共享壳。
3. 页面状态组件已统一，逐页面状态设计见 `06-page-state-matrix.md`；第二阶段实现可切换状态。
4. 移动端断点和布局规则已经定义，第二阶段实现。
5. 用户状态仍有演示 `localStorage` 与 `stores/auth.ts` 两种来源，真实认证接入前必须收敛为单一来源。
6. 聊天 API、WebSocket 和交易 store 只作为原型契约候选，未经 M5/M6 评审不得作为正式接口依据。

## 7. M2 待交付物

- 前端现状审计清单（本文档）
- 页面与路由总表
- 导航结构图
- 角色与页面权限矩阵
- 登录、注册、个人资料低保真原型
- 前端设计规范初稿
- 公共组件候选清单
- 公共页面状态规范
