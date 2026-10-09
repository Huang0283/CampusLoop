# BP2-03 MVP API 目录与前后端交接

## 版本和边界

- 唯一契约：`openapi/campusloop.v1.yaml`；SDK：`frontend/src/sdk/generated/`，必须由生成命令更新，不手改。
- 本轮由集中收尾补齐 M6 产物，不代填 M5/M6/M9 或前端/智能组的 Review/签字。
- 本地 HTTP 为 `http://localhost:8001`，前端为 `http://localhost:5173`。Phase 2 只有运行基础设施和契约；除健康/就绪外，业务路径尚不是已实现服务。
- 安全默认 Bearer。公开操作显式 `security: []`，私有操作不得以游客模式返回固定成功。
- 成功统一 `{code:0,message:"ok",data:...}`；分页列表按 OpenAPI 的 `data.items` 与 `data.pagination` 返回，聊天会话/消息和订单事件现为 `data` 数组，不能混用；不把整个 envelope 当作列表。204 不返回 JSON。
- 公共错误：401 AUTH_UNAUTHORIZED、403 FORBIDDEN、404 NOT_FOUND、409 STATE_CONFLICT、422 VALIDATION_ERROR；禁用认证用 423 ACCOUNT_DISABLED。details 不回显密码/令牌。
- Page 默认 1，pageSize 默认 20、上限 100；稳定排序以 ID 作为第二排序键，避免分页重复。

## 系统与账号（运行 Owner M9，认证 Owner M5）

- GET `/health`：公开，200 HealthResponse；依赖故障仍 200 degraded，只证明进程存活。
- GET `/ready`：公开，数据库/Redis 正常 200，否则 503；不检查对象存储，不得据此宣称 MinIO 已通过。
- POST `/auth/register`：公开，RegisterRequest 含 email/password/nickname；201 AuthResponse，同时建立用户会话；409 邮箱已占用、422 字段非法。
- POST `/auth/login`：公开，LoginRequest；200 AuthResponse；401 错误凭据、423 禁用、422 非法请求。
- POST `/auth/refresh`：公开的持有者凭据操作，RefreshRequest；200 TokenResponse，401 无效/重放凭据、423 禁用、422 非法请求。
- POST `/auth/logout`：Bearer sid，无 body；204 撤销会话。重复有效退出按认证契约处理；伪造 token 不能返回成功。
- GET/PATCH `/users/me`：当前本人私有资料，200 UserResponse；PATCH 至少一个白名单字段，不接受 role/status/ownerId，认证错误与字段错误按 M5 设计。
- GET `/users/{userId}`：公开，200 PublicUserResponse；仅 id/nickname/avatar/rating/transactionCount，404 不存在、422 非法安全整数。不得携带 email/bio/学校/令牌或密码哈希。
- 认证输入、完整错误与头部要求以 `auth-contract.md`、`auth-openapi-input.md` 为准；本轮已吸收核心 schema，剩余 headers/examples 和安全存储依赖仍登记在集成检查中。

## 市场与收藏（业务 Owner M6；页面 Owner M3）

- GET `/products`：公开；page/pageSize/query/category/condition/status/sort。返回 ProductListResponse。匿名搜索、筛选、排序、分页可用；不得返回 HIDDEN/删除项，即使游客请求隐藏筛选。
- GET `/products/{productId}`：公开，ProductResponse；不存在、隐藏或删除项对非 Owner 返回 404，不暴露私有存在性。
- GET `/products/mine`：受保护，当前用户自己的商品；允许查看自己的隐藏项，不能用请求 sellerId 读取他人隐藏项。
- POST `/products`：学生，ProductWriteRequest；201 ProductResponse，幂等键必填；sellerId 由 token 推导。
- PATCH/DELETE `/products/{productId}`：仅 Owner；PATCH 返回 ProductResponse，DELETE 204 软删除；预约/已售出商品不得用编辑或删除破坏订单，403/409/422。
- PATCH `/products/{productId}/status`：仅 Owner，ON_SALE/HIDDEN 切换；RESERVED/SOLD 由交易事实维护，不能客户端指定。
- GET `/favorites`：自己的分页收藏 ProductListResponse；PUT/DELETE `/favorites/{productId}`：集合幂等操作，204，不生成重复收藏。
- POST `/uploads/images`：学生，单文件 multipart；返回 UploadResponse。页面逐张上传并维护至多 5 张图片队列；JPG/PNG、每张至多 5 MiB，失败不把对象 URL 加入发布数据。举报私有证据不能通过公共图片路径发布，后续私有上传须单独冻结。

## 求购和智能（业务 M6；搜索/匹配 M7，价格/风险 M8）

- GET `/wanted` 与 GET `/wanted/{wantedId}`：公开，WantedListResponse/WantedResponse；列表支持 page/pageSize/query/status。不存在/删除返回 404，非法参数 422。
- POST `/wanted`：学生，WantedWriteRequest 与幂等键；201 WantedResponse。预算上下界关系、截止日期由服务端验证。
- PATCH/DELETE `/wanted/{wantedId}`：Owner；编辑返回 WantedResponse，关闭/删除按当前 OpenAPI 语义，禁止第三人改动及非法状态转换。
- GET `/search`：公开搜索，query 与契约筛选；SearchResponse；mode/degraded/reason 明确。不将相似度解释为成交概率。真实语义能力属于 Phase 4，Phase 3 先接基线。
- GET `/wanted/{wantedId}/matches`：学生且 Owner；MatchListResponse，原因、版本、过期字段必须保留；智能失败保留规则降级或明确不可用。
- POST `/price-advice`：登录后动作，PriceAdviceRequest/Response；available=false 时可继续手动定价，不阻塞发布。缺真实成交标签时不报告预测准确率。

## 聊天和报价（M6；页面 M4）

- GET `/chat/sessions`：当前参与的会话，ChatSessionListResponse。
- POST `/chat/sessions`：CreateChatSessionRequest，恰好一个 productId/wantedId；Bearer + 幂等键；200 ChatSessionResponse。对方身份由资源 Owner 推导，自聊拒绝，相同上下文/双方复用同一会话。
- GET `/chat/sessions/{sessionId}/messages`：参与者，afterId + limit，MessageListResponse；按 ID 升序补拉，不允许读取他人历史。
- POST 同路径：参与者，SendMessageRequest 与 clientMsgId；201 MessageResponse，写入成功后再推送。相同发送人/clientMsgId 返回原消息，内容冲突 409。
- POST `/chat/sessions/{sessionId}/read`：参与者提交最后阅读消息位置，204；不能标记别人的会话已读。
- POST `/chat/sessions/{sessionId}/offers`：参与者、对应在售商品，正金额，幂等键；201 OfferResponse。
- POST `/offers/{offerId}/accept`：当前报价另一方；AcceptOfferResponse 同时含 offer/order，报价接受、订单创建、商品锁定同一事务。
- POST `/offers/{offerId}/reject`、`/counter`、`/cancel`：拒绝/还价限当前另一方，撤回限当前 proposerId；OfferResponse。counter 创建新报价且双方买卖身份不变；有效期 48 小时。

## 订单和治理（M6，认证/后台权限 M5；页面 M4）

- GET `/orders`：只本人参与订单，role/status/page/pageSize；OrderListResponse。
- GET `/orders/{orderId}`：参与者，OrderResponse；不是参与者返回 403/不可枚举策略 404，不返回约定隐私。
- GET `/orders/{orderId}/events`：参与者，OrderEventListResponse；现契约为数组，没有分页参数。Phase 3 实现前须冻结有界游标/分页，不能默认无限列表。
- POST `/orders/{orderId}/meetup`：参与者保存新版本，MeetupWriteRequest + 幂等键；MeetupResponse，双方确认重置。
- POST `/orders/{orderId}/meetup/confirm`：当前 meetupId/version + 幂等键；MeetupResponse，过时版本 409。
- POST `/orders/{orderId}/confirm-complete`：当前 meetupVersion + 幂等键；CompleteOrderResponse，completed 只在双方确认后 true。
- POST `/orders/{orderId}/cancel`：参与者允许状态取消，OrderResponse；已完成/争议不可普通取消。
- POST `/reviews`：完成订单参与者 + 幂等键，ReviewWriteRequest；201 ReviewResponse，reviewee 由订单推导，重复/非法状态 409。
- POST `/reports`：学生，ReportWriteRequest + 幂等键；201 ReportResponse。私有消息只能参与者举报，不向无权限者提供证据；最多 5 张，证据 URI 必须属于允许的私有上传对象。
- GET `/reports/mine`：自己的 ReportListResponse；禁止读取其他人的举报与证据。
- GET `/notifications`：自己的 NotificationListResponse；POST `/notifications/{notificationId}/read` 与 `/notifications/read-all`：仅本人，204，重复已读安全。

## 后台（Phase 4，不挪入 Phase 2 真功能；M5/M6）

- GET `/admin/users`、GET `/admin/reports`：仅 ADMIN，分页 UserListResponse/ReportListResponse；USER 返回 403。
- POST `/admin/reports/{reportId}/resolve`：仅 ADMIN，幂等键、明确动作与说明；ReportResponse，处理与审计同事务；机器风险不自动处罚。
- 管理员商品列表/处置、私有证据上传、事件分页仍待补 canonical 细节；必须在 Phase 3/4 实现前完成，未确认不称为全部契约冻结。

## 验证与交接

- `cd frontend; npm run sdk:check; npm run lint; npm run build`；生成后必须无未解释漂移。
- `python scripts/m6_phase2/check_contract.py`：检查公开读取、私有动作、枚举、schema 边界、SDK 默认地址与本目录三份必交产物。
- Phase 3 集中实现者替换每个 Mock，不要求组员继续平行改共享文件；独立测试、证据和报告按新的八人任务书执行。
