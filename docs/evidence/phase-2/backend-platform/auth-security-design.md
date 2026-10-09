# BP2-02 令牌、密码、撤销与字段安全设计

Owner：M5｜2026-10-08｜M5-P2-v1｜设计输入已定稿待评审；不声明真实认证已实现或安全测试通过。

接口及样例见 [auth-contract.md](auth-contract.md)，M6 接口映射见 [auth-openapi-input.md](auth-openapi-input.md)。本设计把 Phase 1 候选收敛为明确规则，跨所有权变更由 [联合走查](contract-signoff.md) 的 Owner 接收。

## 1. 密码与账号

- 使用 Argon2id，最低参数 `memory_cost=19456 KiB`、`time_cost=2`、`parallelism=1`，每个密码独立 CSPRNG 16-byte salt，32-byte 输出；保存带算法/参数/salt 的 PHC 字符串。使用维护中的库进行验证和参数升级，不自行实现密码算法。
- 注册密码 8～128 个 Unicode 码点，完整 UTF-8 输入，无截断、trim 或 Unicode 改写。禁止把密码、密码摘要写入响应、请求日志、异常或审计。
- 未知邮箱执行同参数虚拟哈希校验；错误密码/未知账号同为 AUTH_INVALID_CREDENTIALS。登录成功且参数旧时升级哈希；哈希升级失败不得伪报持久化成功。
- 现有 `backend/scripts/seed.py` 使用固定盐教学 scrypt，不可作为真实认证安全基线。M9 在 Phase 3 认证联调前改种子为同一 Argon2id 库和随机盐；测试重跑不得重写现有种子密码。旧教学库用受控重建种子恢复，不提供弱哈希静默兼容。
- 真实角色和状态只查服务端。`prototype-token`、前端 role/userId、教学身份选择器都不能通过真实认证。注册不能设置 ADMIN 或 campusVerified。校园验证为教学模拟，默认 false，无真实验证/找回密码功能承诺。

## 2. 令牌选择与生命周期

| 项 | 本期设计值 |
|---|---|
| Access token | JWT，HS256 固定算法允许列表，密钥至少 32 随机字节；拒绝 none、算法替换、不识别 kid |
| 必校验 claims | iss=campusloop-api；aud=campusloop-web；sub=用户 ID 字符串；sid=会话家族 UUID；jti=随机唯一 ID；iat、exp 为 UTC 秒 |
| Access TTL | 最多 900 秒；exp 不超过会话绝对截止；按服务端时间 `now >= exp` 即过期，不额外延长窗口 |
| Refresh token | 32 随机字节以上的 opaque CSPRNG 凭据，base64url 编码；不使用可预测 userId/时间戳 |
| Refresh TTL | 每次登录/注册建立一条绝对 7 天（604800 秒）会话链；轮换不续长七天期限 |
| 刷新存储 | 仅 SHA-256 摘要；高熵随机 token 适用快速摘要，与人类密码的 Argon2id 区分 |
| JWT 授权 | 签名只证明 token 来源；每次受保护请求还要读取 PostgreSQL 用户状态、会话家族撤销和期限 |
| 传输 | HTTPS；access 仅 Authorization header；refresh 仅 /auth/refresh JSON；无 token URL、查询参数、通知、日志 |
| 浏览器存储 | 两类 token 仅 JS 内存；禁用 localStorage/sessionStorage/IndexedDB 持久化、Service Worker 缓存及遥测采集 |

选择 JSON token pair 是为了兼容当前 SDK。与 HttpOnly Cookie 相比，内存 token 避免持久化且无自动附带 cookie 的 CSRF 路径，但活跃 XSS 仍能读取 token；因此前端必须文本安全输出、限制脚本来源并避免任意 HTML。代价是页面重载需重新登录。若改 HttpOnly Cookie，必须同时确定 Secure、SameSite、Path、Origin 和 CSRF 防护，整体评审后才能替换，不能两套 refresh 来源并存。

密钥由环境/密钥管理提供，不进入仓库；启动缺少有效签名密钥则认证服务不可就绪，不能使用演示默认值。轮换使用配置 kid 和允许的旧验证密钥，旧密钥保留最长一个 access TTL 后删除；refresh 依赖数据库，不依赖 JWT 签名密钥续命。

## 3. SEC-DB-01：给 M9 的必要持久化需求

现有 [User/RefreshSession](../../../../backend/app/models/user.py) 只有 token_hash、expires_at、revoked_at，无法区分轮换消费、正常退出和重放，也不能稳定撤销整条后继链。唯一摘要索引不等于单次消费保障。

建议由 M9 增加父会话表（名称由 M9 落盘，语义不变）：

| 记录 | 必须保存的事实与约束 |
|---|---|
| auth_session_families | UUID id（JWT sid）、user_id FK、created_at、绝对 expires_at、revoked_at、revocation_reason；按 user_id/revoked_at 查询；refresh_window_started_at、refresh_window_count 保存刷新限流计数 |
| refresh_sessions 扩展 | family_id 非空 FK；consumed_at 可空；parent_id 可空自引用且唯一；保留唯一 token_hash、expires_at、revoked_at |
| 一致性 | 每条 family 任意时刻最多一条未消费未撤销 token；后继 expiry 等于 family expiry；子记录 user_id 必须与 family 一致（复合外键或等价数据库约束） |
| 历史迁移 | 既有教学会话一律撤销，不猜测历史 family 或继续认可无 sid 的旧 token；新登录创建完整链 |
| 保留 | 已消费 token 摘要及链保留到 family expires_at，支持识别重放；过期后 24 小时内批量清理；最小脱敏认证审计保留 30 天后清理 |

所有时间使用带时区 UTC。单有效后继建议通过 `UNIQUE(family_id) WHERE consumed_at IS NULL AND revoked_at IS NULL` 的部分唯一索引保障，不在索引谓词中使用随时间变化的 now()。每次刷新在 family 锁内更新 60 秒固定窗口计数，30 次后限流；重放检查优先于限流，不能用 429 跳过撤销。M9 可以提出等价设计，但需证明同样的并发、单后继和链撤销不变量。此依赖在 Phase 2 schema 冻结前完成确认，Phase 3 真实刷新验收前必须迁移落地。

SEC-DB-02：User 新增 `school/college/major` 三个 nullable、最长 80 的自填私有字段；不增加第二个交易次数字段。规范化邮箱唯一性必须覆盖注册及种子，现有数据规范化可能撞键时先报告冲突，不能覆盖账号。M9 维护迁移、索引、约束和种子，M5 仅提供需求。

## 4. 刷新原子性与重放

统一锁序：用户行 → family 行 → token 行。刷新、禁用、退出和受保护写入不得各用相反顺序；多个 family 按稳定 ID 顺序处理。

1. 计算请求 token 的摘要，找到候选行以定位用户/家族；事务内重新锁定用户、family 和 token 并重新验证绑定、状态、到期、消费及撤销，不信任锁外查询结果。
2. 用户禁用：423，不能签发；family/token 过期或正常撤销：401。未知摘要不触发任何其他用户撤销。
3. 若仍在有效期限的历史 token 已 consumed，作为重放处理：同一事务撤销 family 全部代际，写脱敏安全事件，**提交撤销后**返回 401。不能抛异常导致事务连同撤销一起回滚。
4. 正常轮换：条件更新旧行 `consumed_at`，插入唯一后继摘要，创建 access JWT；事务成功后返回新 pair。若提交失败则不返回 pair，不留半消费状态。
5. 两次并发刷新：第一个最多拿到一次 200；第二个拿到锁后识别重放并返回 401，撤销整个 family，包括第一响应里的新凭据。前端应合并刷新请求；该策略宁愿要求重新登录，也不设置可被滥用的重放宽限期。
6. 若第一响应丢失，客户端不能安全恢复新 refresh token；重新登录。不同浏览器标签页各有独立登录 family，不共享或复制内存 refresh token。

旧 access token 在成功轮换后可用至其 exp，前提是同一 family 仍有效；检测重放/退出/禁用后则立即失效。不使用“旋转后旧 refresh 行 revoked 就等同整个登录失效”的错误实现。

## 5. 退出、禁用与并发授权

- 普通退出只撤销当前 sid 的 family 及 token 代际；其他设备 family 保持有效。退出重放特殊校验见认证契约；不能接受客户端指定的目标 userId/familyId。
- 管理禁用：权限、具体事项及利益冲突检查通过后，在同一数据库事务中更新 DISABLED、撤销该用户全部 family 并记录脱敏审计。审计或撤销失败则全部回滚，不对外称禁用成功。恢复 ACTIVE 不恢复旧 family，必须重新登录。
- 受保护写入先锁用户和 family、重新验权，再进行业务写入并持锁到提交。若禁用先提交，后续写入拒绝；若合法写入先持锁提交，禁用等待后再完成。M6 把该授权锁序接入业务事务，防止先鉴权后长时间延迟提交。
- 已在禁用前授权并送出的 HTTP 响应不可收回；保证禁用事务提交后开始的受保护动作被拒绝。公开市场仍是公开，禁用不会把公开数据变成私密，也不自动改变历史订单事实。
- Redis 不保存唯一撤销事实，不缓存可绕过数据库的“账号正常”授权结果。受保护 HTTP 每次从 PostgreSQL 验证；Redis 失联仍可回源，DB 也失联则 503 并拒绝授权。Redis 通知失败不得恢复会话。

## 6. WebSocket、来源校验与限流

- WS 业务协议由 M6 维护。M5 要求浏览器握手检查 Origin，只允许受信前端来源；连接建立后先完成认证帧，再允许订阅和私有数据收发。认证帧使用短期 access token，不使用 URL token 或 refresh token。
- 5 秒内未认证关闭；401 类使用应用关闭码 4401，禁用 4423，依赖故障 1013；刷新后重新建立并鉴权，不在旧连接直接信任新身份字段。
- 每次私有入站动作和出站投递前检查同一数据库用户/family 状态；无业务流量时最多 30 秒周期复核，过期/撤销时关闭。失效通知用于加速，不能替代检查；数据库不可用时停止投递并关闭。
- CORS 只允许配置的确切源，本期不使用 cookie 认证且 `allow_credentials=false`。JSON POST/PATCH 拒绝非 JSON 类型（415），带 Origin 的认证请求拒绝非允许源（403），本机非浏览器客户端可无 Origin。CORS 不是授权校验；每条受保护路径仍验 token。
- 初始分布式限流输入：登录每规范化账号最多 5 次失败/15 分钟 + 每 IP 30 次尝试/15 分钟；注册每 IP 10 次/小时；刷新每 family 30 次/分钟。用户名维度使用键控摘要，避免缓存/日志散落邮箱。未知账号与已知账号应用相同规则。可信代理配置固定后才读取 forwarded IP。
- Redis 限流失联时：登录/注册返回 503（避免无限尝试）；刷新依据 PostgreSQL family 记录的限流窗口/计数执行等价限制，需 M9 增加持久化字段或等价原子计数方案；无法计数则 503。已有效会话的正常受保护业务及退出仍可 DB 回源。不得将每进程内存限流冒充多副本全局控制。

## 7. 序列化与审计

公开五字段、本人资料字段严格采用 [OpenAPI 输入](auth-openapi-input.md) 白名单，嵌套卖家/用户卡同样限制。原始 ORM、邮箱、role/status、学校/学院/专业、风险信息不能通过公开卡片泄露。密码/hash、token_hash、签名密钥永不输出；access/refresh 明文仅专用签发通道例外。

管理员角色不授予全库聊天或举报证据读取权。必须检查具体事项、最小资源范围及审计，失败拒绝；不在这批认证接口新增证据读取、全会话管理或日程收集能力。私有证据短期链接另由 M5/M9 在治理契约确认，不能声称已签发链接能瞬间撤销。

日志只记录 requestId、事件名、结果、脱敏主体标识与必要时间，不记录 Authorization/Cookie/body、原邮箱/IP、完整 sid/token 摘要、密码、SQL 参数、私聊和证据正文。验证异常转换为安全字段名列表；禁止默认 validation error 的 input 原样序列化。审计存储和保留由 M9 落地，管理员状态变更审计必须事务化。

## 8. M10 可执行测试输入（待 Phase 3 实现运行）

准备虚构 A/B 普通用户、D 管理员、X 禁用用户，A 有两个独立 family；测试使用受控时间，不依赖实际等待七天。A01～A18 是预期，不是通过记录。

| ID / Phase 1 风险 | 操作 | HTTP/状态及持久化断言 |
|---|---|---|
| A01 / HR-08 | 同一规范化邮箱并发注册 | 一个 201、其余 409；一名 USER/ACTIVE、一个 family；失败无孤立记录 |
| A02 / HR-01 | 不存在邮箱、错误密码分别登录 | 相同 401 AUTH_INVALID_CREDENTIALS；无会话；无值回显 |
| A03 / HR-06 | 注册/PATCH 夹带 role、status、campusVerified | 422；整次不写入，合法字段也不改变 |
| A04 / HR-02 | access 到 exp 后读 /users/me，再刷新 | 401；有效 refresh 得 200；重放原 GET 一次成功 |
| A05 / HR-07 | 同一 refresh 同时提交两次 | 最多一个 200；另一个 401 并撤销 family；所有代际后续均 401 |
| A06 / HR-07 | refresh 提交成功后丢弃响应，再重放旧 token | 401 且撤销 family；只能重新登录 |
| A07 / HR-03 | A 退出第一个 family，再用旧 access/refresh；第二个 family 读资料 | 204 后第一条 401；重复有效 access 退出 204；第二条 200 |
| A08 / HR-04 | 禁用 X；旧 HTTP、刷新、WS 继续收发 | 可定位有效身份 423/4423；无私有投递；恢复后旧 family 仍无效 |
| A09 / HR-05 | A 读 B 公开资料，尝试写 B 私有资料/管理接口 | 公开五字段；无他人 PATCH 路由（405/404）；管理 403；B 不变 |
| A10 / HR-10 | 检查所有成功、错误、嵌套公开卡及日志 | 公开无邮箱/角色/证据；凭据只在专用签发响应；无密码/hash/输入回显 |
| A11 / HR-14 | Redis 断开，并保留旧缓存，再访问已撤销会话；随后 DB 断开 | DB 回源拒绝旧身份；DB 不可用 503；无缓存授权旁路 |
| A12 / HR-16 | 禁用时审计写入失败；轮换插入失败；退出提交失败 | 对应事务回滚，无部分状态；503，不返回可用新 pair 或虚假退出成功 |
| A13 / HR-04 | PATCH 和禁用分别先拿到用户锁，交错提交 | 先写成功则禁用后完成；先禁用则 PATCH 拒绝；无禁用后新增授权写入 |
| A14 / HR-18 | 匿名四个市场/求购 GET；再收藏/联系 | 公共成功/422/404；受保护操作 401；回跳拒绝外站 |
| A15 / HR-09 | 管理员无事项授权访问私聊/证据 | 403/404；无证据链接/正文，不能凭 ADMIN 绕过 |
| A16 / HR-02 | 七天截止前轮换；截止后再刷新 | 不延长绝对到期；access TTL 缩短；截止后 401，重新登录才能新建 |
| A17 / HR-10 | PATCH nullable 清空、遗漏字段、同值重复；公开 GET | 省略保留/null 清空/重复无额外业务事件；学校等不公开 |
| A18 / HR-01 | 跨副本登录撞限流；不受信 Origin；页面重载 | 429 + Retry-After；不受信 Origin 403；内存凭据清空且资料持久化 |

补充测试：JSON 解析失败 400；非 JSON 写请求 415；nickname/密码长度边界；邮箱大小写/空白撞唯一约束；未知 JWT kid/算法/iss/aud；WS 无鉴权五秒超时及无流量撤销三十秒复核。测试记录必须包含实际提交、环境、命令、结果和脱敏日志路径。
