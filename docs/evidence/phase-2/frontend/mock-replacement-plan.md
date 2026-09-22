# Mock 替换计划（FE2-12）

## 1. 规则

- Phase 2 Mock 仅用于可点击原型，必须能从文件路径追踪到真实接口、契约 Owner 和后续任务。
- Phase 3 替换 MVP HTTP/WebSocket；智能与管理接口按总计划在 Phase 4 替换，不能为了满足表格而伪造 Phase 3 任务号。
- 替换后数据必须来自生成 SDK，生产路径不得回退到静态数组或直接修改前端业务事实。

## 2. 替换清单

| 页面 | 当前 Mock 位置/内容 | 真实接口 | 契约 Owner | 替换任务 | 移除条件 |
|---|---|---|---|---|---|
| 登录/注册 | `pages/auth/*` 延时和演示状态 | `/auth/login`、`/auth/register`、`/auth/refresh`、`/auth/logout` | M5 | FE3-01 | 成功、凭据错、失效、禁用均来自服务端 |
| 个人中心 | `pages/profile/*` 本地身份和资料 | `GET/PATCH /users/me` | M5 | FE3-02 | 刷新可恢复且字段权限已验证 |
| 市场/详情 | `pages/market/index.tsx`、`ProductDetailPage.tsx` 静态商品 | `GET /products`、`GET /products/{id}` | M6 | FE3-04 | 分页筛选和详情来自后端 |
| 收藏 | 市场按钮、`FavoritesPage.tsx` 静态收藏 | `GET /favorites`、`PUT/DELETE /favorites/{id}` | M6 | FE3-04 | 收藏结果可刷新恢复 |
| 发布/编辑商品 | `PublishProductPage.tsx` 模拟提交 | `POST/PATCH /products`、`POST /uploads/images` | M6 | FE3-05 | 上传、校验、幂等和成功跳转可复现 |
| 我的商品 | `MyProductsPage.tsx` 静态列表和 console 动作 | `/products`、`PATCH /products/{id}/status`、`DELETE /products/{id}` | M6 | FE3-05 | Owner 权限和状态冲突由服务端返回 |
| 求购列表/详情 | `pages/wanted/*` 静态求购 | `GET /wanted`、`GET /wanted/{id}` | M6 | FE3-06 | 列表/详情可刷新恢复 |
| 发布/编辑/关闭求购 | `PublishWantedPage.tsx` 模拟提交 | `POST/PATCH/DELETE /wanted/{id}` | M6 | FE3-06 | 权限、校验和冲突来自服务端 |
| 基线求购结果 | `MatchResultPage.tsx` 静态结果 | Phase 3 关键词/规则结果 | M6 | FE3-06 | 有来源、解释和降级标识 |
| 会话列表/历史/发送 | `pages/transaction/Chat*`、`mocks/chatBackend.ts` | `/chat/sessions`、消息接口及 WebSocket | M6 | FE3-07/FE3-08 | 双账号收发、补拉、去重和重试通过 |
| 报价/订单 | `mocks/transaction.ts`、`stores/mockDb.ts` | 报价和订单接口 | M6 | FE3-09 | 角色、状态、幂等和时间线来自服务端 |
| 见面约定 | `MeetupPage.tsx` 本地约定 | 约定保存/确认接口 | M6 | FE3-09 | 版本冲突和双方确认可复现 |
| 完成/评价 | `ReviewPage.tsx`、`ReviewModal.tsx` 本地提交 | 完成确认、`POST /reviews` | M6 | FE3-10 | 未完成不可评价且重复提交被拒绝 |
| 举报 | `ReportModal.tsx`、`mockDb` 本地提交 | `POST /reports`、`GET /reports/mine` | M6 | FE3-10 | 四类目标及证据权限验证通过 |
| 通知 | `NotificationPage.tsx`、`mockDb` 静态通知 | 通知列表和已读接口 | M6 | FE3-10 | 未读数和服务端一致 |
| 语义搜索 | 市场搜索框关键词过滤 | `GET /search` | M7 | FE4-04 | 语义模式、版本、解释和降级可复现 |
| 智能匹配 | `MatchResultPage.tsx` 静态分数 | `GET /wanted/{id}/matches` | M7 | FE4-05 | 过期、解释、版本和通知可复现 |
| 价格建议 | `PriceAdvicePage.tsx` 静态区间 | `POST /price-advice` | M8 | FE4-06 | 区间、因素、低数据和免责声明可复现 |
| 管理后台 | `pages/admin/*` 静态用户/举报 | `/admin/users`、`/admin/reports`、处理接口 | M6 | FE4-01/FE4-08 | 管理权限、处理结果和审计可验证 |

## 3. 替换顺序

1. FE3-01 至 FE3-03：认证、资料、SDK 和统一错误处理。
2. FE3-04 至 FE3-06：市场、商品、上传、收藏和基础求购闭环。
3. FE3-07 至 FE3-10：聊天、报价、订单、约定、完成、评价、举报和通知闭环。
4. FE3-11：隔离或删除剩余 MVP Mock，填写页面五态实现矩阵。
5. FE4-01、FE4-04 至 FE4-08：管理与智能接口替换和治理联调。

## 4. 每项替换验收

- 页面保留加载、空、成功、失败和无权限状态，业务不适用状态写明理由。
- 401 清理身份并保存完整来源地址；403 显示无权限；404 显示资源不存在；409 显示业务冲突；422 回填字段错误。
- 使用 `frontend/src/sdk/generated/` 的生成类型，不手写第二套接口类型。
- 记录真实接口提交、前端提交、测试数据、命令和结果；仅替换显示数据但写操作仍改本地状态，不算完成。

## 5. 待对签

- M5：认证错误样例、令牌生命周期、资料可写字段；截止：BP2-01/BP2-02 PR 合并前。
- M6：业务状态、冲突、上传限制、WebSocket 与管理接口；截止：BP2-03 至 BP2-05 PR 合并前。
- M7/M8：智能字段、版本、降级和不可用含义；截止：AI Phase 2 契约 PR 合并前。
- M10：确认清单可转换为 Phase 3/4 测试；截止：前端 Phase 2 汇总 PR Review 前。
- M1：确认 Phase 3 与 Phase 4 的替换边界未扩展范围；截止：Phase 2 阶段收口前。
