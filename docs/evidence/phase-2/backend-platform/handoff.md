# BP2 后端平台交接与未完成门禁

本文件按 M5、M9 分章保留各自交付与证据。个人记录不代表后端小组联合验收完成。

## BP2 M5 交接与未完成门禁

Owner：M5｜2026-10-08｜范围：BP2-01/02 及 BP2-11 认证部分。

交付索引见 [deliverables.md](deliverables.md)，验证见 [verification.md](verification.md)，跨组差异见 [contract-signoff.md](contract-signoff.md)。当前文档是 M5 个人输入，不能替代整个后端组的汇总和联合验收。

### 1. 输入和版本

- 当前工作分支从 `origin/phase2/backend-foundation` 的 `c3a49290bf29cd54c1b569ed7a08dbd175891913` 创建；本次冲突修复已同步 `811e6249c5859f3d894de7014c0536ade73cdc71`，原始设计输入仍使用上述固定提交追溯。
- 已从 `origin/phase2/integration` 固定提交 `3837d3c351f830568b1f52955015752010e32fbb` 读取已验收 Phase 1 认证流程/字段/风险，以及 M10 Phase 2 安全状态测试矩阵。
- 前端基线 `a4b06faa90492faee27eb075db270dc0e4903bb9` 的 Auth/Users 走查仍等待 M5 输入，本交付逐项回应。
- M9 #76、#86 已合并；当前没有已合并的 M6 Phase 2 canonical 交付证据。没有据此宣称队友实现或验收已完成。

### 2. 接收清单

所有“待接收”均需接收人自己确认，当前未代签。交付提交使用本 PR head；合并后由 M5 在小组汇总 PR 回填合并提交。可用 `git log -1 --format=%H -- docs/evidence/phase-2/backend-platform/auth-contract.md` 定位设计版本。

| 输出 | 接收人 | 接收动作与验收命令/场景 | 当前结论 |
|---|---|---|---|
| auth-contract.md、auth-openapi-input.md | M6 | 合入七个接口和字段；canonical 合并后由 M6 执行 sdk:generate/sdk:check/lint/build | 待接收；未改 canonical |
| auth-security-design.md SEC-DB-01/02 | M9 | 设计迁移/索引/种子/密钥/刷新计数；验证空库升级和回退、单后继与禁用事务 | 待接收；现有表不足以满足全链撤销 |
| 契约前端消费节、D01～D08 | M2/M3 | 注册成功直接登录、重载重新登录、公开五字段及错误恢复；游客市场回跳 | 待确认体验和字段 |
| WS 规则 D09 | M6/M4/M9 | Origin、五秒鉴权、失效关闭、重连、私有收发再次验权 | 待协议接收 |
| 字段白名单、D05 | M7/M8 | 公共数据裁剪；creditLevel 空值；风险不直接改账号状态 | 待字段确认 |
| A01～A18 + 失败样例 | M10 | 纳入测试基线；Phase 3 实现后执行真实两账号、并发和故障用例 | 已提供预期，未独立执行 |
| contract-signoff.md + 本清单 | M1 | 复核范围、明确日历 DDL，接受输入同步/小组汇总流程 | 待复核 |

### 3. 未完成项及明确门禁

Issue 仅写“第二次汇报前”，没有具体日历时间。本文件不编造团队 DDL；以下事件截止是不可越过的门禁。M5 在 2026-10-09 18:00（Asia/Shanghai）前复核一次状态，M1 应在该复核点明确第二次汇报时间；该复核点不是已创建的提醒或替团队设定的截止日。

| ID | Owner / 依赖人 | 影响与当前可做内容 | 下一动作 | 截止门禁 |
|---|---|---|---|---|
| G01 | M5 / M1、M6、M9 | 后端组分支缺已验收 Phase 1 输入；个人设计可引用固定提交，不能声称组分支输入齐全 | 通过单独同步 PR 纳入已验收输入，并保留队友变化；不直接推送共享分支 | 小组汇总 PR 标记 ready 前 |
| G02 | M6 / M5、M2、M10 | canonical 与本输入有 D01～D08 差异；可评审文档，不能宣称 SDK 已冻结 | 接收认证输入、合入 canonical、由 M6 生成 SDK 并记提交 | Phase 2 契约冻结/前端汇总前 |
| G03 | M9 / M5、M6 | 缺 family/consumed/单后继、刷新限流持久化和三个资料字段；现骨架不能验收真实认证 | 接收 SEC-DB-01/02 和配置需求，通过 M9 个人 PR 落库；种子密码联调前切换 | 方案 Phase 2 冻结前；实现 Phase 3 认证联调前 |
| G04 | M2/M3/M4 / M5、M6 | 注册、退出、资料隐私、重载重新登录及 WS 体验需要确认 | 在个人 PR 确认 D01～D09 相关项，若必须 Cookie 则联合修改契约 | M5/M6 契约 PR 合并前 |
| G05 | M8 / M5、M6 | creditLevel 无可信映射；本期允许 null，不输出假信用 | 接受空值，或提交有来源的公开信用映射 | canonical 冻结前 |
| G06 | M10 / M5、M9 | 18 场景目前只有预期；不能称安全测试通过 | Phase 2 复核可测试性，Phase 3 运行并记录真实结果 | Phase 2 联合对签前；运行验收 Phase 3 收口前 |
| G07 | M5 / M9 | #86 已合并；本 PR 的三个共享证据文件已按 M5/M9 章节整合 | 文件冲突已解决；同组 Review 和契约接收仍待本人确认 | 本 PR 合并之前 |
| G08 | M5 / M6、M9、M1、M10 | 已合入 M9 #76 先于本次 M5，不满足原计划顺序；不回写历史 | 后续 M6/M9 同步 M5 后补齐差异；完成联合签署后发小组汇总 PR | 小组汇总前；禁止提前关闭 #21 |

### 4. 下一步协作与阶段边界

M5 先完成个人 PR，由至少一位同组成员交叉评审（M6 认证/业务衔接，M9 数据/运行影响）。之后 M5 还负责契约联合走查、证据汇总和到 `phase2/integration` 的小组汇总 PR，这些依赖真实评审结果，不能由作者替队友勾选。

个人 PR 不关闭 #21，不直接合并 main。Phase 3 才实现真实注册、登录、刷新、退出和资料持久化接口；Phase 2 的文档/样例、现有演示前端与后端骨架都不算真实业务已完成。

## BP2 移交说明（handoff）

> 证据文件：`docs/evidence/phase-2/backend-platform/handoff.md`
> 维护人：M9 ｜ 移交对象：M5 / M6 / M7 / M8 / 后端组长

### 给 M5（认证）

- `users.password_hash`：Phase 2 种子用 stdlib scrypt + 固定盐演示（`scripts/seed.py`），
  **仅为过渡方案**，Phase 3 请替换为正式方案（建议 passlib/argon2），并同步更新种子脚本。
- `refresh_sessions` 表已按 BP2-02 设计落库：只存 SHA-256 token 哈希、软删除 revoked_at、
  `(user_id, revoked_at)` 索引。认证实现直接使用即可。
- 敏感字段可见性：模型文件内有注释标注，任何响应/日志不得返回 password_hash。
- 种子演示账号 4 个（`*.demo@example.com` / `Demo@12345`），见 test-data-catalog.md。

### 给 M6（业务契约）

- **三处列可空性需你拍板**（模型 vs 迁移不一致，均不阻塞启动）：
  | 列 | 模型 | 迁移 | 建议 |
  |---|---|---|---|
  | order_events.operator_id | NOT NULL | NULL | 迁移为准（系统事件无操作人） |
  | products.campus_location | NOT NULL | NULL | 任选一侧，另一侧对齐 |
  | reports.description | NULL | NOT NULL | 迁移为准（截图举报可无文字） |
  确认后出一个小迁移补齐即可（Phase 3 初统一处理）。
- `orders.product_id` 取消后重卖的唯一性方案仍待确认（部分唯一索引位置已预留）。
- 契约修订后必须重新生成 SDK 并提交：CI 的 `sdk:check` 门禁已恢复，
  OpenAPI 与 SDK 不同步导致前端编译失败会被直接拦下。

### 给 M7 / M8（检索 / AI）

- `products.embedding` 列已建：`vector(768)`，pgvector 扩展由迁移自动创建。
  维度 768 为候选，若选型后改 1024 需要一次专门迁移（列上无数据，代价小）。
- 求购匹配用的 `wanted_posts.requirements` JSONB 列已就绪。

### 给所有人（环境使用）

- 本地启动：见 startup-guide.md（干净环境标准流程 + 国内镜像应急方案）。
- 所有镜像已固定 tag；**Python 文件修改务必拖拽上传，禁止网页编辑器粘贴**
  （会引入尾随空格，ruff 门禁必拦，已有真实案例）。
- `.env.example` 与 `app/core/config.py` 一一对应，新增配置两侧同步改。
- CI 三门禁说明与范围边界见 ci-contract.md：CI 不含 MinIO，
  完整环境验证按 startup-guide 单独取证。

### 已知问题与遗留

| 问题 | 影响 | Owner | 期限 |
|---|---|---|---|
| 干净环境 Compose 完整验证未执行 | BP2-09 验收最后一项 | M9（机房执行） | 本周 |
| 三处可空性差异 | 无功能影响，规范问题 | M6 确认 | Phase 3 初 |
| 种子密码为演示方案 | 不满足生产安全 | M5 | Phase 3 |
| orders 重卖唯一性 | 并发极小概率重复下单 | M6 | Phase 3 |
