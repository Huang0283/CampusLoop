# Phase 3 Mock 替换计划（FE2-12）

## 1. 目标

- 记录当前 Phase 2 里所有 Mock 数据位置
- 标注 Phase 3 要替换成哪个接口
- 标注替换时需要的字段、状态、错误

## 2. Mock 总表

| 页面 | 文件 | Mock 内容 | Phase 3 接口 |
|---|---|---|---|
| 登录 | pages/auth/LoginPage.tsx | 假登录、延时 | POST /auth/login |
| 注册 | pages/auth/RegisterPage.tsx | 假注册、延时 | POST /auth/register |
| 个人中心 | pages/profile/index.tsx | 从 store 读、假交易次数、假评分 | GET /users/me、PATCH /users/me |
| 市场 | pages/market/index.tsx | 商品列表 | GET /products |
| 商品详情 | pages/market/ProductDetailPage.tsx | 商品详情 | GET /products/{productId} |
| 发布商品 | pages/market/PublishProductPage.tsx | 提交 console | POST /products、POST /uploads/images |
| 我的商品 | pages/market/MyProductsPage.tsx | 商品列表 | GET /products |
| 收藏 | pages/market/FavoritesPage.tsx | 收藏列表 | GET /favorites |
| 价格建议 | pages/market/PriceAdvicePage.tsx | 假建议区间 | POST /price-advice |
| 求购市场 | pages/wanted/index.tsx | 求购列表 | GET /wanted |
| 求购详情 | pages/wanted/WantedDetailPage.tsx | 求购详情 | GET /wanted/{wantedId} |
| 发布求购 | pages/wanted/PublishWantedPage.tsx | 提交 console | POST /wanted |
| 匹配结果 | pages/wanted/MatchResultPage.tsx | 假匹配分 | GET /wanted/{wantedId}/matches |
| 聊天列表 | pages/transaction/ChatListPage.tsx | 会话列表 | GET /chat/sessions |
| 聊天详情 | pages/transaction/ChatDetailPage.tsx | 历史消息、发送 | GET /chat/sessions/{sessionId}/messages |
| 我的订单 | pages/transaction/OrderListPage.tsx | 订单列表（已接 mockDb） | GET /orders |
| 订单详情 | pages/transaction/OrderDetailPage.tsx | 订单详情 | GET /orders/{orderId} |
| 见面约定 | pages/transaction/MeetupPage.tsx | 约定信息 | POST /orders/{orderId}/meetup |
| 评价 | pages/transaction/ReviewPage.tsx | 评价提交 | POST /reviews |
| 举报 | pages/transaction/ReportPage.tsx | 举报提交 | POST /reports |
| 通知 | pages/transaction/NotificationPage.tsx | 通知列表 | GET /notifications |
| 管理后台 | pages/admin/index.tsx | 用户、商品、举报表格 | GET /admin/users、/admin/reports |

## 3. 替换顺序建议

### 第一批（必须）

1. Auth：登录、注册、当前用户
2. Market：商品列表、商品详情
3. Wanted：求购列表、求购详情
4. Chat：会话列表、历史消息
5. Orders：我的订单、订单详情

### 第二批（重要）

6. 发布商品、发布求购
7. 收藏、我的商品
8. 见面约定、评价
9. 通知
10. 举报

### 第三批（AI 相关）

11. 匹配结果
12. 价格建议
13. 语义搜索

### 第四批（管理）

14. 管理后台用户列表
15. 管理后台举报列表
16. 处理举报

## 4. 替换时要保留的状态

每个页面替换 Mock 时，必须保留：

- 加载中
- 空数据
- 成功
- 失败
- 无权限
- 业务异常（如商品已售、订单状态不允许操作）

## 5. 替换时要用的公共组件

- `Loading`
- `EmptyState`
- `ErrorState`
- `NoPermission`

## 6. 替换时的错误处理

- 401 → 清 token、跳 /login
- 403 → 跳 /403
- 404 → 页面显示"资源不存在"
- 409 → 显示业务冲突文案

## 7. 替换时的字段对齐

- 所有字段以 `openapi/campusloop.v1.yaml` 为准
- 生成 SDK 后，用 `frontend/src/sdk/generated/` 里的类型
- 不再手写接口类型

## 8. 待确认

1. SDK 生成流程何时冻结
2. 每个接口的降级策略
3. AI 接口不可用时的提示文案
4. 管理后台接口的权限校验