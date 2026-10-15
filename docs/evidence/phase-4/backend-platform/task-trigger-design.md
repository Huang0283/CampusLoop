# BP4-03：M6 版本化任务触发

作者：M6；基线：`9ceddb1cc2d90f9f587b88017e92b043630e0f1d`；实现日期：2026-10-15。
个人分支：`task/m6-p4-ai-orchestration`，目标：`phase4/backend-integration`。

## 业务路径

`POST/PATCH /products`、商品状态变化、`POST/PATCH /wanted`、关闭求购
→ SQLAlchemy `before_flush` 收集业务字段变化
→ `after_flush_postexec` 更新目录 revision 并写 `matching_jobs`
→ 提交商品/求购及任务的同一 PostgreSQL 事务。

触发实现：`backend/app/services/matching_jobs.py`；发布路由已有事务接入，
无需在路由另行发送消息。任务写库不调用模型，不依赖 Worker/Redis 队列消费成功。
数据库本身不可写仍应报错，不能吞掉数据库故障后宣称发布成功。
回滚业务事务同时回滚任务；Worker 晚启动可处理已持久化的 PENDING 任务。

商品变化向当前 OPEN 且未过期求购扇出匹配任务；求购变化只刷新自身。
账号状态/角色变化刷新有效求购，避免禁用用户的旧结果继续有效。
没有有效求购时商品变更只推进 revision，不制造无接收对象的匹配任务；
之后创建求购会自动扫描当前商品。这里没有单独的价格训练/向量建索引任务；
价格为只读咨询，向量运行设施由 M7/M9 接收。
浏览数、收藏数、embedding 等非本编排业务输入的变化不触发全目录刷新。

## 幂等身份

事件键：`表名:对象ID:SHA256(业务字段 + updated_at/created_at)`。
金钱统一两位小数字符串，避免 Python `50` 与 PostgreSQL `Decimal('50.00')`
形成不同键；JSON 属性按键排序。时间戳及字段取已 flush 的实体。
事件键不包含消费次数、随机 UUID 或目录 revision。

数据库现有唯一约束 `(event_key, wanted_id)` + `ON CONFLICT DO NOTHING`
阻止重复有效任务；同一批次 wanted ID 也先去重。业务修改形成新键。
目录 revision 只负责并发快照保护，不充当事件投递身份。
消费者处理延迟事件时重新读取当前事实，不将事件中的旧商品内容写回业务表。

## 可复验测试

在 backend 运行：

```powershell
../.venv/Scripts/python.exe -m pytest tests/test_ai_orchestration.py tests/test_matching_jobs.py -ra
```

覆盖金额重新加载后的键一致、字段变化新版本、计数变化不触发任务、
重复事件/重复接收 ID、发布回滚、延迟事件、结果及通知去重。
真实 PostgreSQL 场景的本机执行限制见 `m6-verification.md`，不以单元测试替代数据库验收。
