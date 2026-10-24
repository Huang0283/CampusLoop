# M6 Phase 5：并发确认完成死锁修复与回归

日期：2026-10-24。远程失败提交：9f985aee419e06a8a790ba8efcf7c2ed6411ed9b。

## 原始失败与根因

GitHub CI #196 的 Full test suite：118 passed、1 failed、1 xfailed。
失败用例为 tests/test_p5_integration.py::test_concurrent_completion_and_reviews_remain_unique。
买卖双方同时确认完成时，一方收到 503 SERVICE_UNAVAILABLE / Database unavailable。

authenticate 和 browser_session 原来使用 SELECT users ... FOR UPDATE。
两个事务各锁住自己的用户记录；订单操作在串行等待或写对方通知时，
notifications.user_id 的外键检查要求在对方用户记录上取得 FOR KEY SHARE。
FOR UPDATE 与 FOR KEY SHARE 冲突，形成事务互相等待。
get_db 捕获 SQLAlchemyError 后统一返回 503，因此客户端看不到真实死锁。

独立 PostgreSQL 16.4 实验已复现相同的用户锁/通知外键死锁：
原认证代码下，Bearer 与浏览器两条并发回归均报 psycopg.errors.DeadlockDetected。
这证明此锁环真实存在；原 GitHub 运行未取得服务端原始数据库异常日志。

## 修复

只调整 backend/app/services/auth.py 中 authenticate、browser_session 的用户行锁：
with_for_update(key_share=True) 在 PostgreSQL 中生成 FOR NO KEY UPDATE。
它仍排斥同一用户的并发认证锁和状态修改，但兼容通知外键的 FOR KEY SHARE。
保持 user -> family -> refresh 锁顺序，保留会话锁、撤销与账号状态检查。
没有删除或跳过原来失败的订单测试，也没有修改 CI 工作流。

## 回归

新增 backend/tests/test_auth_locking.py，使用真实 PostgreSQL，覆盖：

1. Bearer 认证的双方同时给对方写通知，均提交成功。
2. 浏览器会话的双方同时给对方写通知，均提交成功。
3. Bearer 同一用户仍互斥；首个事务释放后，后续请求成功。
4. 浏览器会话同一用户仍互斥；首个事务释放后，后续请求成功。

测试使用随机独立 schema，仅创建实际 User、AuthSessionFamily、Notification 表，
完成后清理该 schema。直接调用认证数据库逻辑，不调用 Redis 限流。
没有数据库时按项目集成测试约定明确跳过。

## 已取得的验证结果

- 修复前：上述新增测试 2 failed、2 passed，失败为真实数据库死锁。
- 修复后：4 passed；JUnit 中 tests=4、failures=0、errors=0、skipped=0。
- backend 的 ruff check . 与 ruff format --check . 均通过。
- 其余本地套件使用默认无数据库环境：82 passed、41 skipped、1 xfailed。
  41 个跳过包含新增的 4 个数据库测试；它们已在独立数据库中另行实际执行。

原始证据见 evidence/m6-auth-lock-before.log、m6-auth-lock-after.log、
m6-auth-lock-tests.xml、m6-auth-lock-local-suite.log。

## 验收边界与提交后动作

本地独立数据库验证的是实际认证代码与外键锁行为。
本机未运行整套 pgvector、Redis、MinIO 与浏览器依赖，
因此原始订单 HTTP 集成测试及完整 CI 尚未在修复后验收。
将本修复提交到现有个人分支后，由新提交自动触发完整 CI；
确认原失败测试及随后执行的步骤通过，再更新 PR 验证结果。
不能用上述局部通过结果声明第五阶段全部完成。
