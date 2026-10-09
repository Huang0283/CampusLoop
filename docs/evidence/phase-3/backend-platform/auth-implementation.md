# BP3-01 真实认证实现

集中实现分支：`task/solo-p3-mvp`。注册/登录使用 Argon2id，访问令牌固定 HS256、kid/iss/aud/sub/sid/jti/iat/exp 校验；最长 15 分钟，刷新族绝对期限最长 7 天。数据库只存刷新摘要；轮换重放撤销整族，并在 401 前提交撤销事实。退出、账号禁用均由数据库鉴权立即生效。

代码：`backend/app/core/security.py`、`services/auth.py`、`api/routes/auth.py`。锁顺序为用户→刷新族→刷新令牌，HTTP 写事务与授权锁同生命周期。Redis 只提供脱敏键限流，登录/注册限流不可用时拒绝；已有会话的基础交易不依赖 Redis。

验证：`python -m pytest tests/test_auth.py -v`。覆盖重复邮箱、强度/类型、公开字段、轮换重放、并发刷新、退出撤销、禁用、管理员越权。只使用 example.invalid/example.com 虚构账号。

2026-10-09用户批准安全刷新身份恢复：浏览器HttpOnly cookie会话（只返回短access），非浏览器仍JSON旋转refresh，两种凭据不在同一族混用。实施和CSRF/期限/部署要求见browser-session-contract.md；新增迁移0008与test_browser_sessions。
