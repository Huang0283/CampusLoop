# AI2-05 匹配任务、结果与通知契约

版本：m7-task-candidate-v1；日期：2026-09-28；Owner：M7。状态：可执行规格候选，尚未实现队列、数据库或真实通知。与 [search-service-contract.md](search-service-contract.md) 共同评审。

## 1. 架构选择和事实归属

本候选选择**同一个业务数据库内的短事务**完成版本检查、当前结果指针和通知 outbox 提交。耗时计算在事务外进行；M6 管业务事实与授权，M7 管计算，M9 管表、事务隔离、调度与恢复。若实际架构必须分库，不能直接套用本原子性结论；先由 M6/M9 提供带条件写入的权威服务协议并另行评审。

第一版采用每条求购的全量重算，不实现局部结果拼接。商品变更会使旧结果失效，并安排相关求购刷新；尚无经过验证的影响范围索引时，扫描全部有效求购，不能只按新分类缩小范围而漏掉旧分类或无分类条件。

catalogRevision 是业务库中提交有序的目录修订，不是 MAX(product.version)、时间戳或 Redis 自增值。候选实现为业务事务锁住单行目录修订并递增后提交，匹配快照读取和结果提交检查同一权威修订；高写入负载下成本由 M9 评审。权限变化同样推进 authorizationRevision；缓存/索引只有辅助作用。

## 2. 触发矩阵

| 权威变化 | 事务/消费者动作 |
| --- | --- |
| 求购发布、有效内容修改 | 求购版本递增+同事务事件；旧结果失效，为该求购全量重算 |
| 求购关闭、到期、删除 | 立即禁止读出有效结果，撤销未发送通知；到期扫描可幂等重跑 |
| 商品上架/重新上架、改价/成色/地点/文本/分类/规格 | 商品版本和 catalogRevision 递增；撤销旧结果资格，扫描受影响有效求购 |
| 商品预约、售出、下架、隐藏、删除 | 立即撤销匹配资格，禁止等模型重算后才失效；通知发送前也重新检查 |
| 订单取消 | 按 M6 最新候选释放为下架；不能擅自当作重新上架推荐 |
| 用户禁用、可见性/授权规则变化 | authorizationRevision 递增，失效相应结果和未发送通知 |
| 算法/字典/分词/阈值或模型开关变化、回滚 | policyGeneration 单调递增，重算；回滚旧模型也使用更大的 generation |
| 结果 TTL 到期/巡检修复 | refreshGeneration 原子递增并确定新 asOf；到期按旧版本读出仍被拒绝 |

M6 求购状态候选为 OPEN/CLOSED/EXPIRED/DELETED，AI 命中不能关闭求购。当前 OpenAPI 的 MATCHED 不直接映射 OPEN；M6 未确认适配前保守拒绝匹配并登记差异，不自动更改业务事实。

## 3. 事件与幂等

[Event schema](../../../../schemas/m7-phase2/contracts.schema.json) 字段：schemaVersion、eventId(UUID)、entityType、entityId、entityVersion、eventType、occurredAt、catalogRevision、authorizationRevision、policyGeneration、refreshGeneration。事件只带必要标识和版本，不包含私聊、邮箱、完整查询、商品正文、令牌。投递 attempt/时间属于另一张投递记录，不更改不可变事件内容。

业务更新与 event_outbox 同事务，事务提交后至少一次投递。消费者 inbox 对 eventId 唯一；相同 ID 不同规范化内容记 EVENT_ID_CONFLICT，隔离告警，不覆盖原事件。不同 eventId 但相同业务输入在任务唯一键处再次去重。

旧事件只作“重新核查”的信号，必须读取当前业务事实。先收到商品 v3 已售、再收到 v2 上架时，不能重放 v2 成为在售。inbox 的“已处理”和后续任务创建须同事务，或保留可恢复的 processing 状态；不能先确认消费、再丢掉尚未入队的任务。

全量任务输入 InputVersion：wantedId、wantedVersion、catalogRevision、authorizationRevision、policyGeneration、refreshGeneration、asOf。所有版本是正整数且单调递增；asOf 是调度器首次为这组修订持久化的 UTC 快照时刻。同业务事件重放必须复用原 asOf，不能每次换成 now 生成新任务。

`taskKey = "task_" + SHA256(canonicalJSON(InputVersion))`。canonicalJSON 使用 UTF-8、键名升序、无空白、无 NaN；InputVersion 仅含安全整数和规范 UTC 字符串。输入中的 UTC 时间一律持久化为 `YYYY-MM-DDTHH:mm:ssZ`。执行程序提供确定性示范，但跨语言服务应直接消费调度器已保存的 key，不能自行改变时间精度再算 key。

业务唯一约束同时覆盖 wantedId+wantedVersion+catalogRevision+authorizationRevision+policyGeneration+refreshGeneration，首次写入 asOf 后不可改；asOf 参与 taskKey 以捕获输入错误，不能用变更 asOf 绕开业务唯一键。刷新必须先递增 refreshGeneration。

## 4. 领取、重试与原子提交

任务状态：pending→running→succeeded；临时故障 running→retry_wait→running；输入变化→superseded；非法输入或重试耗尽→dead。succeeded/superseded/dead 为终态，人工恢复创建带审计的新刷新版本，不覆写旧任务。attempt、lastErrorCode、nextAttemptAt 是执行元数据，不改变 taskKey。

开发候选租约 30 秒、心跳每 10 秒、最多 3 次执行，临时错误间隔 5/30 秒；应附有界抖动避免拥塞，抖动不进入匹配内容摘要。需要持久化 nextAttemptAt；认证失败、坏 schema、事件冲突、过时输入不盲目重试。超过最后尝试进入 dead 和人工处理；旧结果仍不能当新结果返回。

原子领取时递增 leaseFence，记录 leaseUntil。所有心跳、完成和失败写入都要带当前 fence，且租约尚有效。崩溃后重领获得更大 fence，旧进程即使恢复也不能写结果。数据库服务器时间是租约判断依据；本地测试中的数字时钟只是可控示例。

提交结果的一个短事务必须：

1. 锁定/检查当前求购、任务、目录/权限/策略/刷新修订，复核求购仍 OPEN 且 expiresAt>数据库当前时间、账号与全部商品资格。
2. 比较所有 InputVersion、输入商品版本和租约 fence；不一致则 superseded，并可靠安排当前输入任务。不得先写指针、后检查版本。
3. 插入不可变结果集/匹配对，以唯一 taskKey 防止重复结果；同键内容摘要不同报 RESULT_NONDETERMINISTIC，不能覆盖。
4. 条件更新 wanted 当前结果指针；在同一事务更新资格周期，按已批准通知政策插入唯一 notification_outbox。
5. 整体提交后确认消费；任何一步失败全部回滚。恢复重试读取既有提交，不能只补一半结果或通知。

所检查的修订单调推进、业务更改和本事务需使用一致的锁定/隔离协议，否则“检查后写入”的竞态依然存在。锁顺序建议统一：目录/权限/策略修订→wanted→task→结果/资格/通知；M9 需测试死锁重试与扫描吞吐。计算阶段不可长期占这些锁。

## 5. 结果版本、确定性与落库字段

规则重试必须使用相同输入快照、asOf、字典、算法、稳定次序。generatedAt=asOf；执行开始/结束、耗时和 attempt 存 run 表，不进入内容。expiresAt=min(asOf+TTL、求购到期、已知授权到期)。有效期到达时即使任务刚重试成功也不能提交为 current。

StoredResult schema 包含 taskKey、input、schema/policy/rule/tokenizer/dictionary/model/index 版本、method、generatedAt、expiresAt、state，以及完整有序 items（公开 Product 投影、商品/求购版本、score/scoreType、文字和结构化解释、有效期）。`resultVersion=rs_+SHA256(canonicalJSON(除 resultVersion/state 外的上述字段))`；条目不重复内嵌 resultVersion，公开响应组装时注入结果集版本，避免循环摘要。state 变 stale 不改变内容摘要，解释或公开价格变化则必须改变摘要。包含浮点分数的摘要只由指定 Python 生产者计算一次后持久化，消费者不跨语言重算；若改用另一种生产者，须先定义并测试统一数字序列化。schema 是逻辑记录契约，不冒充最终 DDL。

不确定模型与动态降级不能在同 taskKey 下随机改变结果：本阶段规则基线固定。未来启用模型时冻结种子/推理版本/索引和有效执行路径；若一次尝试已选定回退 rule，后续同任务保持该选择。成功任务不重算；恢复模型效果须新 policyGeneration 或 refreshGeneration，并升级结果。服务请求的即时搜索降级不写成另一次业务事实。

| 存储对象（候选逻辑表） | 最少字段 | 唯一性/约束 |
| --- | --- | --- |
| event_outbox / inbox | eventId、事件内容摘要、不可变版本；投递状态/attempt/nextAttemptAt 独立记录 | eventId；冲突不能覆盖；业务更新+outbox 同事务 |
| matching_task | taskKey、完整 InputVersion、status、attempt、leaseFence、leaseUntil、nextAttemptAt、lastErrorCode、createdAt/updatedAt | taskKey 唯一+上述业务版本组唯一；asOf 不可变 |
| matching_run | runId、taskKey、attempt、fence、startedAt/finishedAt、errorCode、耗时、实际方法与版本 | taskKey+attempt 唯一；不存敏感输入正文 |
| matching_result_set | resultVersion、taskKey、完整输入/策略版本、snapshotRef、generatedAt/expiresAt、状态、内容摘要 | taskKey 唯一；内容不可变，状态另列 |
| matching_pair | resultVersion、wantedId、productId、productVersion、资格/缺信息原因、score/scoreType、结构化解释 | resultVersion+productId 唯一；不合格项仅内部诊断，不作为公开结果 |
| wanted_current_result | wantedId、resultVersion、业务/目录/授权/策略/刷新修订 | wantedId 主键；条件更新，不以时间戳比较覆盖 |
| matching_eligibility | wantedId、productId、lastKnownEligibility、currentAvailability、eligibilityEpoch、lastNotifiedAt | wantedId+productId 唯一；unknown 与最后已知资格分列 |
| notification_outbox | dedupKey、recipientId、wantedId、productId、eligibilityEpoch、resultVersion、state、createdAt/expiresAt、attempt/nextAttemptAt | dedupKey 唯一；与结果事务一致 |
| notification | id、dedupKey、recipientId、type、安全摘要、目标、createdAt/readAt | dedupKey 唯一；只读已提交事实，点击重新授权 |

schema 中的 Task/StoredResult/NotificationIntent 是可校验的业务记录，不等于完整业务表：存储层另有审计时间、投递重试等运行字段。DDL、外键、索引和迁移由 M9 统一维护；尚未写入任何实际表。

## 6. 资格周期与通知

`dedupKey = notice_ + SHA256(canonicalJSON({recipientId,wantedId,productId,eligibilityEpoch}))`。首次确认为 eligible 进入 epoch=1；已知 ineligible→eligible 才递增。连续合格、分数变化、结果换版本、重试不增加；数据暂不可用 currentAvailability=unknown，保留 lastKnownEligibility，恢复后不凭空生成新周期。unknown 期间禁止发通知。

资格变化不等于达到通知门槛。通知开关默认 false；阈值、冷却和每日上限未签字时不得开启。通知只允许非空有效规则评分达到已批准门槛的商品；constraints_only、needs_info、stale、不可用、过期和无权限均不发送。重新合格后是否允许再次通知及冷却期，需要 M4/M6/M7 冻结；通过政策判断前不创建可发送意图。由 [contract-handoff.md](contract-handoff.md) 登记，而不是以默认关闭冒充通知验收通过。

发送站内通知时，在同一个业务库短事务中复核：求购仍有效、商品仍合格且对接收者可见、周期仍相同、授权/通知政策允许、结果有效期未过。若指向旧结果，先确定当前结果仍包含这对商品及解释，不得发送旧价格/旧理由；无法确认则取消并等待新结果。站内通知插入唯一 dedupKey 与 outbox 标 sent 同事务。WebSocket 只提醒读取站内记录，重复提醒由客户端 notificationId 去重。

发送前关闭求购、售出商品或撤销权限必须阻止插入；检查和插入若分两次无锁读写则不满足本契约。已写站内通知保留历史，但目标不可用时只显示安全占位，点击重新授权。外部推送未纳入当前交付，不能宣称第三方恰好一次。

## 7. 可执行规格与 Phase 3 接收

[test_contracts.py](../../../../scripts/m7_phase2/test_contracts.py) 中的 LifecycleModel 验证顺序模拟：重复事件、冲突事件、相同输入任务去重、旧目录事件不可回滚事实、各版本变化阻止旧提交、租约占用/过期重领、fence 拒绝旧 worker、到期等值、策略回滚递增、unknown 恢复不重复周期、通知默认关闭/唯一键/发送前复核。

模型不是真实消费者：observe_event 与 schedule 分开调用，资格与结果不在真实事务，通知授权以测试传入布尔值模拟。它证明规格样例的预期，不证明数据库事务、真正并行执行、消息至少一次投递、自动定时或故障恢复已实现。实际 M6/M9 接收必须执行以下注入：

| 场景 | 必须观察 | 负责人 |
| --- | --- | --- |
| 同业务版本并发触发 3 次，两个 worker 同时领取 | 一个逻辑任务/当前结果，至多一条站内通知 | M6/M9，M10 复核 |
| v3 已售后收到 v2 上架，或计算期间改预算/权限 | 旧结果被拒绝，不能恢复资格 | M6/M7 |
| 插入结果、更新指针、插入通知的每个事务步骤故障 | 全部回滚或全部存在，无半提交 | M6/M9 |
| worker 崩溃、租约到期、旧 worker 恢复 | 新 fence 生效，旧进程不能写入 | M9 |
| 通知插入后消费确认前崩溃、重投 | 唯一站内记录，不重复插入 | M6/M9 |
| 计算后/发送前关闭求购、售出、撤销权限或到期 | 发送事务拒绝，无新通知 | M5/M6/M9 |
| 模型超时恢复、规则也失败、回滚算法 | 同输入确定性，明确降级/失败，旧策略不能覆盖新策略 | M7/M9 |

AI2-05 交付定义是这些字段、规则和确定性样例可供接入；真实数据库故障注入是 Phase 3 的接收验证，不能提前勾为已通过。
