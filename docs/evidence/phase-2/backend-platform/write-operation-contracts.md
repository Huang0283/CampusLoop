# BP2-04 写操作权限、前置状态与原子性

## 统一写入规则

- 这是集中收尾的可实现设计，不是已运行的数据库业务接口。认证细节继承 M5 的 `auth-contract.md` 和 `auth-security-design.md`。
- 当前主体从服务端 token 的 uid/sid 取得；请求里的 buyerId/sellerId/reviewerId/role 不作为授权依据。
- canonical 中声明的 Idempotency-Key 是 UUID。作用域为 `(uid, operationId, resourceId, key)`，请求规范化后保存哈希；同键同内容重放返回原成功响应，同键不同内容 409。失败事务不能留下“已成功”幂等记录。
- 关联写入在单一 PostgreSQL 事务中完成；权限、状态、唯一约束和版本在写入前重新检查。锁按商品→报价→订单→约定/评价的固定顺序取得，避免死锁；冲突重试不得重复业务事件。
- 核心事实与事件/通知 outbox 同事务保存，提交后异步推送；WS 发送失败不回滚已提交订单，恢复由消息/事件游标补拉。
- 同一单行状态操作使用条件更新或行锁；跨资源操作检查事务整体受影响行数。异常 rollback，500 不返回 SQL/堆栈/敏感输入。
- 约定和完成确认带当前版本；旧版本返回 409 STATE_CONFLICT，客户端刷新当前版本后重新确认，不能自动替用户同意新约定。

## 账号写入（M5）

- 注册：公开、有效白名单邮箱与字段；users 与 refresh family/session 原子创建；邮箱唯一冲突映射 409 EMAIL_ALREADY_REGISTERED。示例：昵称齐全且合法返回 201；role=ADMIN 输入整体 422。
- 登录：先校验密码，再确认 ACTIVE；会话签发及审计保持一致。错误凭据 401 AUTH_INVALID_CREDENTIALS，合法凭据但禁用 423；不存在邮箱不能被不同错误文本枚举。
- 刷新：原子消费单次 refresh token 并签发继任；合法家族固定期限；检测消费过的 token 撤销整链，不只单个 token。无效/过期/重放统一 401，不回显 token。
- 退出：当前 Bearer sid 撤销；无请求 body；已退出但仍可验证的相同会话按 M5 重复退出语义 204，不接受伪造 token。
- 更新本人：只允许 nickname/avatar/bio/school/college/major，至少一个，显式 null 清空可空字段；不可修改 email/role/status/信誉/交易次数。字段非法整体 rollback，不部分保存。

## 市场和求购（M6）

- 创建商品/求购：学生、有效完整输入和幂等键；Owner 由 uid 推导，默认 ON_SALE/OPEN；预算 min<=max、有效时间和允许图片必须服务端验证。商品/图片关联/幂等结果同事务。
- 编辑商品：Owner 且 ON_SALE/HIDDEN，RESERVED/SOLD 返回 409；不能更改 seller、已有交易金额或写 status 绕过交易。
- 商品上下架：Owner 的 ON_SALE↔HIDDEN；有未取消关联订单禁止；交易 RESERVED/SOLD 不通过此接口变更。
- 删除商品：Owner、无未取消关联订单，软删除及可见性变更同事务；已有审计/订单快照保留，不级联抹去证据。
- 收藏 PUT/DELETE：学生、公开存在商品；唯一 `(user_id, product_id)`，重复 PUT/DELETE 204，不能从参数替另一人收藏。
- 单文件公共图片上传：学生，JPG/PNG、至多 5 MiB；对象与 URL 必须受控。后续数据库绑定失败的孤儿文件由清理策略回收，不能把上传成功当作商品已创建。
- 修改/关闭求购：Owner、OPEN；过期/关闭后编辑 409；关闭动作不删除已产生会话或审计，不允许第三人改变匹配约束。

## 会话、消息和报价（M6）

- 创建会话：学生访问合法 productId 或 wantedId，资源 Owner 决定对方；自聊 422/业务冲突，隐藏/删除资源 404；上下文与双参与者唯一，竞争创建返回同一会话，不重复。
- 发送消息：参与者，kind=TEXT/IMAGE，合法 clientMsgId；唯一 `(sender_id, client_msg_id)`。文本必须非空，图片必须受控 URL；持久化消息和未读/事件同事务，提交后推送。重复补发得到同 ID。
- 会话已读：参与者，只允许本会话已存在消息位置；水位单调不下降。越权 403，消息不属于该会话 422。
- 创建报价：参与者及会话商品在售、金额有限正数且精确到分；buyer/seller 来自商品所有权和会话，proposer 是当前 uid；PENDING、48 小时有效，不锁商品。
- 接受报价：PENDING 未过期、当前 uid 是 proposer 的另一交易参与者、商品 ON_SALE 且无有效订单。锁商品/报价后，报价 ACCEPTED + 唯一订单 PENDING_CONFIRM + 商品 RESERVED + 事件/outbox 原子提交。同幂等键重放返回同订单；另一报价抢同商品返回 409，不能创建第二订单。
- 拒绝报价：同样是当前另一参与者、有效 PENDING；转 REJECTED。终止态重复操作按当前状态返回 409，不再发通知。
- 还价：有效 PENDING、当前另一参与者；旧报价 COUNTERED，新报价 PENDING 且 proposer 切为当前 uid，buyer/seller 不交换；链接与新有效期同事务。原报价不能再被接受。
- 撤回：当前 proposer、有效 PENDING；转 CANCELLED。不把 seller 恒定当作报价处理者，也不把 buyer 恒定当作发起者。

## 约定和订单（M6）

- 保存约定：订单参与者，非 COMPLETED/CANCELLED/DISPUTED；校验校内地点、日期、时间段。version+1、双约定确认和双完成确认全部置 false、订单 PENDING_CONFIRM、变更事件同事务；保存新版本不能沿用旧完成确认。
- 确认约定：参与者、PENDING_CONFIRM/BOOKED、请求 meetupId/version 等于当前；各自标记确认，单方保持待确认，双方进入 MEETUP_ARRANGED。同角色重复确认无新增事件/通知。
- 确认完成：参与者、MEETUP_ARRANGED、当前版本双方已确认；单方只设自身旗标，双方同时满足后订单 COMPLETED + 商品 SOLD + 双方交易次数聚合/评价通知同事务。重复完成不能重复增加次数。
- 取消：参与者、PENDING_CONFIRM/BOOKED/MEETUP_ARRANGED；CANCELLED + 商品释放 ON_SALE + 事件/outbox 同事务。COMPLETED/DISPUTED 普通用户 409；管理员争议裁决单独审计，不复用普通取消绕过治理。

## 评价、举报和通知（M6/M5）

- 评价：学生及完成订单参与者；reviewee 从订单的另一方推导；四项整数 1–5。唯一 `(order_id, reviewer_id)`；评价、合法评分聚合/互见规则与通知同事务。重复 key 返回原结果，不同 key 重复评价 409；未完成/取消订单 409，第三人 403。
- 举报：学生、合法可见对象；CHAT_MESSAGE 必须参与该会话，ORDER 必须参与交易；最多 5 个本人私有上传的证据对象。举报记录与审计/outbox 原子保存，不公开私密消息；报告实体不可由上传成功替代。
- 单条/全部通知已读：仅 recipient=uid；幂等，不重复投递，不修改其他接收人。
- 管理员处理举报：ADMIN、PENDING/PROCESSING、允许动作和必填说明；终止状态重复同键回原响应，其他重复 409。处理结果、关联对象变化、不可删除审计和通知同事务；风险标签只能辅助，不自动封禁。

## 必测的失败与恢复

1. 两个不同买家接受同一商品的不同报价，只能有一个成功订单。
2. 接受报价在订单插入后故障，报价、商品、事件/outbox 全部回滚。
3. 约定修改与完成确认并发，旧版本完成必须被拒绝，不能出现旧约定完成新版本订单。
4. 两方同时完成，只增加一次订单完成事实与双方各一次交易计数。
5. 重复 WS/HTTP 补发同 clientMsgId，存储和页面均只出现一次。
6. 评价或举报请求篡改 uid/Owner，返回拒绝且无落库；私有证据匿名 URL 不可读。
7. 推送服务不可用时写入仍可追踪；恢复补拉不产生第二订单、消息或通知。

这些是 Phase 3/4 必须真实运行的用例；Phase 2 的 store 测试只能验证原型，不当作数据库并发/故障测试完成。
