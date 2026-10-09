# BP2-01 提供给 M6 的认证 OpenAPI 输入

2026-10-09当前浏览器输入已按用户批准的[Phase3 cookie合同](../../phase-3/backend-platform/browser-session-contract.md)更新canonical OpenAPI/生成SDK。本文件JSON refresh与D07重载重登条目为Phase2历史或非浏览器通路，不能用来否定当前刷新恢复验收。

Owner：M5｜2026-10-08｜M5-P2-v1｜待 M6 评审合入，不是第二份 canonical OpenAPI。

源文件：[当前 OpenAPI](../../../../openapi/campusloop.v1.yaml)，读取基线 `c3a49290bf29cd54c1b569ed7a08dbd175891913`。本 PR 不编辑该文件或生成 SDK。全部请求、样例、错误及前置条件以 [认证契约](auth-contract.md) 为准；运行设计见 [安全设计](auth-security-design.md)。

## 1. 保留路径及 schema 名称

| operationId | 路径 | security | requestBody | 2xx schema |
|---|---|---|---|---|
| register | POST /auth/register | [] | RegisterRequest，required | 201 AuthResponse |
| login | POST /auth/login | [] | LoginRequest，required | 200 AuthResponse |
| refreshSession | POST /auth/refresh | [] | 命名为 RefreshRequest，required | 200 TokenResponse |
| logout | POST /auth/logout | bearerAuth | 无 body | 204 无 body |
| getCurrentUser | GET /users/me | bearerAuth | 无 | 200 UserResponse |
| updateCurrentUser | PATCH /users/me | bearerAuth | UpdateProfileRequest，required | 200 UserResponse |
| getPublicUser | GET /users/{userId} | [] | 无 | 200 PublicUserResponse |

注册保留现有 `Registered and authenticated` 语义；认证结果中的 `user` 是私有本人资料。登录没有角色参数。refreshToken 是持有者凭据，刷新不要求额外 access token；任何人持有有效 refresh token 都能使用，因此不能宣称“他人的合法 refresh token 会自动被识别为他人并拒绝”。测试应覆盖伪造 token、失效 token、请求字段身份伪造和凭据保护。

## 2. 请求 schema 修订清单

| schema | 必填/属性 | 校验及差异 |
|---|---|---|
| RegisterRequest | email、password、nickname 必填 | email 最大 255；password 8～128；nickname 1～40；`additionalProperties: false`；不新增 role/status |
| LoginRequest | email、password 必填 | email 最大 255；password 1～128；`additionalProperties: false` |
| RefreshRequest | refreshToken 必填 | 非空 string，最大 512；`additionalProperties: false`；替换现有 inline object |
| UpdateProfileRequest | nickname、avatar、bio、school、college、major 均可选；至少一个 | `minProperties: 1`、`additionalProperties: false`；nickname 1～40 不可 null；avatar URI 最大 512 可 null；bio 最大 500 可 null；school/college/major 各最大 80 可 null |
| UserId | 必填路径参数 integer/int64 | minimum=1；maximum=9007199254740991；字符串、负数、零、越界皆 422 |

去空白、邮箱规范化、域白名单、头像来源白名单属于服务端校验，不能只靠 JSON Schema。保留字段按 422 拒绝整个请求；不接受嵌套 user、ownerId 或权限布尔值。

## 3. 响应 schema 与字段来源

继续使用 ApiEnvelope + data 包装：AuthResponse.data → AuthResult；TokenResponse.data → TokenPair；UserResponse.data → UserProfile；PublicUserResponse.data → UserBrief。

| schema/字段 | 类型/必填 | 序列化来源和可见性 |
|---|---|---|
| UserBrief.id | integer/int64，必填 | users.id；正安全整数；公开 |
| UserBrief.nickname | string，必填 | users.nickname；公开 |
| UserBrief.avatar | string(uri) 或 null，必填 | users.avatar_url；公开；空头像固定 null |
| UserBrief.rating | number 0～5，必填 | users.rating_avg；公开；无有效评价为 0，UI 显示暂无评价 |
| UserBrief.transactionCount | integer >=0，必填 | users.transaction_count；由 M6 事实维护；公开 |
| UserProfile | 以上五字段，加下面本人字段 | 只供认证成功和 /users/me，禁止用在公开卖家卡 |
| role、status | USER/ADMIN；ACTIVE/DISABLED，必填 | 服务端用户状态；正常资料成功只出现 ACTIVE |
| email | string(email)，必填 | 本人规范化登录邮箱，不公开 |
| campusVerified | boolean，必填 | users.campus_email_verified；仅教学模拟，不表示真实认证 |
| bio | string 或 null，必填 | users.bio；本期只对本人返回 |
| school、college、major | string 或 null，必填 | 自填私有资料；现有 User 无这些列，向 M9 提出新增需求 |
| tradeCount | integer >=0，必填 | transactionCount 的兼容别名，必须严格相等，不新增独立数据库事实 |
| creditLevel | string 或 null，必填 | 无 M8 已确认映射时固定 null，页面显示暂无；禁止根据默认 rating=0 编造信用等级 |
| TokenPair.accessToken、refreshToken | string，必填 | 仅专用签发响应中出现；均不进入 UserProfile |
| TokenPair.expiresIn | integer 1～900，必填 | access token 实际 TTL（秒），最多 15 分钟 |
| AuthResult.user | UserProfile，必填 | 私有本人资料，与上方 token pair 同属 data |

UserProfile/UserBrief 应以明确属性集序列化。OpenAPI 3.1 如保留 `allOf`，对最终组合使用 `unevaluatedProperties: false`，不要在基类直接 `additionalProperties: false` 导致派生字段全部被拒绝；实现层仍必须使用显式 DTO，不能直接转储 ORM。

## 4. 状态码、错误码和响应头

- 七个操作补齐 [认证契约](auth-contract.md) 的成功和失败响应及 JSON 示例；login 缺少的 422、refresh 的 422/423、me 的 423、public-user 的 422 都需声明。
- 全部操作声明 429、503；有 JSON body 的操作声明 400/415（INVALID_JSON/UNSUPPORTED_MEDIA_TYPE），带不受信 Origin 的认证请求声明 403 FORBIDDEN。错误复用 ErrorResponse，`details` 明确可 null；认证校验 details 固定为 `fields: [{field, reason}]`，禁止 FastAPI 默认错误的 `input` 回显。
- 401 复用 AUTH_UNAUTHORIZED；login 密码错/未知账号用 AUTH_INVALID_CREDENTIALS。403 使用既有 FORBIDDEN，不改成另一套 AUTH_FORBIDDEN。注册 409 用 EMAIL_ALREADY_REGISTERED，不用泛化 STATE_CONFLICT 让前端猜测。
- 禁用统一 423 ACCOUNT_DISABLED；登录先验密码，受保护路由先验 token 的签名/时间/绑定。/auth/logout 的特殊重复退出规则必须写入 description。
- 认证、本人资料响应 `Cache-Control: no-store`；401 的 `WWW-Authenticate`；429 的 `Retry-After` 需要在 OpenAPI headers 中声明。
- `/products`、`/products/{productId}`、`/wanted`、`/wanted/{wantedId}` 保持 `security: []`；市场写入和管理接口使用有效会话及对象/角色权限，归 M6 实现。

## 5. 与已有消费者的明确差异

| ID | 已有内容 | M5 提交的结论 | 接收动作 |
|---|---|---|---|
| D01 | Phase 1 注册后再登录候选 | 201 同时建立用户和会话，兼容现有 OpenAPI/M10 | M2 删除多余登录跳转；M6 保持成功 schema |
| D02 | 前端走查把 logout 请求写为 refreshToken | 当前 Bearer + sid，body 为空 | M2 调整调用；M6 确认 logout 描述 |
| D03 | 前端缺 nickname；需要 bio/campusVerified/school 等 | 注册必填 nickname；新增本人资料字段与 PATCH 白名单 | M2 接收；M6 更新 schema；M9 新增三个可空资料列 |
| D04 | school 等前端叫公开资料 | 默认只本人可见，公开响应仅五个字段 | M2/M3 修正展示用语及公共卡片 |
| D05 | 数据库无 creditLevel/tradeCount 独立列 | tradeCount 为交易次数别名；creditLevel 未获可信映射时 null | M6/M8 确认，避免伪造信用 |
| D06 | refresh_sessions 没有家族/消费字段 | 需要持久化会话链，见 SEC-DB-01 | M9 单独落库；不得宣称现表已满足抗重放 |
| D07 | 原型 localStorage 重载保持登录 | 本期真实凭据仅内存，重载重新登录；资料持久化 | M2 确认体验；需免登录则联合修改传输方案 |

这些是 M5 的可评审决定，不等于 M2/M6/M9 已签字。最终确认及修改提交登记在 [contract-signoff.md](contract-signoff.md)。

## 6. M6 接入与验收

1. 同步合入 M5 PR 后的 `phase2/backend-foundation`，只由 M6 修改 canonical OpenAPI。
2. 合入上述属性、错误、headers、examples 与 `security` 设置；补齐业务接口的角色/状态/对象权限。
3. 按仓库流程在 canonical 合并后由 M6 执行 `cd frontend`、`npm.cmd run sdk:generate`、`npm.cmd run sdk:check`、`npm.cmd run lint`、`npm.cmd run build`，记录实际提交及输出。M5 本次没有执行生成或声称 SDK 已对齐。
4. M2/M3/M4 验证注册跳转、403/423 区分、本人/公开字段隔离；M10 将安全设计的 A01～A18 纳入实际测试。
