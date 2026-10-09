# 页面-API 映射总表（FE2-04）

## 1. 口径

- 唯一契约来源：`openapi/campusloop.v1.yaml`；前端唯一入口：`frontend/src/sdk/index.ts`。
- Phase 2 页面仍使用明确标识的 Mock；“已映射”只表示存在契约，不表示真实接口已经联调。
- 通用错误：401 未登录/令牌失效，403 无权限，404 资源不存在，409 状态或幂等冲突，422 字段校验失败，500 服务异常。
- Owner 指契约确认人；M2/M3/M4 是页面 Owner。所有“待对签”项必须在 Phase 2 收口前由相应契约 Owner 确认。

## 2. 认证与用户（页面 Owner：M2；契约 Owner：M5）

| 页面/动作 | 方法与路径 | 请求样例 | 响应样例 | 特有错误 | 替换任务 | 状态 |
|---|---|---|---|---|---|---|
| 注册/提交 | `POST /auth/register` | `{email,password,nickname}` | `{data:{accessToken,refreshToken,expiresIn,user}}` | 409 邮箱已存在；422 | FE3-01 | 页面缺昵称字段，待 M2/M5 对齐 |
| 登录/提交 | `POST /auth/login` | `{email,password}` | `{data:{accessToken,refreshToken,expiresIn,user}}` | 401 凭据错；423 账号禁用 | FE3-01 | 已映射，待 M5 对签 |
| 会话/刷新 | `POST /auth/refresh` | `{refreshToken}` | `{accessToken,refreshToken}` | 401 刷新令牌失效 | FE3-01 | 已映射，待 M5 对签 |
| 用户菜单/退出 | `POST /auth/logout` | Bearer token | 204 | 401 会话无效 | FE3-01 | 已映射，待 M5 对签 |
| 资料/加载 | `GET /users/me` | - | `{id,nickname,avatar,campusVerified,...}` | 401 | FE3-02 | 已映射，待 M5 对签 |
| 资料/保存 | `PATCH /users/me` | `{nickname,avatar,college,major}` | 更新后的用户 | 422 字段错 | FE3-02 | Mock 的 school/bio 不在契约，待 M5 确认 |
| 用户主页/加载 | `GET /users/{userId}` | 路径 `userId` | 公开用户字段 | 404 | FE3-02 | 已映射，待 M5 对签 |

## 3. 商品与收藏（页面 Owner：M3；契约 Owner：M6）

| 页面/动作 | 方法与路径 | 请求样例 | 响应样例 | 特有错误 | 替换任务 | 状态 |
|---|---|---|---|---|---|---|
| 市场/列表筛选分页 | `GET /products` | `page,pageSize,query,category,status,sort` | 分页商品响应 | 422 查询参数错 | FE3-04 | 页面成色筛选缺契约参数，待 M6 确认 |
| 商品详情/加载 | `GET /products/{productId}` | 路径 `productId` | 商品与卖家摘要 | 404 | FE3-04 | 已映射，待 M6 对签 |
| 收藏/列表 | `GET /favorites` | `page,pageSize` | `{items,page,pageSize,total}` | 401 | FE3-04 | 已映射，待 M6 对签 |
| 商品详情/收藏 | `PUT /favorites/{productId}` | 路径 `productId` | 204 | 404 商品不存在 | FE3-04 | 已修正为 PUT，待 M6 对签 |
| 收藏/取消 | `DELETE /favorites/{productId}` | 路径 `productId` | 204 | 404 | FE3-04 | 已映射，待 M6 对签 |
| 发布商品/上传图片 | `POST /uploads/images` | `multipart/form-data` 图片 | `{items:[{url,...}]}` | 413 超限；415 格式错 | FE3-05 | 待 M6 确认限制 |
| 发布商品/提交 | `POST /products` | `{title,images,category,condition,price,campusLocation,...}` | 创建后的商品 | 409 重复；422 | FE3-05 | 已映射，待 M6 对签 |
| 编辑商品/提交 | `PATCH /products/{productId}` | 可编辑字段 | 更新后的商品 | 403 非 Owner；409 状态冲突 | FE3-05 | 已修正为 PATCH，待 M6 对签 |
| 我的商品/列表 | `GET /products` | `owner=me,page,pageSize` | 分页商品 | 422 | FE3-05 | 待 M6 确认 owner 查询形式 |
| 我的商品/上下架 | `PATCH /products/{productId}/status` | `{status}` | 更新后的商品 | 403；409 | FE3-05 | 已修正为 PATCH，待 M6 对签 |
| 我的商品/删除 | `DELETE /products/{productId}` | 路径 `productId` | 204 | 403；409 | FE3-05 | 已映射，待 M6 对签 |

## 4. 求购与智能结果（页面 Owner：M3）

| 页面/动作 | 方法与路径 | 请求样例 | 响应样例 | 特有错误 | 契约 Owner / 替换任务 | 状态 |
|---|---|---|---|---|---|---|
| 求购市场/列表筛选 | `GET /wanted` | `page,pageSize,query` | 分页求购 | 422 | M6 / FE3-06 | 页面状态筛选缺契约参数，待 M6 确认 |
| 求购详情/加载 | `GET /wanted/{wantedId}` | 路径 `wantedId` | 求购详情 | 404 | M6 / FE3-06 | 已映射，待 M6 对签 |
| 发布求购/提交 | `POST /wanted` | `{title,budgetMin,budgetMax,condition,location,expireAt}` | 创建后的求购 | 409；422 | M6 / FE3-06 | 已映射，待 M6 对签 |
| 编辑求购/提交 | `PATCH /wanted/{wantedId}` | 可编辑字段 | 更新后的求购 | 403；409 | M6 / FE3-06 | 已修正为 PATCH，待 M6 对签 |
| 关闭求购 | `DELETE /wanted/{wantedId}` | 路径 `wantedId` | 204 | 403；409 | M6 / FE3-06 | 已映射，待 M6 对签 |
| 市场/语义搜索 | `GET /search` | `q,filters,page` | 结果、模式、版本、解释 | 422；503 降级 | M7 / FE4-04 | Phase 4 替换，待 M7 对签 |
| 匹配结果/加载 | `GET /wanted/{wantedId}/matches` | 路径及分页 | 商品、分数、原因、版本 | 404；503 降级 | M7 / FE4-05 | Phase 4 替换，待 M7 对签 |
| 价格建议/请求 | `POST /price-advice` | 商品特征 | 区间、因素、版本、可用性 | 422；503 降级 | M8 / FE4-06 | Phase 4 替换，待 M8 对签 |

## 5. 聊天、报价与订单（页面 Owner：M4；契约 Owner：M6）

| 页面/动作 | 方法与路径 | 请求样例 | 响应样例 | 特有错误 | 替换任务 | 状态 |
|---|---|---|---|---|---|---|
| 聊天列表/加载 | `GET /chat/sessions` | 分页参数 | 会话、对方、末条消息、未读数 | 401 | FE3-07 | 已映射，待 M6 对签 |
| 聊天详情/历史 | `GET /chat/sessions/{sessionId}/messages` | `cursor,limit` | `{items,nextCursor}` | 403 非参与者；404 | FE3-07/08 | 已映射，待 M6 对签 |
| 聊天详情/发送 | `POST /chat/sessions/{sessionId}/messages` | `{clientMsgId,type,content}` | 服务端消息及 ID | 409 重复/状态冲突 | FE3-07/08 | 已映射，待 M6 对签 |
| 聊天详情/已读 | `POST /chat/sessions/{sessionId}/read` | `{lastReadMessageId}` | 204 | 403；404 | FE3-07 | 已映射，待 M6 对签 |
| 聊天详情/报价 | `POST /chat/sessions/{sessionId}/offers` | `{amount,note}` | 报价 | 409 状态冲突；422 | FE3-09 | 已映射，待 M6 对签 |
| 报价/接受 | `POST /offers/{offerId}/accept` | 幂等键 | 报价及订单 | 403；409 | FE3-09 | 已映射，待 M6 对签 |
| 报价/拒绝 | `POST /offers/{offerId}/reject` | `{reason?}` | 报价 | 403；409 | FE3-09 | 已映射，待 M6 对签 |
| 报价/还价 | `POST /offers/{offerId}/counter` | `{amount,note}` | 新报价 | 403；409；422 | FE3-09 | 已映射，待 M6 对签 |
| 报价/撤回 | `POST /offers/{offerId}/cancel` | 幂等键 | 报价 | 403；409 | FE3-09 | 已映射，待 M6 对签 |
| 订单列表/筛选 | `GET /orders` | `page,pageSize,role,status` | 分页订单 | 422 | FE3-09 | 已映射，待 M6 对签 |
| 订单详情/加载 | `GET /orders/{orderId}` | 路径 `orderId` | 订单、参与者、商品、约定 | 403；404 | FE3-09 | 已映射，待 M6 对签 |
| 订单详情/时间线 | `GET /orders/{orderId}/events` | 路径 `orderId` | 状态事件列表 | 403；404 | FE3-09 | 待 M6 确认是否分页 |
| 见面约定/保存 | `POST /orders/{orderId}/meetup` | `{location,time,version}` | 约定及新版本 | 403；409 版本冲突 | FE3-09 | 已映射，待 M6 对签 |
| 见面约定/确认 | `POST /orders/{orderId}/meetup/confirm` | `{version}` | 确认状态 | 403；409 | FE3-09 | 已映射，待 M6 对签 |
| 订单/确认完成 | `POST /orders/{orderId}/confirm-complete` | 幂等键 | 订单新状态 | 403；409 | FE3-10 | 已映射，待 M6 对签 |
| 订单/取消 | `POST /orders/{orderId}/cancel` | `{reason}` | 订单新状态 | 403；409 | FE3-09 | 已映射，待 M6 对签 |
| 评价/提交 | `POST /reviews` | `{orderId,rating,content,...}` | 评价 | 403；409 重复/未完成 | FE3-10 | 已映射，待 M6 对签 |

## 6. 举报、通知与管理（页面 Owner：M4；契约 Owner：M6）

| 页面/动作 | 方法与路径 | 请求样例 | 响应样例 | 特有错误 | 替换任务 | 状态 |
|---|---|---|---|---|---|---|
| 举报弹窗/提交 | `POST /reports` | `{targetType,targetId,reason,evidence}` | 举报记录 | 403；409；422 | FE3-10 | 已映射，待 M6 对签 |
| 我的举报/加载 | `GET /reports/mine` | 分页参数 | 分页举报 | 401 | FE3-10 | 待 M6 确认页面范围 |
| 通知/列表 | `GET /notifications` | `page,pageSize,unreadOnly` | 分页通知 | 401 | FE3-10 | 已映射，待 M6 对签 |
| 通知/单条已读 | `POST /notifications/{notificationId}/read` | 路径 ID | 204 | 404 | FE3-10 | 已映射，待 M6 对签 |
| 通知/全部已读 | `POST /notifications/read-all` | - | 204 | 401 | FE3-10 | 已映射，待 M6 对签 |
| 后台/用户列表 | `GET /admin/users` | 分页、搜索、状态 | 分页用户 | 403 | FE4-01 | Phase 4 替换，待 M6 对签 |
| 后台/举报列表 | `GET /admin/reports` | 分页、状态 | 分页举报 | 403 | FE4-01/08 | Phase 4 替换，待 M6 对签 |
| 后台/处理举报 | `POST /admin/reports/{reportId}/resolve` | `{action,resolution}` | 处理后的举报 | 403；409 | FE4-01/08 | Phase 4 替换，待 M6 对签 |

## 7. 待确认项与截止时间

1. M5：确认 `/users/me` 可写字段、禁用账号和令牌失效错误样例；截止：M5 的 BP2-01 PR 合并前。
2. M6：确认图片限制、`owner=me` 查询、订单事件分页、我的举报范围及所有业务冲突码；截止：M6 的 BP2-03/BP2-04 PR 合并前。
3. M7：确认搜索与匹配结果的解释、版本和降级字段；截止：AI2-01/AI2-02 契约 PR 合并前。
4. M8：确认价格建议区间、因素、样本不足和不可用字段；截止：AI2-03 契约 PR 合并前。
5. M2：在上游对签后更新状态，不得把“已映射”改写成“已联调”；截止：前端 Phase 2 汇总 PR 前。

## 8. 当前契约缺口

以下内容不能由前端猜测，均由 M2 登记、对应 Owner 决策：

1. 注册页面没有 OpenAPI 必填的 `nickname`；Owner：M2/M5；截止：FE3-01 开始前。
2. 资料 Mock 的 `school`、`bio` 不能通过当前 `PATCH /users/me` 保存，且用户响应没有 `campusVerified`、`bio`；Owner：M5；截止：BP2-01 对签前。
3. 商品页面提供成色筛选，但 `GET /products` 没有 `condition` 参数；Owner：M6；截止：BP2-03 对签前。
4. “我的商品”需要当前用户筛选，但 `GET /products` 没有 `owner=me` 或等价接口；Owner：M6；截止：BP2-03 对签前。
5. 求购页面提供状态筛选，但 `GET /wanted` 没有 `status` 参数；Owner：M6；截止：BP2-03 对签前。
6. 商品/求购详情的“联系”动作缺少创建或获取会话接口；Owner：M6；截止：BP2-03 对签前。
7. 举报组件允许 6 张证据图，OpenAPI `maxItems` 为 5；Owner：M4/M6；截止：FE2-10 任务 PR 合并前。
8. 管理页面有商品管理，OpenAPI 没有管理员商品列表/处理接口；Owner：M6；截止：BP2-03 范围确认前。
