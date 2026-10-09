# AI2-04 搜索与匹配服务契约

版本：m7-service-candidate-v1；日期：2026-09-28；Owner：M7。状态：可执行的候选契约，等待 M3/M6/M9 签字；不是已冻结 OpenAPI，也不是运行中的 HTTP 服务。

## 1. 输入依据与本轮范围

依据用户提供的《CampusLoop_M7_技术与任务进度文档》第 10 节、AI-P2 任务书 AI2-04/05、M7 Phase 1 关键词/匹配规则及前三项数据交付。最新上游提交与差异详见 [contract-handoff.md](contract-handoff.md)。

本契约负责商品搜索 `/search` 和本人求购的商品推荐 `/wanted/{wantedId}/matches`。求购市场 `/wanted` 的关键词、预算、成色、排序和分页是 M3/M6 业务列表契约；不把其客户端筛选当作 M7 搜索已覆盖。空查询浏览仍走 `/products`；`/search` 空白查询返回 422。

使用现有路由及 `{code,message,data}` 成功结构、字符串 code 的错误结构。新增字段及不兼容项需要 M6 更新唯一 OpenAPI，再生成 SDK、由 M3 接入；本目录的 JSON Schema 仅供候选契约校验，不能作为第二份线上 API 源。

## 2. 机器可读文件与 HTTP 映射

- [contracts.schema.json](../../../../schemas/m7-phase2/contracts.schema.json)：Draft 2020-12；`$defs.SearchRequest/MatchRequest/SearchSuccess/MatchSuccess/Error/Pending`。
- [examples.json](../../../../contracts/m7-phase2/examples.json)：样例索引；每个 Exchange 包含 operation、已解码请求、HTTP 状态、响应。它是测试容器，不是 HTTP body。
- [development-policy.json](../../../../contracts/m7-phase2/development-policy.json)：开发候选超时/租约配置；未经压测和团队批准。
- [contract_check.py](../../../../scripts/m7_phase2/contract_check.py)：结构校验加跨字段检查；不代替鉴权、召回、评分或数据库测试。

服务统一输出 UTF-8 JSON。查询参数出现重复标量、未知参数、非法枚举或无法解析的类型时整体 422，不静默忽略。样例已展开默认值；HTTP 适配器负责解码和填默认。数组 `placeIds` 使用重复参数 `placeIds=library&placeIds=gate`，禁止与逗号拼接格式混用。

| 路由 | 输入与默认 | 身份/范围 |
| --- | --- | --- |
| GET /search | query 必填，NFKC 后非空，1—200 字符；mode=keyword；page=1；pageSize=20（1—100）；sort=relevance | 允许匿名，只返回服务端允许公开且在售的商品；有效登录也不能扩大到私有商品 |
| GET /wanted/{wantedId}/matches | wantedId 正整数；page=1；pageSize=20；后续页带 snapshotVersion；不接受自行传入 ownerId、预算或 mode | 有效身份且为求购本人；后端读取权威求购条件，不能用浏览器参数代替 |

搜索候选新增可选筛选：category 精确类别 ID、minPriceFen/maxPriceFen 非负整数分、minConditionRank 1—5、placeIds 字典 ID 集合、sort=relevance/newest/price_asc/price_desc。不从文本自动生成硬筛选。未传的约束不施加；0 有效，上下限含等值，min>max 整体拒绝。字典必须由 M6/M3 批准后提供，当前样例字典只是合成数据字典。

ID 暂沿用 SDK 的 number，但本候选限定 1—2^53−1 防止 JavaScript 精度丢失。数据库大整数超出此范围时，须统一升级字符串 ID 契约和 SDK；不得截断。价格响应沿用 Product.price 的“元”，最多两位小数；过滤与运算统一精确转换为整数“分”，禁止二进制浮点直接比较预算。

## 3. 排序、分页和一致性

先做权限、商品状态、可见性和显式硬筛选，再执行关键词/规则评分。匹配硬约束沿用 Phase 1：求购 OPEN 且未到期、商品可公开交易、非本人、分类、预算、最低成色、必须地点/规格。任何已知失败优先于信息不足；无法证明满足硬约束的商品不进入结果，也不发通知。关键数据批量缺失/规则依赖失败返回 503，不伪装正常空结果；个别坏记录隔离并在内部诊断，不公开泄露无权访问商品 ID 或数量。

关键词算法按已记录 NFKC、拉丁小写、空白清理、中文二元词项和 4/2/2/1 字段权重。匹配默认启用文本因素；未冻结的软偏好字段拒绝传入。权重、分词、字典、模型或回退政策变化均升级对应版本和 policyGeneration。

稳定次序：relevance 按未舍入相关分降序、createdAt 降序、数值 ID 升序；newest 按 createdAt 降序、ID 升序；价格顺序后以 createdAt 降序、ID 升序打破平分。无评分因素的匹配按 createdAt 降序、ID 升序，scoreType=constraints_only。先形成完整有序结果，再分页。

第一页获取服务端不透明 snapshotVersion；后续页必须原样提交，且 query、mode、sort、筛选、授权范围、pageSize 不变。快照绑定规范化输入、目录修订、权限修订、策略与有效期，不把内部权限版本/用户集合公开。total 只计该请求有权看到的完整候选数；最后一页可不足 pageSize，页码超出范围为合法空页。

读取时复核当前状态。任何影响本结果的商品/求购/权限/策略变化或快照到期，返回 409 SNAPSHOT_STALE，页面清空旧页并重新获取第一页。不在同一个 total/token 下静默删除条目或替换新价格。鉴权失败优先于快照提示。该保守候选保证分页可解释，可能增加刷新；M6/M9 需评审快照成本。

## 4. 响应和解释

SearchSuccess.data 保留 items:Product[]、mode、degraded、pagination；新增 requestedMode、explanations 和完整版本字段。explanations 按 items 同序，每项 productId 唯一对应商品、relevanceScore∈[0,1]、reasons:string[]、explanationDetails。

MatchSuccess.data 保留 items、degraded；新增 wantedId/wantedVersion、requestedMethod/method、pagination 和版本字段。每个 MatchItem 保留 product、reasons、constraints、resultVersion、expiresAt；新增 productVersion/wantedVersion、scoreType、explanationDetails，并将 relevanceScore 扩展为 number|null。

| 字段 | 精确定义 |
| --- | --- |
| relevanceScore | 相关程度，不是成交概率；离线 rankScore∈[0,100] 映射为 rankScore/100，禁止把 44.4 直接传入 API |
| scoreType | rule_match_v0 为规则相关分；constraints_only 时 score=null，页面显示“仅条件匹配”，不能执行 null×100；semantic_match 仅预留 |
| reasons / constraints | 安全、可读的说明；不输出内部权限、风险、私聊或联系方式，不用大模型编造理由 |
| explanationDetails | code、kind、field、observed、required、contribution、ruleVersion 全部显式存在；只取允许公开的观测值 |
| factor | TEXT_MATCH；贡献采用 API 的 0—1 单位；各贡献之和与分数误差≤1e−8；显示舍入不参与排序 |
| constraint | BUDGET_MATCH、CONDITION_MATCH、CATEGORY_MATCH、LOCATION_MATCH；contribution=null，硬条件通过不能抬高分数 |

预算解释示例：observed=18000，required={min:10000,max:20000}，明确是分。文字显示“180 元在 100—200 元内”。示例相关程度 4/9，对应离线约 44.4444 分；两种单位不能混用。未施加的条件不写“通过”。没有启用因素时不生成 factor，也不伪造默认满分。

PublicUser 在本搜索/匹配 profile 中只含 id、nickname、可选公开 avatar；不随意扩展现有 UserBrief 的字段。Product 只复制白名单。离线 product.ownerId 仍指商品卖家，wanted.ownerId 指求购发布者；对外仍用 seller.id/owner.id，本次不改名。输出中保留 ON_SALE，但资格判断必须读取 M6 候选“生命周期+展示状态”，不能由单个输出枚举反推资格。

## 5. 版本与时效

成功响应必须包含 schemaVersion、ruleVersion、tokenizerVersion、dictionaryVersion、policyGeneration、snapshotVersion、resultVersion、generatedAt、expiresAt、modelVersion、indexVersion。未使用模型/向量时最后两项为 null；失败模型的版本可在内部诊断记录，不能冒充实际服务版本。

resultVersion 为服务端生成的不透明版本；与同批条目保持一致。匹配持久版本的计算及时间规则见 [matching-task-contract.md](matching-task-contract.md)。generatedAt 是固定输入快照时间，不是每次请求或重试的当前时间；重试执行时间单独记录。expiresAt=min(快照时间+配置 TTL，求购有效期，已知权限/数据有效期)。到期等值即无效。全部时间为带时区 RFC 3339，服务器比较 UTC 时间点，页面才转 Asia/Shanghai 展示。

HTTP 样例的 rs_aaa… 是格式正确的固定占位版本，用于独立响应校验；它们不是实际内容摘要。stored-result.json 的版本由脚本计算并核查。禁止拿格式示例当作生产生成算法的证据。

## 6. 状态、超时和降级

| 情况 | HTTP / code | 响应与页面动作 |
| --- | --- | --- |
| 基线正常、有/无候选 | 200 / 0 | 正常 items 或 []；空结果保留版本、degraded=false、total=0 |
| 请求选择的高级方法失败或未启用，基线成功 | 200 / 0 | 实际 mode=keyword 或 method=rule；degraded=true；保留 requestedMode/requestedMethod |
| 有效求购结果正在更新 | 202 / 0 | data.state=pending，wantedId/version、retryAfterSeconds；无 items，不显示“没有匹配” |
| 参数非法 | 422 / VALIDATION_ERROR | 错误结构，不回显整个查询或敏感输入 |
| 未登录/无效凭据 | 401 / UNAUTHENTICATED | 匹配登录提示；公开搜索若携带无效凭据也不得悄悄变匿名 |
| 已认证但非本人/账号禁止动作 | 403 / FORBIDDEN | 不返回匹配数据；不能靠换关键词模式绕过 |
| 对象不存在或不可见 | 404 / NOT_FOUND | 通用不可用文案；公开可见的他人求购匹配为 403 |
| 输入快照变化/到期 | 409 / SNAPSHOT_STALE | 清除旧页，刷新第一页 |
| 本人的求购关闭/过期 | 409 / WANTED_INACTIVE | 停止轮询，不自动重新开启求购 |
| 权威权限/业务依赖不能核实 | 503 / DEPENDENCY_UNAVAILABLE | 暂不可用，不降级绕过权限 |
| 规则/关键词也失败 | 503 / BASELINE_UNAVAILABLE | 暂不可用；不能返回 200+[] |
| 频率限制 | 429 / RATE_LIMITED | 按 Retry-After 重试 |

降级原因枚举 MODEL_TIMEOUT、MODEL_ERROR、INDEX_NOT_READY、INDEX_VERSION_MISMATCH、MODEL_DISABLED。请求本来就是 keyword/rule 且模型未启用，不是故障，degraded=false。匹配高级方法由服务端已批准政策决定；没有获批时默认 rule。search 请求 semantic/hybrid 但能力未启用时，明确回退 keyword+MODEL_DISABLED，不假装调用模型。

开发候选总预算 1500ms：权限/输入 200ms、高级候选最多 700ms、基线预留 500ms、序列化/复核 100ms；使用一个单调时钟截止时间，不给每个串行步骤重新分配 1500ms。基线请求直接使用剩余预算；高级方法预算耗尽立即取消/忽略晚返回结果，保留相同权限与硬筛选执行基线。基线无法在剩余预算完成则 503。等待队列计入总时长。

这些数值是可评审的开发配置，不是 p95 实测或 AI2-10 上线门槛。M9 需在部署环境验证，再签字确认。202 建议 body 与 Retry-After 头都为 2 秒；429/503 由限流/恢复策略返回合理 Retry-After。错误不含堆栈、SQL、令牌、私有对象地址。

## 7. 兼容改动与冻结门禁

| 现状（前端 182e1de） | 本候选 | 接收人/迁移动作 |
| --- | --- | --- |
| 匹配分数必为数字；页面直接乘 100 | constraints_only 可为 null | M6 修改 OpenAPI，M3 同批处理 null；未改前不得发送新形态给旧页面 |
| 匹配无服务端分页，页面本地每页 5 条 | page/pageSize/token+pagination | M3 切换服务端分页、处理 202/409；不得对单页再当作全部结果 |
| 已有版本/降级字段，但页面未读取 | 必须展示方法、降级文案、有效期；收到失效清除旧卡片 | M3 验证 route wantedId 已修复，不重复提出旧路由缺陷 |
| search 无预算/成色/地点筛选，无逐项解释 | 新增严格参数及同序 explanations | M6/M3 确认字段与字典，不默默忽略现有页面筛选 |
| OpenAPI Wanted 有 MATCHED，缺类别/业务版本；Product 单状态 | M6 最新设计建议分离生命周期/可见性，匹配不关闭求购 | M6/M9 统一源事实与适配，不能由 M7 擅自改枚举 |
| x-campusloop-phase 把接口标 AI2-01/02 | 本次契约为 AI2-04/05，运行实现属 Phase 3/4 | M6 修正追踪标签，生成 SDK 后检查编译 |

采用同批切换：候选签字→M6 更新唯一 OpenAPI→生成 SDK→M3 处理上述差异→M10 集成验收→阶段合并。保留旧版本服务期间不得混发不同 score/pagination 语义。schemaVersion 出现在响应中不能代替兼容协商。

本候选只提供关键词/规则的可执行说明和样例。semantic/hybrid/semantic_match 是预留枚举，模型解释尚须后续版本扩展并满足 AI2-10；本校验器不验证向量相似度来源或高级排序正确性。

AI2-04 正式完成条件仍为：M3 确认展示与兼容迁移，M6 确认 API/业务/鉴权，M9 确认预算/部署；M8 交叉评审及 M10 非作者校验记录。签字表、具体接收动作见 [contract-handoff.md](contract-handoff.md)。
