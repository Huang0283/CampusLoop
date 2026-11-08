# MQ5-02 最终需求追踪

日期：2026-10-25。需求编号来源 `docs/management/m1/requirements-traceability.md`；结合 Phase 2 requirements-baseline.md 和 Phase 4 feature-freeze-register.md 限定范围，不能把历史候选的十周计划或 todo 状态当作当前实现事实。审计源码 `50108a3`。下列“已实现”仅指技术候选，不代表最终发布已批准。逐项保留原验收要求，代码/测试是核对入口；总测试数不能替代子条款覆盖。原始执行结果见 M10 `final-regression-report.md`。

### AUTH-001 注册、登录、退出和会话失效

- 状态：已实现（本轮技术候选）。
- 原验收要求：合法账号可建立/结束会话；重复账号、错误密码、禁用账号和过期令牌结果明确；对应 AC-01。
- 代码/测试入口：`backend/app/services/auth.py`、`frontend/src/live/AccountPages.tsx`、`backend/tests/test_auth.py`、`backend/tests/test_browser_sessions.py`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### AUTH-002 用户资料与模拟校园认证标识

- 状态：已实现（教学模拟范围）。
- 原验收要求：本人可编辑允许字段；公开字段不包含邮箱、令牌、私聊、见面和举报证据；对应 AC-02。
- 代码/测试入口：`backend/app/services/auth.py`、`frontend/src/live/AccountPages.tsx`、`backend/tests/test_auth.py`、`backend/tests/test_browser_sessions.py`。
- 本次结论与限制：按需求提供模拟校园认证标识。真实学校 SSO 和身份认证明确在项目排除范围，不把它们列成成员漏做任务。

### AUTH-003 普通用户、管理员及资源所有权

- 状态：已实现（本轮技术候选）。
- 原验收要求：每个受保护动作同时校验角色与资源所有权，隐藏按钮不替代后端授权。
- 代码/测试入口：`backend/app/services/auth.py`、`frontend/src/live/AccountPages.tsx`、`backend/tests/test_auth.py`、`backend/tests/test_browser_sessions.py`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### MARKET-001 商品发布、编辑、上下架和逻辑删除

- 状态：已实现（本轮技术候选）。
- 原验收要求：卖家可维护本人商品；非所有者操作被拒绝；状态事件可追踪。
- 代码/测试入口：`backend/app/api/routes/market.py`、`frontend/src/live/MarketPages.tsx`、`frontend/tests/live/m3-phase5.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### MARKET-002 商品市场、详情、分页和排序

- 状态：已实现（本轮技术候选）。
- 原验收要求：买家可浏览在售商品并查看允许公开的详情；空、错、无权限状态明确。
- 代码/测试入口：`backend/app/api/routes/market.py`、`frontend/src/live/MarketPages.tsx`、`frontend/tests/live/m3-phase5.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### MARKET-003 关键词搜索与结构化筛选

- 状态：部分完成。
- 原验收要求：可按标题/描述/类别/品牌和价格/成色/地点筛选；智能服务不可用仍可用；对应 AC-03。
- 代码/测试入口：`backend/app/api/routes/market.py`、`frontend/src/live/MarketPages.tsx`、`frontend/tests/live/m3-phase5.spec.ts`。
- 本次结论与限制：现有关键词和结构化筛选可用；基线要求的品牌字段/筛选没有完整冻结实现，不把全句标为完成。

### MARKET-004 商品所有权和禁止自购

- 状态：已实现（本轮技术候选）。
- 原验收要求：非所有者不能修改，发布者不能购买自己的商品；对应 AC-04。
- 代码/测试入口：`backend/app/api/routes/market.py`、`frontend/src/live/MarketPages.tsx`、`frontend/tests/live/m3-phase5.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### MARKET-005 收藏和商品状态同步

- 状态：已实现（本轮技术候选）。
- 原验收要求：可收藏/取消；已售、下架和删除状态在列表中正确处理；对应 AC-05。
- 代码/测试入口：`backend/app/api/routes/market.py`、`frontend/src/live/MarketPages.tsx`、`frontend/tests/live/m3-phase5.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### MARKET-006 求购发布、编辑、关闭和过期

- 状态：已实现（本轮技术候选）。
- 原验收要求：求购包含预算、成色、地点、有效期并有完整生命周期。
- 代码/测试入口：`backend/app/api/routes/market.py`、`frontend/src/live/MarketPages.tsx`、`frontend/tests/live/m3-phase5.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-001 双人会话、消息持久化与历史补拉

- 状态：已实现（本轮技术候选）。
- 原验收要求：授权参与者可收发；断线后补拉；重复消息去重；对应 AC-06。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-002 结构化报价、拒绝、还价和过期

- 状态：已实现（本轮技术候选）。
- 原验收要求：状态转换及操作角色明确；过期/重复/越权操作失败；对应 AC-07。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-003 接受报价并创建唯一订单

- 状态：已实现（本轮技术候选）。
- 原验收要求：只有一个报价成功占用商品；并发第二请求失败且不产生重复事实；对应 AC-08。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-004 订单状态与不可变事件

- 状态：已实现（本轮技术候选）。
- 原验收要求：所有状态由业务动作驱动，前端不能任意写状态；每次变化有事件记录。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-005 见面时间地点记录、修改和双方确认

- 状态：已实现（本轮技术候选）。
- 原验收要求：只记录私聊协商结果；修改产生新版本并使旧确认失效；不提供智能推荐；对应 AC-09。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-006 双方独立完成确认

- 状态：已实现（本轮技术候选）。
- 原验收要求：单方确认不完成；同一有效版本双方确认后订单完成、商品已售；对应 AC-10。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-007 完成订单后双方评价

- 状态：已实现（本轮技术候选）。
- 原验收要求：仅参与者在完成后各评价一次；取消/争议/第三方被拒绝；对应 AC-11。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-008 交易取消和争议状态

- 状态：已实现（本轮技术候选）。
- 原验收要求：允许角色、原因、可恢复性和对评价/信誉的影响明确。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-009 消息、报价和订单幂等

- 状态：已实现（本轮技术候选）。
- 原验收要求：重试不产生重复消息、报价、订单或完成事件。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### TRADE-010 双账号完整交易旅程

- 状态：已实现（本轮技术候选）。
- 原验收要求：两个学生账号完成发布至双方评价，保存代码、环境、数据和结果证据。
- 代码/测试入口：`backend/app/api/routes/transactions.py`、`frontend/src/live/TransactionPages.tsx`、`backend/tests/test_p5_integration.py`、`frontend/tests/live/journey.spec.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### AI-001 语义搜索与关键词降级

- 状态：部分完成。
- 原验收要求：与关键词基线公平比较；超时/索引未就绪退回关键词；对应 AC-15。
- 代码/测试入口：`backend/app/api/routes/intelligence.py`、`services/m7_baseline/engine.py`、`services/m8_baseline/engine.py`、`backend/tests/test_ai_orchestration.py`。
- 本次结论与限制：关键词及降级可用，学习语义模型未获独立评估批准，NO_GO。

### AI-002 求购与商品供需匹配

- 状态：部分完成。
- 原验收要求：先硬约束再软匹配；结果含原因/版本/降级，分数不称为成交概率；对应 AC-14。
- 代码/测试入口：`backend/app/api/routes/intelligence.py`、`services/m7_baseline/engine.py`、`services/m8_baseline/engine.py`、`backend/tests/test_ai_orchestration.py`。
- 本次结论与限制：规则匹配与硬约束可用，语义软匹配模型仍 NO_GO。

### AI-003 价格建议区间与规则基线

- 状态：已实现（本轮技术候选）。
- 原验收要求：输出区间、主要因素和限制；数据不足用规则，不自动定价；对应 AC-16。
- 代码/测试入口：`backend/app/api/routes/intelligence.py`、`services/m7_baseline/engine.py`、`services/m8_baseline/engine.py`、`backend/tests/test_ai_orchestration.py`。
- 本次结论与限制：已实现规则价格区间及不可用提示；不是获批的学习价格模型，L3=0，不报告 MAE/MAPE 达标。

### AI-004 信誉说明和人工风险线索

- 状态：已实现（本轮技术候选）。
- 原验收要求：新用户中性；公开/管理员字段分离；不自动封禁或认定欺诈；对应 AC-17。
- 代码/测试入口：`backend/app/api/routes/intelligence.py`、`services/m7_baseline/engine.py`、`services/m8_baseline/engine.py`、`backend/tests/test_ai_orchestration.py`。
- 本次结论与限制：仅信誉解释和人工风险线索，不自动封禁，不认定欺诈。

### ADMIN-001 用户、商品和举报管理

- 状态：已实现（本轮技术候选）。
- 原验收要求：管理动作后端授权、填写原因并写审计；对应 AC-12。
- 代码/测试入口：`backend/app/api/routes/governance.py`、`frontend/src/live/AdminPages.tsx`、`backend/tests/test_governance_api.py`、`backend/tests/test_product_governance.py`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### ADMIN-002 站内通知与已读状态

- 状态：已实现（本轮技术候选）。
- 原验收要求：消息、报价、订单、见面和处理结果可追踪；重复事件不重复通知。
- 代码/测试入口：`backend/app/api/routes/governance.py`、`frontend/src/live/AdminPages.tsx`、`backend/tests/test_governance_api.py`、`backend/tests/test_product_governance.py`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### ADMIN-003 基础统计与审计查询

- 状态：部分完成。
- 原验收要求：每个指标标明时间、分母和来源；敏感操作可按授权追踪。
- 代码/测试入口：`backend/app/api/routes/governance.py`、`frontend/src/live/AdminPages.tsx`、`backend/tests/test_governance_api.py`、`backend/tests/test_product_governance.py`。
- 本次结论与限制：审计与 Worker 运维观测可用；完整业务统计、时间口径和分母未全部实现。

### QUALITY-001 关键依赖降级

- 状态：部分完成。
- 原验收要求：AI/Redis/对象存储/WebSocket 故障时按既定边界降级且提示明确；对应 AC-13。
- 代码/测试入口：`docker-compose.yml`、`backend/scripts/verify_restore.py`、`frontend/playwright.config.ts`。
- 本次结论与限制：已执行智能关闭、RPC 故障和 WebSocket 回归；没有本轮全量 Redis/对象存储进程故障演练，不能声称全部依赖故障均实测。

### QUALITY-002 自动化测试入口与 CI 门禁

- 状态：已实现（本轮技术候选）。
- 原验收要求：PR 自动执行约定检查；失败不可静默合并；结果保留。
- 代码/测试入口：`docker-compose.yml`、`backend/scripts/verify_restore.py`、`frontend/playwright.config.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### QUALITY-003 统一运行环境与配置模板

- 状态：已实现（本轮技术候选）。
- 原验收要求：非作者按说明启动；无真实密钥；依赖与迁移版本明确。
- 代码/测试入口：`docker-compose.yml`、`backend/scripts/verify_restore.py`、`frontend/playwright.config.ts`。
- 本次结论与限制：本次未新增范围；最终人工接受与发布状态仍受小组门禁约束。

### QUALITY-004 备份、迁移回滚与恢复演练

- 状态：部分完成。
- 原验收要求：迁移可重复，回滚条件清楚，干净环境恢复有真实记录。
- 代码/测试入口：`docker-compose.yml`、`backend/scripts/verify_restore.py`、`frontend/playwright.config.ts`。
- 本次结论与限制：26 表内容、约束/索引和迁移恢复通过；MinIO 字节灾备未执行，数据库成功不等于完整系统灾备。

### QUALITY-005 文档、缺陷、演示和发布门禁

- 状态：部分完成。
- 原验收要求：版本/术语/状态一致；P0/P1 清零；提交证据可复核。
- 代码/测试入口：`docker-compose.yml`、`backend/scripts/verify_restore.py`、`frontend/playwright.config.ts`。
- 本次结论与限制：技术证据与门禁已整理；真实课程材料、人工签收和正式发布合并/tag 仍缺。

### QUALITY-006 需求、计划、风险和变更追踪

- 状态：部分完成。
- 原验收要求：范围变化有记录，遗留项有负责人/期限，汇报内容可追踪。
- 代码/测试入口：`docker-compose.yml`、`backend/scripts/verify_restore.py`、`frontend/playwright.config.ts`。
- 本次结论与限制：需求、缺陷和 Owner 已登记；真实课程截止日期、范围接受和最后交接尚未确认。

## 汇总限制

真实学校认证在项目排除范围；品牌筛选、完整业务统计和两项学习模型不能以基线演示冒充完成。Phase 4 已把学习模型隔离并转交后续真实测试组，本轮保留该决定，不擅自要求把学习模型强行上线。Issue #37 的“两个已通过评估智能能力”应由 M1 明确按已冻结规则能力接收或补充效果评估，不能自动等同两项获批学习模型。小规模 localhost 压测不是生产 SLA；未执行故障组合、媒体灾备和人工提交如实留项。
