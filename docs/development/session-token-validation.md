# T1-C12 / T1-C34 登录令牌复测说明

## 2026-11-13：第二次实测（当前工作区版本）

本次重新执行测试，没有复用上一轮通过结果。实际分支为 `main`，`git rev-parse HEAD` 为 `b42eb606eb02da573c6671e5d35bf3650a07a544`；本节版本以本次命令输出为准，不能用下方历史记录的 SHA 代替。

- 日常 `5174/8001`、T2 `5184/18024`、T1 `5185/18025`：相关鉴权、交易、媒体源码哈希与当前工作区一致；实际提供的前端 SDK 一致（排除各自 API 地址配置），连接地址正确；匿名及伪造令牌共 18 个请求全部 401。
- T1/T2 C12：正常签发的 3 秒令牌先返回 200，自然到期后，读取资料、读取订单和修改资料全部 `401 AUTH_ACCESS_EXPIRED`。
- T1/T2 C34：实际发送篡改签名的 Bearer，读写全部 `401 AUTH_UNAUTHORIZED`，即使带有效 Cookie 也无法通过；失败的修改没有改变资料。
- T1/T2 私聊图片越权：本次各新发一条图片消息（ID 均为 3），双方读取 200，无关用户 404，游客 401，匿名存储直链 403；无关用户读取聊天消息 403。
- 新建独立数据库 `campusloop_audit_session_repeat_20261113`、Redis DB14，44 项集成检查全部通过，覆盖整个会话过期、退出后失效、私有媒体及头像归属等；没有修改日常数据库。

本轮证据单独保存在 `.codex-tmp/session-recheck-20261113-repeat/`，不覆盖上一轮证据；其中 `integration.env` 含私有配置，不可上传。原 T1 失败记录保留，本次不代替 T1 签收，也不能据本机结果判断组员电脑的运行版本。

网页重跑 **12/12 通过**（T1/T2 × 桌面/手机 × 过期/伪造/仅改 localStorage）。过期：401 → 有效会话续期 → 200；伪造：401 → 登录页，没有自动续期。刷新恢复亦已检查，证据见 `browser-results.json`。

## 2026-11-13：当前 main 三环境复核

复核软件：`b42eb606eb02da573c6671e5d35bf3650a07a544`。本机日常网页/API 为 `5174/8001`，T2 为 `5184/18024`，T1 为 `5185/18025`。三套运行 API 中的 `security.py`、`services/auth.py`、认证、交易和私有媒体路由均与当前源码逐文件哈希一致；三套网页实际提供的 SDK 在去除各自 API 地址配置后也一致，且网页确实连接各自的 API。

| 检查 | 实际结果 |
| --- | --- |
| 三环境匿名/伪造请求 | `/users/me`、`/orders`、`/admin/users` 全部返回 401，共 18 个拒绝检查 |
| T1/T2 C12 自然过期 | 在各自审计容器中用现有签发函数签发 3 秒 access token，先请求确认 200，等待自然到期后 GET 资料、GET 订单、PATCH 资料均返回 `401 AUTH_ACCESS_EXPIRED`；即使同时带有效登录 Cookie，原请求仍被拒绝 |
| T1/T2 C34 真实篡改 | 篡改签名并实际发送 Bearer，GET/PATCH 均返回 `401 AUTH_UNAUTHORIZED`，有效 Cookie 不能代替坏 Bearer，失败 PATCH 没有改变资料 |
| T1/T2 网页过期恢复 | 1440px、390px 都是订单请求 401 → 一次会话续期 200 → 订单重试 200；另行刷新后正常恢复。这次刷新产生的会话恢复请求与前面的单次续期分别统计 |
| T1/T2 网页伪造拒绝 | 两种宽度均为订单请求 401 → 返回 `/login`，期间没有会话续期重试；无脚本错误、无横向溢出 |
| T1/T2 localStorage 对照 | 只改 localStorage 的 `token` 再刷新仍能进入交易中心；实际业务凭证并未被篡改，页面通过有效 HttpOnly Cookie 恢复会话。这种操作不能证明 C34 失败 |
| T1/T2 私聊图片越权 | 各环境通过正常 API 上传私聊图片并发送：参与者 A/B 为 200，返回 `Cache-Control: no-store`；无关用户 D 为 404，游客为 401，匿名直接访问私有存储为 403；D 读取该会话消息也被 403 拒绝 |
| 独立审计库集成检查 | 44 项全部通过，覆盖 access token、浏览器会话、退出/绝对到期、私有媒体、头像归属和申诉权限；没有跳过项 |

网页共执行 12 个场景（2 个测试环境 × 2 种宽度 × 3 个凭证场景），均使用真实登录和 API，没有替换响应。写入验收位于独立数据库 `campusloop_audit_session_recheck_20261113`、Redis DB14；T1/T2 运行实例仅新增各自的测试私聊图片/消息和登录记录，没有重置账号、交易、商品或媒体。日常环境只做运行代码、前端连接与拒绝请求核验，没有修改日常会话、签发日常测试凭证或执行资料写入测试。

第一次独立集成运行误继承了 T1 的 CORS 来源，而现有夹具使用 `http://localhost:5173`，所以注册被正确拒绝为 403。仅调整独立测试进程的允许来源后重跑全部通过；未放宽三套运行服务的 CORS，也没有修改产品代码来迎合测试。

脱敏结果和本机截图位于 `.codex-tmp/session-recheck-20261113/`：`runtime.json`、`direct-results.json`、`browser-results.json`、`integration.log`。同目录 `integration.env` 是私有运行配置，不可上传。原始 T1 CSV/缺陷历史没有被覆盖，也没有代替 T1 签收。

结论：当前本机三套环境未复现上述鉴权绕过。T1 历史评论只有“改 token 刷新仍能进页面”，不足以断定他用了错误环境，也不足以证明服务器接受了坏凭证；需要他的实际 API 地址、运行容器版本及脱敏请求响应才能区分。**同版本环境的功能应相同，账号、数据和已执行过的测试状态可以不同。** 以下旧分支与预览地址保留为历史说明，不作为当前启动入口。

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
