# BP4-04：M6 任务与结果生命周期

作者：M6；基线与验证版本见 `m6-verification.md`。

## 状态与原子性

沿用既有表与状态，避免未经 M9 迁移引入新枚举：

| 状态 | 含义/去向 |
|---|---|
| PENDING | 到达 available_at 后可领取；失败且未达上限仍为 PENDING |
| DONE | 结果、通知及任务完成状态在同一事务提交 |
| SKIPPED | 求购不存在/已关闭/已过期，或所属账号失效；清除其当前结果 |
| FAILED | 本轮事件累计五次尝试后终止；不会自动无限重入 |

领取沿用 `FOR UPDATE SKIP LOCKED`；运行中由事务锁表示，不另存 RUNNING。
进程崩溃会回滚、释放领取锁。M9 负责 Worker 部署、调度及运行观测，
M6 本次只修改该模块中的事件身份与领域处理/重试策略。
正常执行、业务错误、输入 revision 冲突和异常回滚后的安全重试均受五次上限约束。
退避为 `min(60, 2**attempts)` 秒；终态由 M9 运维确认原因后决定是否产生新业务版本或人工重放，
不能在普通用户接口中开放后台任务详情/任意重放。

## 防止旧结果覆盖

执行前读取目录 revision，查询当前求购/所有者并锁定，候选商品在 RPC 后再次检查
ON_SALE、未删除、所有者 ACTIVE、productVersion 一致。
落库前锁定并比较目录 revision，变化则不写结果/通知，走有界 STALE_INPUT 重试。
旧队列事件也只计算当前事实，不能恢复旧商品或求购状态。

`matching_results` 每个 wanted_id 一个当前指针，result_version 是输入商品快照、
求购版本、算法版本和排序参数的 SHA256。facts 保存 items、metadata、
expiresAt、policyVersion，以及本次新增的 inputRevision、wantedVersion。
到期或关闭后 Worker 清除当前指针；旧 JSON 缺少新增字段仍能识别，不要求回填。
业务 API 采用实时受限重算及二次事实过滤，不直接把历史 JSON 当作当前有效结果，
因此 Worker 停止时也不会将旧存储结果直接公开。

## 通知身份

沿用 `(wanted_id, product_id)` 唯一身份和 `first-pair-v1` 策略：
同一求购第一次出现某商品时通知一次，重复投递、版本更新或重新上架不重复提醒。
结果、通知记录及通知身份同事务提交，失败全回滚。
这不是“每个版本都通知”；后续若要重新提醒须经范围与契约确认。

## 验证

专项单元测试覆盖持续 revision 冲突第五次 FAILED；PostgreSQL 测试覆盖
重复投递、双 Worker 领取锁、异常无部分通知、延迟旧事件、关闭后清除。
本机真实 DB 测试尚未执行，交由 M9/M10 在独立测试环境复跑，详见 `m6-handoff.md`。
