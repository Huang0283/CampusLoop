# BP2-07 迁移评审记录（migration-review）

> 证据文件：`docs/evidence/phase-2/backend-platform/migration-review.md`
> 维护人：M9 ｜ 状态：已交付（PR #76 合并于 c3a4929）

## 迁移清单

| 迁移 | 内容 | upgrade | downgrade |
|---|---|---|---|
| `0001_initial_schema` | 全部 15 张表 + pgvector 扩展 + embedding 列 | CREATE EXTENSION vector + 建表 | 逆序删表（不删扩展，共享资源） |

## 已覆盖约束（评审结论逐项确认）

- [x] 主键/外键/唯一：users.email、favorites(user,product)、reviews(order,reviewer)、meetups(order)、offers 幂等键
- [x] 检查约束：rating 1-5、金额非负、枚举 CHECK 与 OpenAPI 一致、buyer≠seller、budget_min≤budget_max
- [x] 索引：`(status,category)` 列表页、`(session_id,id)` 消息补拉、`(user_id,read_at)` 通知未读
- [x] 审计字段：全表 created_at，可变表 updated_at
- [x] 回滚验证：CI 步骤 "Verify rollback then re-migrate" 实测通过
      https://github.com/Huang0283/CampusLoop/actions/runs/36379211539

## 模型 ↔ 迁移 ↔ 种子三方一致性评审（验收整改新增）

首版存在"模型/迁移/种子三方列定义不一致"问题，曾导致 CI 种子步骤报
`sqlalchemy.exc.CompileError: Unconsumed column names: attributes, favorite_count`。
经脚本化三方比对共发现并修复 4 处：

| 表 | 问题 | 修复 |
|---|---|---|
| products | 模型缺 `attributes`、`favorite_count`（迁移/种子均有） | 模型补列（JSONB / Integer, default 0） |
| orders | 模型列名 `agreed_price` 与迁移/种子的 `amount` 不一致；缺 `cancelled_reason` | 模型改名对齐 + 补列（String(200) nullable） |
| chat_sessions | 迁移有 `last_message_at`，模型漏定义 | 模型补列（DateTime nullable，双索引依赖此列） |
| meetups | 模型有 `created_at`/`updated_at`（TimestampMixin），迁移漏建列 | 迁移补两列（server_default now()） |

修复后经 5 项机器校验全部通过（种子字段⊆模型列、模型列==迁移列、
必填列全覆盖、字符串不超长、可空性差异单独列示），CI 恢复全绿。

### 待 M6 确认的可空性差异（不阻塞，已记录）

| 列 | 模型 | 迁移 | 建议 |
|---|---|---|---|
| order_events.operator_id | NOT NULL | NULL（FK ondelete SET NULL） | 迁移为准，模型应改 nullable=True（系统事件无操作人） |
| products.campus_location | NOT NULL | NULL | 二选一：模型为准则迁移补 NOT NULL DEFAULT |
| reports.description | NULL | NOT NULL | 建议迁移为准（截图举报可无文字说明） |

## 验证命令（任何人可复现）

```bash
cd backend
alembic upgrade head
alembic downgrade base && alembic upgrade head   # 回滚再迁移
python scripts/seed.py --check                    # 种子两遍幂等
```

CI 中上述三步均自动执行：https://github.com/Huang0283/CampusLoop/actions/runs/36379211539

## 与 BP1-09 ER 草图的差异

- orders 金额列命名以契约（`amount`）为准，ER 草图中的 `agreed_price` 未采用（见上表修复记录）。
- 其余无差异。

## 遗留问题

- `orders.product_id` 取消后重卖的唯一性方案，待 M6 确认（部分唯一索引位置已预留）。
