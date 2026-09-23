# 契约走查记录（FE2-12）

## 1. 走查目标

- 对齐前端页面与 `openapi/campusloop.v1.yaml`
- 确认字段、状态、错误、降级
- 记录 M5/M6/M7/M8 的确认项
- 形成 Phase 3 Mock 替换依据

## 2. 参与人

| 组 | 人 | 负责 |
|---|---|---|
| 前端 | M2、M3、M4 | 页面、动作、状态 |
| 后端 | M5、M6 | Auth、Market、Order、Chat |
| 智能 | M7、M8 | 语义搜索、匹配、价格建议 |
| 质量 | M10 | 可测试性、边界场景 |
| 管理 | M1 | 范围复核 |

## 3. 走查清单

### 3.1 Auth / Users（M5）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 登录 | email + password | POST /auth/login | 对齐 |
| 注册 | email + password | POST /auth/register（还要求 nickname） | 不对齐：页面缺 nickname |
| 刷新 | refreshToken | POST /auth/refresh | 对齐 |
| 退出 | refreshToken | POST /auth/logout | 对齐 |
| 当前用户 | id、nickname、avatar、campusVerified、school、college、major、bio | GET /users/me | 不对齐：缺 campusVerified、bio |
| 更新资料 | nickname、avatar、bio、school、college、major | PATCH /users/me | 不对齐：契约仅 nickname、avatar、college、major |

### 3.2 Market（M6）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 商品列表 | 分页、筛选、排序 | GET /products | 部分对齐：缺 condition 筛选 |
| 商品详情 | id、title、images、price、condition、seller | GET /products/{productId} | 对齐 |
| 发布商品 | title、images、category、condition、price、location | POST /products | 对齐 |
| 编辑 | 可编辑商品字段 | PATCH /products/{productId} | 对齐 |
| 上下架 | shelve / unshelve | PATCH /products/{productId}/status | 对齐 |
| 删除 | 逻辑删除 | DELETE /products/{productId} | 对齐 |
| 收藏 | 添加 / 取消 | PUT /favorites/{productId}、DELETE /favorites/{productId} | 对齐 |
| 收藏列表 | 分页 | GET /favorites | 对齐 |
| 图片上传 | 1-5 张 | POST /uploads/images（单文件） | 待 M6 确认大小限制与批量策略 |

### 3.3 Wanted / Intelligence（M7、M8）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 求购列表 | 分页、筛选 | GET /wanted | 部分对齐：缺 status 筛选 |
| 求购详情 | id、title、budget、condition、deadline | GET /wanted/{wantedId} | 对齐 |
| 发布求购 | title、budget、minCondition、location、deadline | POST /wanted | 对齐 |
| 编辑求购 | 可编辑求购字段 | PATCH /wanted/{wantedId} | 对齐 |
| 匹配结果 | product、matchScore、matchReasons | GET /wanted/{wantedId}/matches | 待 M7 确认字段 |
| 语义搜索 | 自然语言查询 | GET /search | 待 M7 确认 |
| 价格建议 | suggestedRange、factors、available | POST /price-advice | 待 M8 确认降级字段 |

### 3.4 Chat / Offer（M6）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 会话列表 | sessionId、peer、lastMessage、unreadCount | GET /chat/sessions | 对齐 |
| 历史消息 | cursor、limit | GET /chat/sessions/{sessionId}/messages | 对齐 |
| 发送消息 | clientMsgId、type、content | POST /chat/sessions/{sessionId}/messages | 对齐 |
| 已读 | lastReadMessageId | POST /chat/sessions/{sessionId}/read | 对齐 |
| 报价 | amount、note | POST /chat/sessions/{sessionId}/offers | 对齐 |
| 接受 / 拒绝 / 还价 / 撤回 | offerId | POST /offers/{offerId}/... | 对齐 |

### 3.5 Transactions（M6、M10）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 我的订单 | 分页、role、status | GET /orders | 对齐 |
| 订单详情 | id、product、buyer、seller、meetup、status | GET /orders/{orderId} | 对齐 |
| 订单事件 | status、timestamp | GET /orders/{orderId}/events | 待 M6 确认分页 |
| 确认完成 | 单方确认 | POST /orders/{orderId}/confirm-complete | 对齐 |
| 取消订单 | reason | POST /orders/{orderId}/cancel | 对齐 |
| 见面约定 | location、time | POST /orders/{orderId}/meetup | 对齐 |
| 双方确认 | version | POST /orders/{orderId}/meetup/confirm | 对齐 |
| 评价 | rating、content | POST /reviews | 对齐 |

### 3.6 Governance / Notifications（M6、M10）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 举报 | targetType、targetId、reason、最多 6 张证据 | POST /reports（最多 5 张证据） | 不对齐：证据数量 |
| 我的举报 | 分页 | GET /reports/mine | 待 M6 确认是否需要 |
| 通知列表 | 分页、unreadOnly | GET /notifications | 对齐 |
| 已读 | 单条、全部 | POST /notifications/{id}/read、/read-all | 对齐 |

### 3.7 Admin（M6、M10）

| 项 | 前端需求 | 契约 | 状态 |
|---|---|---|---|
| 用户管理 | 分页、搜索、状态 | GET /admin/users | 对齐 |
| 举报管理 | 分页、状态 | GET /admin/reports | 对齐 |
| 处理举报 | action、resolution | POST /admin/reports/{reportId}/resolve | 对齐 |
| 商品管理 | 列表、处理 | 无对应管理员商品接口 | 不对齐：缺接口 |

## 4. 走查发现的问题

1. 注册 nickname、用户响应 campusVerified/bio、资料 school/bio 字段，需 M5 确认
2. 图片限制/批量策略、商品 condition 筛选、我的商品查询、求购 status 筛选、会话创建和管理员商品接口，需 M6 确认
3. `/wanted/{wantedId}/matches` 的 `reasons`、版本和过期字段，需 M7 确认
4. `/price-advice` 的可用性、因素、版本与降级字段，需 M8 确认
5. `/orders/{orderId}/events` 是否需要分页，需 M6 确认
6. `/reports/mine` 是否需要以及举报证据统一为 5 张，需 M4/M6 确认
7. `/search` 是否独立于 `/products`，需 M7 确认

所有待确认项的截止时间均为对应上游 Phase 2 契约 PR 合并前。M5 负责第 1 项，M6 负责第 2、5、6 项，M7 负责第 3、7 项，M8 负责第 4 项，M4 共同确认第 6 项；M2 负责在前端汇总 PR 前回填最终结论与修改提交。

## 5. 走查结论

- 已存在的路径和方法已按 `openapi/campusloop.v1.yaml` 对齐
- 7 项字段或范围问题仍待 M5/M6/M7/M8 确认，因此不能写成“契约已完成对签”
- 未确认项不阻塞原型，Phase 3 前冻结即可
- 前端 Mock 可以按当前契约字段先实现，Phase 3 替换

## 6. 确认签名

| 角色 | 人 | 状态 |
|---|---|---|
| 前端 | M2 | 已确认 |
| 后端 | M5 | 待确认 |
| 后端 | M6 | 待确认 |
| 智能 | M7 | 待确认 |
| 智能 | M8 | 待确认 |
| 质量 | M10 | 待确认 |
| 管理 | M1 | 待确认 |

## 7. 可复现验证记录

以下命令必须在同一待验收提交执行，结果、提交号和日期记录在 `verification.md`：

```bash
cd frontend
npm run sdk:generate
npm run sdk:check
npm run lint
npm run build
```

生成 SDK 后必须确认工作区没有生成产物漂移。M2 的本地命令通过不能替代 M5/M6/M10 的对签或同组 Review。
