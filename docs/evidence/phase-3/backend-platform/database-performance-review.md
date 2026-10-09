# BP3-09 数据库与查询预算

迁移链 0001→0008：认证族/令牌 lineage；UUID/评价/订单/幂等约束；私有上传/读游标；审计上下文；自增序列对齐；匹配 outbox/current/dedup；事实修订与HttpOnly会话摘要。独立空库完整迁移回滚结果见质量verification，0008最终轮次单列记录。回滚只在专门 migration_audit 库执行，不回滚演示或用户数据。

索引：chat_messages(session_id,id)、notifications(user_id,id)、uploaded_objects(purpose,created_at)、matching_jobs(status,available_at,id)，原领域复合索引保留。作者/评分/完成交易用聚合 SQL；商品、求购、会话、报价、订单、管理员列表批量序列化。

test_query_budget.py 对 1 条与 20 条序列化对比，查询数相同且不超过 15；是 N+1 回归预算，不是吞吐或大规模压测证明。新种子抬高序列，0005 修复已有固定 ID 造成的自增碰撞/WS 水位倒退，不删除用户记录。
