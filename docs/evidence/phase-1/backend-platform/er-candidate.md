# BP1-09 实体关系草图与约束候选

> Owner：M9 ｜ 阶段：BP-P1 ｜ 状态：设计候选（Phase 2 的 `alembic/versions/0001_initial_schema.py` 按本表实现）
> 实体字典来自 M6 BP1-04；字段名对齐 `openapi/campusloop.v1.yaml`（camelCase 由 API 层序列化转换，数据库用 snake_case）

## 1. ER 总图（文字版，→ 外键）

```text
users ─┬─< products ─┬─< product_images
       │             ├─< favorites >─ users
       │             └─< orders >───── users(buyer)
       ├─< wanted_posts
       ├─< chat_sessions ─┬─< chat_messages ── offers
       │                  └──── offers ────── orders
       ├─< reviews >─ orders
       ├─< reports（target: user/product/order/chat_message）
       ├─< notifications
       └─< refresh_sessions

orders ─< order_events（不可变）
orders ── meetups（1:1，版本化双方确认）
```

## 2. 表清单与约束候选

> 审计字段约定：所有业务表带 `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`；可变表另带 `updated_at`（触发器或应用层维护，Phase 2 用应用层）。金额用 `NUMERIC(10,2)`，枚举用 `VARCHAR + CHECK`（值与 OpenAPI 枚举完全一致）。

### users（Owner: M5）
| 字段 | 类型 | 约束/说明 |
|---|---|---|
| id | BIGSERIAL | PK |
| email | VARCHAR(255) | **UNIQUE NOT NULL**，登录标识，公开响应禁止返回 |
| password_hash | VARCHAR(255) | NOT NULL，登录后不返回 |
| nickname | VARCHAR(50) | NOT NULL |
| avatar_url | VARCHAR(500) | 可空 |
| role | VARCHAR(10) | CHECK IN ('USER','ADMIN')，默认 USER |
| status | VARCHAR(10) | CHECK IN ('ACTIVE','DISABLED')，默认 ACTIVE |
| school/college/major | VARCHAR(100) | 可空，教学模拟认证 |
| credit_level | VARCHAR(20) | 可空 |
| rating_avg | NUMERIC(3,2) | CHECK 0..5，默认 NULL |
| trade_count | INTEGER | CHECK >= 0，默认 0 |

### refresh_sessions（Owner: M5，令牌轮换与撤销）
- PK id；**UNIQUE(token_hash)**；FK user_id → users ON DELETE CASCADE；
- expires_at NOT NULL；revoked_at 可空；created_at。
- 唯一约束 token_hash 保证令牌不可重复使用。

### products（Owner: M6/M9 结构，AI 组只写 embedding）
| 字段 | 类型 | 约束/说明 |
|---|---|---|
| id | BIGSERIAL | PK |
| seller_id | BIGINT | FK → users，NOT NULL |
| title | VARCHAR(100) | NOT NULL（契约 maxLength=100） |
| category | VARCHAR(50) | NOT NULL，索引（列表筛选） |
| condition | VARCHAR(30) | NOT NULL，成色 |
| description | VARCHAR(3000) | 契约 maxLength=3000 |
| price | NUMERIC(10,2) | NOT NULL，**CHECK price >= 0** |
| original_price | NUMERIC(10,2) | CHECK >= 0，可空 |
| campus_location | VARCHAR(100) | NOT NULL |
| status | VARCHAR(10) | CHECK IN ('ON_SALE','RESERVED','SOLD','HIDDEN')，默认 ON_SALE；复合索引 (status, category, created_at) |
| embedding | vector(768) | 可空；pgvector；**Owner=M7/M8（Phase 4 写入）**；ivfflat 索引 P4 再建 |
| created_at/updated_at | TIMESTAMPTZ | 审计 |

### product_images（Owner: M9 存储 + M6 业务）
- PK id；FK product_id → products ON DELETE CASCADE；object_key VARCHAR(500) NOT NULL；sort INTEGER NOT NULL DEFAULT 0；
- **UNIQUE(product_id, sort)**（同商品图序唯一）；**CHECK cardinality ≤ 5 由应用层+契约 maxItems=5 双重保证**。

### favorites（Owner: M6）
- PK id；FK user_id、FK product_id；**UNIQUE(user_id, product_id)**（防重复收藏）；created_at。

### wanted_posts（Owner: M6，求购）
- PK id；FK owner_id → users；title VARCHAR(100) NOT NULL；category VARCHAR(50)；description VARCHAR(3000)；
- budget_min/budget_max NUMERIC(10,2)，**CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)**；
- status CHECK IN ('OPEN','MATCHED','CLOSED','EXPIRED')；expires_at；索引 (status, category)。

### chat_sessions / chat_messages（Owner: M6，实时通信）
**chat_sessions**：PK id；type CHECK IN ('PRODUCT','WANTED')；product_id/wanted_id 可空 FK（二选一，**CHECK 恰好一个非空**）；buyer_id/seller_id FK → users；**UNIQUE(type, product_id, buyer_id)** 与 **UNIQUE(type, wanted_id, buyer_id)**（同一买家同一商品只开会话）；last_message_at 索引（会话列表排序）。

**chat_messages**：PK id **BIGINT 单调递增**（契约 `afterId` 补拉游标）；FK session_id ON DELETE CASCADE；sender_id FK → users（SYSTEM 消息可空）；kind CHECK IN ('TEXT','IMAGE','OFFER','ORDER_EVENT','SYSTEM')；content TEXT；image_object_key；offer_id 可空 FK；**索引 (session_id, id)**（补拉查询唯一入口）；created_at（不可变表，无 updated_at）。

### offers（Owner: M6，议价）
- PK id；FK session_id、buyer_id、seller_id；amount NUMERIC(10,2) CHECK >= 0；
- status CHECK IN ('PENDING','ACCEPTED','REJECTED','COUNTERED','EXPIRED','CANCELLED')；
- **idempotency_key VARCHAR(64)，UNIQUE(session_id, buyer_id, idempotency_key)**（防重复提交报价）；
- expires_at；counter_of 可空 FK → offers（还价链）；created_at/updated_at。

### orders / order_events / meetups（Owner: M6，交易闭环）
**orders**：PK id；FK product_id（**UNIQUE**，一件商品至多一个非取消订单，由应用层在事务中校验取消后重卖）；buyer_id/seller_id FK；**CHECK buyer_id <> seller_id**；amount CHECK >= 0；
- status CHECK IN ('PENDING_CONFIRM','BOOKED','MEETUP_ARRANGED','COMPLETED','CANCELLED','DISPUTED')；
- buyer_confirmed_complete / seller_confirmed_complete BOOLEAN 默认 false；
- version INTEGER NOT NULL DEFAULT 1（乐观锁，Meetup 契约要求 version）；
- 索引 (buyer_id, status)、(seller_id, status)（"我的订单"页）。

**order_events**（不可变审计流）：PK id；FK order_id ON DELETE CASCADE；from_status/to_status；operator_id 可空 FK；description VARCHAR(500)；created_at。**只 INSERT，禁止 UPDATE/DELETE**（应用层保证）。

**meetups**：PK id；FK order_id **UNIQUE**（1:1）；version INTEGER CHECK >= 1（双方按同一版本确认）；campus_location VARCHAR(100) NOT NULL；scheduled_date DATE NOT NULL；time_slot_start/end TIME NOT NULL，**CHECK time_slot_start < time_slot_end**；buyer_confirmed/seller_confirmed BOOLEAN 默认 false；note VARCHAR(500)。

### reviews（Owner: M6）
- PK id；FK order_id、reviewer_id、reviewee_id；
- **UNIQUE(order_id, reviewer_id)**（一单一人一评，双评靠买卖双方各一条）；**CHECK reviewer_id <> reviewee_id**；
- rating INTEGER **CHECK rating BETWEEN 1 AND 5**；comment VARCHAR(500)；created_at（不可变）。

### reports（Owner: M5，治理）
- PK id；reporter_id FK；target_type CHECK IN ('USER','PRODUCT','ORDER','CHAT_MESSAGE')；target_id BIGINT NOT NULL（多态引用，应用层校验存在性）；reason CHECK IN ('FAKE_PRODUCT','DESCRIPTION_MISMATCH','SPAM','ABNORMAL_PRICE','HARASSMENT','VIOLATION')；description VARCHAR(1000)；
- evidence JSONB（管理员可见，普通用户不可读）；status CHECK IN ('PENDING','PROCESSING','RESOLVED','REJECTED')；handled_by FK 可空；**索引 (status, created_at)**（管理端队列）。

### notifications（Owner: M6/M9）
- PK id；FK user_id（索引 (user_id, read_at)）；type CHECK IN (契约 9 种)；payload JSONB；read_at 可空（NULL=未读）；created_at。

## 3. 敏感/状态/审计字段汇总

| 类别 | 字段 | 保护方式 |
|---|---|---|
| 敏感-凭据 | users.password_hash、refresh_sessions.token_hash | 永不出现在任何响应；日志脱敏 |
| 敏感-隐私 | users.email、evidence（举报证据） | 仅本人/管理员/处理人可见，序列化层过滤 |
| 状态 | products.status、wanted.status、offers.status、orders.status、reports.status、meetups 双确认 | CHECK 约束 + 应用层状态机（M6 BP1-05）双重保证 |
| 审计 | 全表 created_at；orders.version；order_events 全表不可变 | 应用层 + 迁移层注释 |

## 4. 跨组待确认表

| 待确认项 | 对方 Owner | 期限 |
|---|---|---|
| 契约无 users.status 枚举值（423 禁用语义），建议库层 'ACTIVE'/'DISABLED' | M5 | BP-P2 |
| orders.product_id 是否允许"取消后重卖"（影响 UNIQUE 方案） | M6 | BP-P2 |
| embedding 维度 768 vs 1024（依赖 M7 选型） | M7 | BP-P3 前 |
| order_events 是否需要 DB 层防 UPDATE（触发器 or 应用层承诺） | M6/M10 | BP-P2 |

## 5. 验收自检

- [x] M6 BP1-04 实体字典中全部实体（用户/商品/求购/会话/消息/报价/订单/约定/评价/举报/通知）均有归属和约束候选
- [x] 每个唯一/检查/外键约束都给出了业务理由
- [x] 敏感字段、状态字段、审计字段分类明确
