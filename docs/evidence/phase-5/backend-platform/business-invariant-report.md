# BP5-03：M6 业务不变量验收

2026-10-25，执行角色 M10。原任务 PR #121，组分支输入 `9bf23ff57d86b6c8b7c69a686a679f298e52c791`；main 输入 `1b3385ac0df557ddf34d7d9d52d608a9c26e7df7`。修复分支 `fix/m6-p5-acceptance`，以本修复 PR 最终 HEAD 为准。

## 发现与处理

1. P5 组分支缺少 main 已验收的第四阶段治理、监控与边界校验。通过真实 merge 接入 main，保留 M6 的幂等键、游标、缺失分数校验和并发锁修复，没有覆盖为旧实现。
2. 原报告存在跳过数据库用例的历史记录，不能据此签收。此次使用独立 PostgreSQL、Redis15 和 MinIO 完整复验，结果见 verification.md 和 evidence/m6-check-summary.json。
3. 保留 `authenticate`/`browser_session` 的 `with_for_update(key_share=True)`：SQLAlchemy 在 PostgreSQL 生成 FOR NO KEY UPDATE，仍互斥同一用户请求，允许对方通知外键取得 KEY SHARE；没有取消认证锁。

## 可执行验收

- `test_auth_locking.py`：Bearer/浏览器双方互相写通知不死锁，同一用户仍互斥；真实随机独立 schema，测试后清理。
- `test_p5_integration.py`：两个买家并发接受同一商品，只出现 200/409、一条订单和一条创建事件。
- 同文件：双方并发确认完成，只产生一次最终完成；重复确认不增长事件，商品仅在双方完成后 SOLD；并发评价只落一条记录，返回 201/409。
- `test_transaction_api.py`：当前见面版本确认、修改后双方确认清零、非法过去时间/终态拒绝、取消资格、权限、接受失败回滚商品/报价/订单/事件。
- `test_p5_business_contract.py`：幂等键非空白且 1–64 字符，同键同体重放，同键不同体 409；内存替身只验证控制流，数据库事实由上述集成用例证明。

没有新增业务能力、迁移或表。BOOKED、DISPUTED 保留为契约枚举，不虚构为正常路径必经步骤。此为 M6 个人范围技术复验，整组发布、镜像恢复、性能、消费者联调仍需统一 P5 集成提交验收。
