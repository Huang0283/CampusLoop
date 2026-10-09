# BP2-08 测试数据目录（test-data-catalog）

> 证据文件：`docs/evidence/phase-2/backend-platform/test-data-catalog.md`
> 维护人：M9 ｜ 状态：已交付（PR #76 合并于 c3a4929）

## 数据清单（全部虚构，邮箱统一 @example.com）

共 14 张表、34 行。行数为 `seed.py` 单次执行的净写入量（重复执行零新增）：

| 表 | 条数 | 说明 |
|---|---|---|
| users | 4 | 3 学生（含高频卖家）+ 1 管理员 |
| products | 6 | 覆盖 BOOKS/DIGITAL/DAILY 等类目、ON_SALE/RESERVED/SOLD/HIDDEN 状态 |
| product_images | 2 | 商品图片对象键 |
| favorites | 2 | 收藏关系 |
| wanted_posts | 2 | 求购，含预算区间 |
| chat_sessions | 1 | PRODUCT 类型会话 |
| chat_messages | 3 | TEXT + OFFER + SYSTEM 消息类型 |
| offers | 1 | 议价 |
| orders | 2 | 订单 |
| order_events | 5 | 全状态事件流 |
| meetups | 1 | 见面约定 |
| reviews | 1 | 评价 |
| reports | 1 | PENDING 待处理举报 |
| notifications | 3 | 未读/已读通知 |

## 演示账号（密码均为 `Demo@12345`，stdlib scrypt 派生哈希存储）

| 邮箱 | 角色 | 用途 |
|---|---|---|
| chen.demo@example.com | USER | 卖家主视角（教材/数码闲置） |
| lin.demo@example.com | USER | 买家主视角（求自行车） |
| zhao.demo@example.com | USER | 毕业甩卖卖家 |
| admin.demo@example.com | ADMIN | 内容治理演示 |

> 注意：Phase 2 种子密码使用 stdlib scrypt + 固定盐演示方案，
> Phase 3 由 M5 替换为正式认证方案（passlib/argon2），见 handoff.md。

## 主键策略

- 全部种子行使用显式主键，编号从 1001 起（users 1001-1004、products 2001-2006、
  wanted 3001+ 等），避开业务自增区间，`ON CONFLICT DO NOTHING` 保证幂等。

## 幂等性验证

- 机制：固定主键 + `INSERT ... ON CONFLICT DO NOTHING`
- 自检命令：`python scripts/seed.py --check`（连跑两遍自动比对行数快照，退出码即结论）
- CI 实测（含两遍幂等检查全绿）：
  https://github.com/Huang0283/CampusLoop/actions/runs/36379211539
- 修复一致性问题的比对脚本证据见 migration-review.md

## 风险声明

- 种子不写入任何真实姓名/学号/手机号；如需更大量数据，Phase 3 再评估 `--scale` 参数（当前不在范围）。
