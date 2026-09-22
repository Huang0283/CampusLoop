# 页面-API 映射总表（FE2-04）

## 1. 说明

- 本表把前端页面和 OpenAPI 契约里的接口一一对应
- 契约来源：`openapi/campusloop.v1.yaml`
- 本阶段不接真实接口，只用于 Phase 3 替换 Mock
- 每条记录：页面、路由、API、方法、触发动作、备注

## 2. 通用接口

| API | 方法 | 用途 |
|---|---|---|
| /health | GET | 健康检查 |
| /auth/refresh | POST | 刷新令牌 |

## 3. 认证与用户

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 登录 | /login | /auth/login | POST | 提交登录 |
| 登录 | /login | /auth/refresh | POST | 令牌过期 |
| 注册 | /register | /auth/register | POST | 提交注册 |
| 退出 | 顶部菜单 | /auth/logout | POST | 点击退出 |
| 个人中心 | /profile | /users/me | GET | 页面加载 |
| 个人中心 | /profile | /users/me | PATCH | 保存资料 |
| 用户主页 | /users/:id | /users/{userId} | GET | 页面加载 |

## 4. 市场

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 市场首页 | /market | /products | GET | 页面加载、筛选、搜索 |
| 市场首页 | /market | /favorites/{productId} | POST | 收藏 |
| 商品详情 | /product/:id | /products/{productId} | GET | 页面加载 |
| 商品详情 | /product/:id | /favorites/{productId} | POST | 收藏 |
| 发布商品 | /publish | /products | POST | 提交发布 |
| 发布商品 | /publish | /uploads/images | POST | 图片上传 |
| 编辑商品 | /product/:id/edit | /products/{productId} | PUT | 提交编辑 |
| 我的商品 | /my-products | /products | GET | 页面加载 |
| 我的商品 | /my-products | /products/{productId}/status | POST | 上下架 |
| 我的商品 | /my-products | /products/{productId} | DELETE | 删除 |
| 收藏 | /favorites | /favorites | GET | 页面加载 |
| 收藏 | /favorites | /favorites/{productId} | DELETE | 取消收藏 |
| 价格建议 | /publish/price-advice | /price-advice | POST | 获取建议 |

## 5. 求购

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 求购市场 | /wanted | /wanted | GET | 页面加载、筛选 |
| 求购详情 | /wanted/:id | /wanted/{wantedId} | GET | 页面加载 |
| 发布求购 | /wanted/publish | /wanted | POST | 提交发布 |
| 编辑求购 | /wanted/:id/edit | /wanted/{wantedId} | PUT | 提交编辑 |
| 匹配结果 | /wanted/matches | /wanted/{wantedId}/matches | GET | 页面加载 |
| 语义搜索 | /market 搜索框 | /search | GET | 提交搜索 |

## 6. 聊天与报价

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 聊天列表 | /chat | /chat/sessions | GET | 页面加载 |
| 聊天详情 | /chat/:id | /chat/sessions/{sessionId}/messages | GET | 页面加载、补拉 |
| 聊天详情 | /chat/:id | /chat/sessions/{sessionId}/messages | POST | 发送消息 |
| 聊天详情 | /chat/:id | /chat/sessions/{sessionId}/read | POST | 已读 |
| 聊天详情 | /chat/:id | /chat/sessions/{sessionId}/offers | POST | 发送报价 |
| 聊天详情 | /chat/:id | /offers/{offerId}/accept | POST | 接受报价 |
| 聊天详情 | /chat/:id | /offers/{offerId}/reject | POST | 拒绝报价 |
| 聊天详情 | /chat/:id | /offers/{offerId}/counter | POST | 还价 |
| 聊天详情 | /chat/:id | /offers/{offerId}/cancel | POST | 撤回报价 |

## 7. 订单与交易

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 我的订单 | /transactions | /orders | GET | 页面加载、筛选 |
| 订单详情 | /transactions/:id | /orders/{orderId} | GET | 页面加载 |
| 订单详情 | /transactions/:id | /orders/{orderId}/events | GET | 时间线 |
| 订单详情 | /transactions/:id | /orders/{orderId}/confirm-complete | POST | 确认完成 |
| 订单详情 | /transactions/:id | /orders/{orderId}/cancel | POST | 取消订单 |
| 见面约定 | /transactions/:id/meetup | /orders/{orderId}/meetup | POST | 创建、修改 |
| 见面约定 | /transactions/:id/meetup | /orders/{orderId}/meetup/confirm | POST | 双方确认 |
| 评价 | /transactions/:id/review | /reviews | POST | 提交评价 |

## 8. 治理与通知

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 举报 | /report | /reports | POST | 提交举报 |
| 我的举报 | /report/mine | /reports/mine | GET | 页面加载 |
| 通知 | /notifications | /notifications | GET | 页面加载 |
| 通知 | /notifications | /notifications/{notificationId}/read | POST | 单条已读 |
| 通知 | /notifications | /notifications/read-all | POST | 全部已读 |

## 9. 管理后台

| 页面 | 路由 | API | 方法 | 触发 |
|---|---|---|---|---|
| 用户管理 | /admin | /admin/users | GET | 页面加载 |
| 举报管理 | /admin | /admin/reports | GET | 页面加载 |
| 举报处理 | /admin | /admin/reports/{reportId}/resolve | POST | 处理举报 |

## 10. Phase 3 Mock 替换清单

| 页面 | Mock 位置 | 替换为 |
|---|---|---|
| 市场 | pages/market/index.tsx mock 数据 | /products |
| 商品详情 | ProductDetailPage mock | /products/{productId} |
| 发布商品 | PublishProductPage | /products、/uploads/images |
| 我的商品 | MyProductsPage mock | /products |
| 收藏 | FavoritesPage mock | /favorites |
| 求购市场 | wanted/index.tsx mock | /wanted |
| 求购详情 | WantedDetailPage mock | /wanted/{wantedId} |
| 匹配结果 | MatchResultPage mock | /wanted/{wantedId}/matches |
| 价格建议 | PriceAdvicePage mock | /price-advice |
| 聊天列表 | ChatListPage mock | /chat/sessions |
| 聊天详情 | ChatDetailPage mock | /chat/sessions/{sessionId}/messages |
| 我的订单 | OrderListPage mock | /orders |
| 订单详情 | OrderDetailPage mock | /orders/{orderId} |
| 见面约定 | MeetupPage mock | /orders/{orderId}/meetup |
| 评价 | ReviewPage mock | /reviews |
| 举报 | ReportPage mock | /reports |
| 通知 | NotificationPage mock | /notifications |
| 个人中心 | profile/index.tsx mock | /users/me |
| 管理后台 | admin mock | /admin/users、/admin/reports |

## 11. 待确认

1. `/search` 是否合并到 `/products`，还是独立
2. `/uploads/images` 是否支持批量
3. `/orders/{orderId}/events` 是否要分页
4. `/reports/mine` 是否需要
5. `/admin/reports/{reportId}/resolve` 是否只处理举报，还是也处理订单纠纷