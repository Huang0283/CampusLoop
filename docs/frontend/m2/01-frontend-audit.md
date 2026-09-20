# 前端现状审计（M2，第 1 阶段）

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
| 聊天接口 | frontend/src/api/chat.ts | 待确认 | M4 添加 |
| WebSocket 接口 | frontend/src/api/ws.ts | 待确认 | M4 添加 |
| 模拟 WS 传输 | frontend/src/api/mockWsTransport.ts | 待确认 | M4 添加 |

## 4. 公共组件

| 项目 | 路径 | 处理 | 说明 |
|---|---|---|---|
| Loading | frontend/src/components/Loading | 保留 | |
| EmptyState | frontend/src/components/EmptyState | 保留 | |
| ErrorState | frontend/src/components/ErrorState | 保留 | |
| NoPermission | frontend/src/components/NoPermission | 保留 | |
| PageContainer | frontend/src/components/PageContainer | 保留 | |
| Can | frontend/src/components/Can.tsx | 待确认 | M4 添加 |
| 交易组件 | frontend/src/components/transaction | 待确认 | M4 添加 |

## 5. 页面

| 页面 | 路由 | 角色 | 负责人 | 状态 |
|---|---|---|---|---|
| 登录 | /login | 公开 | M2 | 已完成（静态） |
| 注册 | /register | 公开 | M2 | 已完成（静态） |
| 首页 | / | 学生 | M3 | 占位 |
| 个人中心 | /profile | 学生 | M2 | 已完成（静态） |
| 管理后台 | /admin | 管理员 | M2 | 已完成（静态） |
| 市场 | /market | 学生 | M3 | 占位 |
| 商品详情 | /product/:id | 学生 | M3 | 占位 |
| 发布商品 | /publish | 学生 | M3 | 占位 |
| 我的商品 | /my-products | 学生 | M3 | 占位 |
| 收藏 | /favorites | 学生 | M3 | 占位 |
| 求购市场 | /wanted | 学生 | M3 | 占位 |
| 聊天列表 | /chat | 学生 | M4 | 原型 |
| 聊天详情 | /chat/:id | 学生 | M4 | 原型 |
| 订单列表 | /transactions | 学生 | M4 | 原型 |
| 订单详情 | /transactions/:id | 学生 | M4 | 原型 |
| 见面约定 | /transactions/:id/meetup | 学生 | M4 | 原型 |
| 通知 | /notifications | 学生 | M4 | 原型 |
| 个人交易中心 | /profile/transactions | 学生 | M4 | 原型 |

## 6. 发现的问题

1. App.tsx 和 index.css 是 Vite 模板遗留，需要确认是否删除
2. 缺少统一布局（顶部导航、侧边栏）
3. 页面级状态处理未统一
4. 移动端响应式布局未定义
5. M4 自己加了组件和 store，需要确认命名和复用
6. 用户状态有两个来源：localStorage 和 stores/auth.ts
7. 缺失：导航结构、权限矩阵、页面清单（含优先级和计划周次）

## 7. M2 待交付物

- 前端现状审计清单（本文档）
- 页面与路由总表
- 导航结构图
- 角色与页面权限矩阵
- 登录、注册、个人资料低保真原型
- 前端设计规范初稿
- 公共组件候选清单
- 公共页面状态规范