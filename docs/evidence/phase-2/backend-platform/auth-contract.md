# BP2-01 认证与资料接口契约

Owner：M5（胡可铭）｜2026-10-08｜版本：M5-P2-v1｜状态：个人设计交付，待联合评审及 M6 合入 canonical OpenAPI。

依据：[Issue #21](https://github.com/Huang0283/CampusLoop/issues/21)。本文件是 Phase 2 契约，不是已运行的认证服务；Phase 3 才实现业务接口。字段映射见 [OpenAPI 输入](auth-openapi-input.md)，生命周期见 [安全设计](auth-security-design.md)，差异和接收状态见 [联合走查](contract-signoff.md)。

## 1. 通用规则

- 路径沿用现有 OpenAPI，无额外 `/api` 前缀。请求和响应均为 JSON；`204` 无响应体。受保护操作使用 `Authorization: Bearer <accessToken>`。
- 成功结构是 `{code: 0, message: "ok", data: ...}`；错误结构是 `{code: string, message: string, details: object|null, requestId: string}`，不能把业务错误塞进 HTTP 200。错误只返回安全字段名，不回显输入值。
- 用户 ID 沿用 `integer/int64`，当前 JS 消费范围限定为正安全整数（1～9007199254740991）；未来超界须统一迁移为字符串，不能静默舍入。
- 未知 JSON 字段拒绝整次请求：`422 VALIDATION_ERROR`。客户端提交 `role/status/userId/id/email` 等禁止修改字段同样返回 422；资源/角色越权才返回 403。资料路径只有 `/users/me` 可写，无修改他人资料的通用入口。
- 邮箱先去除首尾空白，再以 ASCII 小写形式存储、查询和唯一比较；邮箱最长 255 字符。注册仅接受配置中明确列出的教学邮箱域，开发/测试可配置 `example.invalid`；域名匹配仅代表教学模拟，不证明真实学籍或邮箱所有权。
- 密码注册长度 8～128 个 Unicode 码点，不裁剪、不规范化、不静默截断；登录长度 1～128（兼容现有记录）。昵称去首尾空白后 1～40 字符。未提供必填字段、类型/格式错误、空对象 PATCH 或额外字段均为 422。
- 认证响应及本人资料设置 `Cache-Control: no-store`；`401` 附 `WWW-Authenticate: Bearer`。限流返回 `429` 和以秒计的 `Retry-After`。数据库无法确认身份或提交写入时为 `503 AUTH_SERVICE_UNAVAILABLE`，不能降级成成功。
- 公开用户及四个市场/求购 GET 不要求 token；公开路由不因全局鉴权拦截游客。公开路由忽略附带的无效 token，始终只输出公开字段。

## 2. 接口清单与前置条件

所有操作还可能返回校验错 `422 VALIDATION_ERROR`、限流 `429 RATE_LIMITED`、依赖故障 `503 AUTH_SERVICE_UNAVAILABLE`。有 JSON body 的操作还可能返回 `400 INVALID_JSON`（无法解析 JSON）、`415 UNSUPPORTED_MEDIA_TYPE`（非 JSON）；带不受信 Origin 的认证请求返回 `403 FORBIDDEN`。下表列出业务结果。

| 方法与路径 | operationId | 权限/前置状态 | 请求 | 成功 | 业务失败 |
|---|---|---|---|---|---|
| POST /auth/register | register | 匿名；邮箱合规且未占用 | email、password、nickname | 201 AuthResponse | 409 EMAIL_ALREADY_REGISTERED |
| POST /auth/login | login | 匿名；正确凭据且 ACTIVE | email、password | 200 AuthResponse | 401 AUTH_INVALID_CREDENTIALS；423 ACCOUNT_DISABLED |
| POST /auth/refresh | refreshSession | 无 access token 要求；有效且未消费的 refresh token、ACTIVE 账号 | refreshToken | 200 TokenResponse | 401 AUTH_UNAUTHORIZED；423 ACCOUNT_DISABLED |
| POST /auth/logout | logout | 有签名有效且未过期的 access token；定位 token 的 sid | 无请求体 | 204，无内容 | 401 AUTH_UNAUTHORIZED |
| GET /users/me | getCurrentUser | 有效 access token、有效会话、ACTIVE | 无 | 200 UserResponse | 401 AUTH_UNAUTHORIZED；423 ACCOUNT_DISABLED |
| PATCH /users/me | updateCurrentUser | 同上，仅本人 | 至少一个资料白名单字段 | 200 UserResponse | 401 AUTH_UNAUTHORIZED；423 ACCOUNT_DISABLED |
| GET /users/{userId} | getPublicUser | 匿名可读；目标 ACTIVE | 正整数 userId 路径参数 | 200 PublicUserResponse | 404 NOT_FOUND（不存在或禁用，文案相同） |

### 注册：201 后已登录

采用现有 OpenAPI 和 M10 Phase 2 测试矩阵的“一名用户 + 一份会话”，取代 Phase 1 的“注册后单独登录”候选。成功后前端直接接收令牌及本人资料，不再额外登录。账号固定初始化 `USER/ACTIVE`，`campusVerified=false`；模拟标识由另行授权的教学流程设置，注册请求不能自行设为 true。

用户和初始会话必须同一事务提交。规范化邮箱唯一约束防止并发重复注册；只有一个请求得到 201，其余 409。重复注册不等于重复登录。409 确实暴露邮箱已占用这一信息，教学 MVP 接受此折中，以限流和最小响应控制枚举，不能宣传成完全抗枚举。

请求示例（仅虚构数据；测试域需显式配置）：

```json
{"email":"student-a@example.invalid","password":"Example-only-2026!","nickname":"测试同学甲"}
```

201 响应示例，令牌字符串为不可用占位样例：

```json
{"code":0,"message":"ok","data":{"accessToken":"EXAMPLE_ACCESS_NOT_A_CREDENTIAL","refreshToken":"EXAMPLE_REFRESH_NOT_A_CREDENTIAL","expiresIn":900,"user":{"id":1001,"nickname":"测试同学甲","avatar":null,"rating":0,"transactionCount":0,"role":"USER","status":"ACTIVE","email":"student-a@example.invalid","campusVerified":false,"bio":null,"school":null,"college":null,"major":null,"tradeCount":0,"creditLevel":null}}}
```

### 登录：先验证凭据，再检查状态

未知邮箱与错误密码统一 401，不返回账号存在性、角色或禁用状态；未知账号也执行同级虚拟密码哈希验证以减少时序差异。正确密码但账号禁用才返回 423。登录每次创建独立设备会话，不复用其他设备的令牌。

```json
{"email":"student-a@example.invalid","password":"Example-only-2026!"}
```

200 响应结构与上方 201 完全相同，但签发新的令牌和会话；不能复用示例字符串。事务未提交不得对外返回可用令牌。

### 刷新：轮换且不延长绝对会话期限

```json
{"refreshToken":"EXAMPLE_REFRESH_NOT_A_CREDENTIAL"}
```

```json
{"code":0,"message":"ok","data":{"accessToken":"EXAMPLE_NEXT_ACCESS_NOT_A_CREDENTIAL","refreshToken":"EXAMPLE_NEXT_REFRESH_NOT_A_CREDENTIAL","expiresIn":900}}
```

refreshToken 必须是非空字符串，最大 512 字符。`expiresIn` 是新 access token 的实际剩余秒数，最多 900；临近七天绝对期限时缩短。原 refresh token 原子消费，新令牌仅在提交后返回。无效、未知、过期、已撤销、已消费的 refresh token 统一 401；已经消费的有效历史 token 再出现时还要撤销整条会话链，详见安全设计。没有“同一旧 token 重试得到同一个新 token”的保证。

### 退出：撤销当前会话链

`POST /auth/logout` 只携带 Bearer access token，**不接受 refreshToken 或 userId 请求体**。撤销 token 中 sid 对应的全部代际；不退出其他设备。重复调用：同一签名有效、未过期 token 对已经撤销的本人会话再次退出仍为 204，且不重复产生撤销审计。为此退出有专用验证流程，不能直接套用要求“会话尚未撤销”的业务依赖。账号已禁用时仍允许此清理操作。

无 token、签名错误、token 过期或无法绑定 sid/sub 时返回 401。数据库提交不确定则 503；客户端清除本地身份，但必须提示“服务端退出未确认”，不能宣称全部设备或远端已撤销。禁止自动刷新再退出或在网络超时后无限重试。

### 本人读取与资料修改

GET 返回上方 `user` 对象作为 `data`（UserResponse），没有任何令牌字段。PATCH 为部分更新：省略字段保持原值，nullable 字段 `null` 表示清空。学院、专业、学校是可选私有自填资料，不能当作校园认证。最后成功提交的同一字段值胜出；不同字段使用按键更新，不能覆盖整份旧快照。

| PATCH 字段 | 规则 | 可空 |
|---|---|---|
| nickname | 去首尾空白后 1～40 字符 | 否 |
| avatar | 最长 512，受信任公共图片存储的 HTTPS URI；开发环境明确放行本地对象存储地址 | 是 |
| bio | 最长 500 字符；纯文本输出 | 是 |
| school、college、major | 各最长 80 字符；去首尾空白，空字符串规范化为 null | 是 |

服务端不抓取任意头像 URL；不接受私有证据链接、`data:`、`javascript:` 或携带凭据的 URL。昵称/简介按文本显示，不支持 HTML。

```json
{"nickname":"测试同学甲改名","bio":"仅用于契约演示","school":"模拟大学","college":null,"major":null}
```

```json
{"code":0,"message":"ok","data":{"id":1001,"nickname":"测试同学甲改名","avatar":null,"rating":0,"transactionCount":0,"role":"USER","status":"ACTIVE","email":"student-a@example.invalid","campusVerified":false,"bio":"仅用于契约演示","school":"模拟大学","college":null,"major":null,"tradeCount":0,"creditLevel":null}}
```

所有字段先完整校验，再原子保存；出现一个禁止字段则全部不写。重复相同 PATCH 是无变化成功，不重复生成业务事件或资料变更审计；请求访问日志仍可记录。用户行与会话授权锁的顺序见安全设计，防止禁用和资料写入交错越权。

### 公开资料：始终按公开白名单输出

请求 `GET /users/1001`，无认证要求。即使本人或管理员请求此路径，也不扩大字段集：

```json
{"code":0,"message":"ok","data":{"id":1001,"nickname":"测试同学甲","avatar":null,"rating":0,"transactionCount":0}}
```

公开字段仅 `id/nickname/avatar/rating/transactionCount`。`rating=0` 配合零交易/无有效评价时表示暂无评分，不是零星差评或满分；有效评价计算由 M6 负责。学校/学院/专业、简介和模拟认证标识此次只进入本人响应，未来公开须新增明确同意机制并重新评审。

## 3. 错误样例与恢复

下表是 HTTP 状态与稳定业务码的唯一对应；客户端按 code 处理，不解析 message。JSON 均为失败契约样例，不是已执行日志。

| HTTP | code | 触发与恢复 |
|---|---|---|
| 400 | INVALID_JSON | JSON 语法损坏；修复请求，不自动重试 |
| 401 | AUTH_INVALID_CREDENTIALS | 登录未知邮箱/错密码；留在登录页 |
| 401 | AUTH_UNAUTHORIZED | 受保护请求无效身份；刷新失败则重新登录 |
| 403 | FORBIDDEN | 有效 USER 访问管理员或他人私有资源；不刷新、不自动重试 |
| 404 | NOT_FOUND | 用户不存在/不可公开；不区分禁用原因 |
| 409 | EMAIL_ALREADY_REGISTERED | 注册邮箱已占用；引导登录 |
| 415 | UNSUPPORTED_MEDIA_TYPE | 写请求不是 application/json；修复 Content-Type |
| 422 | VALIDATION_ERROR | 字段/格式错误；只显示安全字段名 |
| 423 | ACCOUNT_DISABLED | 已证实身份的禁用账号；清理身份和私有缓存，停止刷新 |
| 429 | RATE_LIMITED | 按 Retry-After 等待，不能循环刷新 |
| 503 | AUTH_SERVICE_UNAVAILABLE | 数据库/必要依赖无法验证或提交；提示未完成 |

凭据错误（401）：

```json
{"code":"AUTH_INVALID_CREDENTIALS","message":"邮箱或密码错误","details":null,"requestId":"req_example_login"}
```

过期或撤销（401）：

```json
{"code":"AUTH_UNAUTHORIZED","message":"请重新认证","details":null,"requestId":"req_example_expired"}
```

角色越权（403，例如有效 USER 访问 `/admin/users`，业务路径由 M6 维护）：

```json
{"code":"FORBIDDEN","message":"无权执行此操作","details":null,"requestId":"req_example_forbidden"}
```

不存在/隐藏用户（404）：

```json
{"code":"NOT_FOUND","message":"用户不存在或不可用","details":null,"requestId":"req_example_missing"}
```

重复注册（409）：

```json
{"code":"EMAIL_ALREADY_REGISTERED","message":"该邮箱已注册，请登录","details":null,"requestId":"req_example_duplicate"}
```

校验或字段越权（422，例如 PATCH 夹带 role）：

```json
{"code":"VALIDATION_ERROR","message":"请求字段不合法","details":{"fields":[{"field":"role","reason":"not_allowed"}]},"requestId":"req_example_field"}
```

禁用（423）：

```json
{"code":"ACCOUNT_DISABLED","message":"账号已禁用，请联系管理员","details":null,"requestId":"req_example_disabled"}
```

限流（429，另附 `Retry-After: 60`）：

```json
{"code":"RATE_LIMITED","message":"请求过于频繁，请稍后重试","details":null,"requestId":"req_example_limit"}
```

服务故障（503）：

```json
{"code":"AUTH_SERVICE_UNAVAILABLE","message":"服务暂不可用，操作未确认完成","details":null,"requestId":"req_example_dependency"}
```

身份失败优先级：先验证签名/格式/时间和主体绑定，失败 401；身份可确定后若用户 DISABLED，优先 423；再检查会话撤销/消费，失败 401；随后检查资源权限，失败 403/404。若刷新记录已被清理而无法定位身份，返回 401 而非猜测禁用。登录必须先校验密码；退出使用上方专用规则。

## 4. 前端消费约束

M2 在一个页面运行期只保留一份内存 token pair；不得照搬 `prototype-token`、localStorage 中的 role/userId 作为权限依据。多个并发请求触发 401 时合并为一次刷新，每个原请求至多重放一次；非幂等写入仅在服务端明确 401、未产生副作用时重试，网络超时不得自动重放。

刷新响应丢失时不重放旧 refresh token；清理身份并重新登录。403/423/429/503 不触发刷新循环。刷新/重新打开页面后内存凭据丢失，需要重新登录；数据库里的资料仍保留。此教学 MVP 不承诺跨页面重载的免登录，若必须保留该体验，需 M2/M5/M6/M9 另行评审 HttpOnly Cookie + CSRF 方案并一起修改契约，不能悄悄持久化令牌。

登录后回跳只接受应用内相对路径，保留 query/hash；拒绝协议 URL、`//host`、反斜杠和控制字符形式的外部跳转。游客可继续看市场和求购；收藏、发布、联系、举报等操作要求真实认证。
