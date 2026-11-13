# T1-C12 / T1-C34 登录令牌复测说明

## 改了什么

原接口已经验证 JWT 签名。实际发现的问题是：前端收到任意 `401`，都会尝试用有效的 HttpOnly 登录 Cookie 换一个新令牌，再重发请求。这样可能把“伪造令牌已被拒绝”的结果掩盖掉。

现在只有以下条件全部满足，前端才自动续期：

1. 后端返回 `401 / AUTH_ACCESS_EXPIRED`。
2. 签名、算法、kid、签发方、接收方和必要字段都通过验证。
3. 数据库中的用户和会话仍有效，没有禁用、撤销或超过会话期限。
4. 原请求使用的是当前 SDK 保存的登录令牌，且登录身份没有发生切换。

伪造、篡改、缺少凭证、已撤销会话返回 `AUTH_UNAUTHORIZED`，不自动续期；受保护页面跳回登录。有效 Cookie 不能直接替代业务请求里的错误 Bearer。禁用账号仍走现有的禁用通知和申诉流程。

## T1 怎么复测

在 PR 分支 `fix/session-token-validation` 复测，记录 `git rev-parse HEAD` 的提交号。保留原执行记录，新增本次复测结果；由 T1 根据实际结果确认是否通过。

| 用例 | 操作 | 应看到什么 |
| --- | --- | --- |
| C12：访问令牌过期 | 使用测试环境签发、签名正确但已经过期的 JWT 请求 `GET /users/me` | 原请求 `401 / AUTH_ACCESS_EXPIRED`，不返回资料；登录 Cookie 仍有效时，页面只做一次续期再请求成功 |
| C12：整个会话过期 | 在独立测试库使会话超过期限，再请求 `GET /users/me` | `401 / AUTH_UNAUTHORIZED`，Cookie 续期也失败，页面回登录 |
| C34：篡改签名 | 复制本人业务请求，把 JWT 的签名段前几个字符改掉，再发送 | `401 / AUTH_UNAUTHORIZED`，不能读取或修改资料，即使同时带有效 Cookie 也一样 |
| C34：页面行为 | 浏览器测试将一次 `/users/me` 请求实际发送的 Bearer 改坏，保留有效 Cookie | 接口拒绝，页面回登录，没有偷偷调用续期接口重试 |
| 退出后旧凭证 | 退出登录，再用退出前的 JWT 和 Cookie 分别请求业务接口、续期接口 | 两者都返回 `401`，刷新页面仍为未登录 |
| 多标签页 | 一个标签页切换到另一账号，另一个标签页触发旧请求续期 | 不以新账号身份重发旧请求，要求重新进入页面 |
| 禁用与申诉 | 禁用账号后访问受保护接口 | 按原有 `423` 通知及申诉流程处理，不能用续期绕过 |

测试判断以 Network 中真正发送的 `Authorization`、HTTP 状态和响应错误码为准。只修改 localStorage 里的 `token` 不能证明已篡改凭证：生产登录令牌保存在内存，登录 Cookie 是 HttpOnly。公共市场本来允许游客浏览，仍能看到商品也不能证明鉴权绕过。

不要把完整 JWT、Cookie、密码、浏览器存储或私人资料贴到 Issue、PR、截图里。提交记录只需用例编号、提交号、接口路径、状态码、错误码和脱敏截图。

## C32 的判定边界

刷新访问令牌不等于撤销整个会话。原访问令牌在有效期内且会话未被撤销时仍可有效，这是多标签页并发使用的正常行为。退出、管理员禁用、会话绝对过期和 refresh token 重放后的撤销才应使相关旧凭证失效。C32 要先明确测的是旧 access token、旧 refresh token，还是已撤销会话，不能仅凭“刷新过”统一要求旧 access token 返回 `401`。

## 自动化验证与运行环境

- 后端：`tests/test_access_token_validation.py`，补充签名/算法/kid/iss/aud/字段检查、有效 Cookie 与错误 Bearer 并存、拒绝写入、过期与撤销叠加、新登录 Cookie 不替代旧会话等回归。
- 页面合同测试：`frontend/tests/live/access-token-validation.spec.ts`，覆盖桌面/手机、伪造拒绝、有效续期、续期失败、外部凭证不借用当前登录、并发单次续期。
- 真实接口浏览器测试：`frontend/tests/live/access-token-real.spec.ts`，通过真实注册接口创建临时账号，再向真实后端发送过期/篡改/退出后的凭证；覆盖 1440px、390px 和刷新持久性。只有指定独立 audit API 容器才运行；构造过期令牌前再次检查测试环境、audit 数据库和 Redis DB14/15，不使用日常密钥。
- 已有登录恢复、退出、多标签页切换、账号处理记录续期用例一起复测。

本次独立预览使用 UI `http://127.0.0.1:5197`、API `http://127.0.0.1:18046`，分支 `fix/session-token-validation`。测试数据库为 `campusloop_auth_token_audit_20261105`，专用 Redis 容器 `campusloop-auth-token-audit-redis` 的 DB15，媒体使用独立的 `campusloop-auth-token-audit-public/private` 桶。没有对日常账号数据库执行写入验收。

以下命令用于这套**已启动的独立审计环境**，不能把地址换成日常站点来运行写入测试：

```powershell
# 在此 PR 工作树根目录执行
docker exec -e MINIO_ENDPOINT=minio:9000 -e MINIO_PUBLIC_BUCKET=campusloop-auth-token-audit-public -e MINIO_PRIVATE_BUCKET=campusloop-auth-token-audit-private campusloop-auth-token-audit-api python -m pytest -q -p no:cacheprovider tests/test_access_token_validation.py tests/test_auth.py tests/test_browser_sessions.py tests/test_auth_locking.py tests/test_account_appeals.py

Set-Location frontend
$env:NODE_OPTIONS='--max-old-space-size=1024'
$env:CAMPUSLOOP_UI_URL='http://127.0.0.1:5197'
$env:CAMPUSLOOP_TEST_API_CONTAINER='campusloop-auth-token-audit-api'
npx --no-install playwright test tests/live/access-token-real.spec.ts tests/live/access-token-validation.spec.ts tests/live/account-appeals.spec.ts tests/live/journey.spec.ts --grep 'real API|credentials at|explicit foreign|parallel expired|ordinary account|guest browse, failure recovery|another tab changing'
```

组员没有这套本机容器时，按项目测试环境说明建立自己的隔离数据库和服务，再执行测试；不需要重新制作商品数据集，也不要共享日常账号数据库。

前后端需要同时升级：新前端连接旧后端时，旧后端不能返回 `AUTH_ACCESS_EXPIRED`，合法过期会要求重新登录。没有新增数据库迁移，不改原有界面。
