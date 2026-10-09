# BP2-05 状态枚举与转换合同

唯一公开枚举为 canonical OpenAPI；后端 `app/models/enums.py` 与数据库 CHECK 保持相同值，前端展示中文但不能把中文传作状态。此文由集中收尾补充；成员确认与真实接口验收另行记录。

## 商品 ProductStatus

- ON_SALE、RESERVED、SOLD、HIDDEN。
- Owner 上下架：ON_SALE↔HIDDEN；公开列表/详情不显示 HIDDEN 或删除项。
- 接受有效报价：ON_SALE→RESERVED；取消允许订单：RESERVED→ON_SALE；双方完成：RESERVED→SOLD。
- 普通编辑不能使 RESERVED/SOLD 再次在售；争议冻结不自动释放商品。

## 求购 WantedStatus

- OPEN、MATCHED、CLOSED、EXPIRED。
- 发布 OPEN；过截止时间 OPEN→EXPIRED；Owner 关闭 OPEN→CLOSED。
- MATCHED 表示业务确认的匹配进度，不是“算法有候选”即自动匹配成功。何时转入/转出须由 Phase 3/4 业务事件明确，未确认前不由前端猜写。
- CLOSED/EXPIRED 不接受新修改或任务触发；历史会话/审计保留。

## 报价 OfferStatus

- PENDING、ACCEPTED、REJECTED、COUNTERED、EXPIRED、CANCELLED。
- 创建 PENDING，有效期统一 48 小时。
- 当前 proposer 的另一参与方可以 PENDING→ACCEPTED/REJECTED/COUNTERED；proposer 只能 PENDING→CANCELLED。
- COUNTERED 原报价终止，新报价为独立 PENDING；保留 buyerId/sellerId、切换 proposerId。
- 到期 PENDING→EXPIRED；不能只在前端显示过期而后端仍允许接受。
- ACCEPTED 关联唯一订单；其他终止报价不得再次接受/还价/撤回。

## 订单 OrderStatus

- PENDING_CONFIRM、BOOKED、MEETUP_ARRANGED、COMPLETED、CANCELLED、DISPUTED。
- 报价接受创建 PENDING_CONFIRM；本版本约定双方确认后进入 MEETUP_ARRANGED。
- BOOKED 保留兼容已有首版迁移/种子，但不能意味着跳过当前约定确认；Phase 3 如采用该中间态，必须写出具体触发事件，不能 UI 点击即跳转。
- 修改约定令版本 +1、双方约定/完成确认失效，允许态回 PENDING_CONFIRM。
- 当前约定双方确认且双方分别完成后进入 COMPLETED；商品 SOLD，计数仅更新一次。
- 参与者从允许活动态取消进入 CANCELLED，商品释放；完成或争议态禁止普通取消。
- 举报受理/人工确认的争议可转 DISPUTED，暂停普通交易操作；管理员裁决须原因、权限、事务与审计，不能自动风险封禁。
- COMPLETED/CANCELLED 普通终止，不接受约定或完成更新；评价只允许 COMPLETED。

## 举报 ReportStatus

- PENDING、PROCESSING、RESOLVED、REJECTED。
- 提交 PENDING；管理员受理 PROCESSING；明确裁决后 RESOLVED/REJECTED。
- RESOLVED/REJECTED 为终止，普通用户不能写 status；管理员重复处理按幂等规则，不重复处罚/通知。

## 关联类型和身份

- API Role：USER/ADMIN；UI student 对应 USER，UI admin 对应 ADMIN；游客是未认证状态，不是数据库 Role。buyer/seller 是单笔资源参与关系，不是登录角色。
- 用户状态：ACTIVE/DISABLED；无 token 401，角色/对象越权 403，合法凭据但禁用 423，非法字段 422，过时版本/非法状态 409。
- ChatSessionType：PRODUCT/WANTED；MessageKind：TEXT/IMAGE/OFFER/ORDER_EVENT/SYSTEM。
- ReportTargetType：USER/PRODUCT/ORDER/CHAT_MESSAGE；不得把旧 `/report` 路由当目标类型。
- ReportReason：FAKE_PRODUCT/DESCRIPTION_MISMATCH/SPAM/ABNORMAL_PRICE/HARASSMENT/VIOLATION。
- NotificationType：MESSAGE/OFFER_RECEIVED/OFFER_ACCEPTED/OFFER_REJECTED/MATCH_FOUND/ORDER_STATUS_CHANGED/MEETUP_REMINDER/REVIEW_REQUEST/REPORT_RESULT。
- 后端另有 MeetupStatus（PROPOSED/CONFIRMED/COMPLETED/CANCELLED），当前公开 Meetup 使用 version 与双确认布尔值，不把它误当已公开的另一套订单状态。

## 自动化检查与待实现

- `python scripts/m6_phase2/check_contract.py` 核对五类状态、角色、举报目标/原因和通知类型，不忽略大小写差异。
- `cd frontend; npm run test:transaction` 检查原型约定/报价/评价边界。
- Phase 3 必须以服务端权限和事务执行上面的变更；Phase 4 补受理/裁决、任务和实时一致性；文档与 Mock 不代替真实测试。
