# MQ5-01 发布看板

核对日期：2026-10-25。M1 负责范围，M10 负责技术验收。本轮内部补齐期限为 **2026-10-26 18:00（北京时间）**，不是课程截止日期；课程日期待提交人从 Blackboard 核实。

## 唯一候选与边界

- main 基线 `1b3385a`；Phase 4 收口 PR #118 对应 `7b13b67`。未找到正式 Phase 4 冻结标签，不能补称已存在。
- 已创建 `phase5/integration`、`phase5/release-candidate`，组汇总和个人 PR 尚需按顺序合并。
- 审计源码：`audit/phase5-candidate-20261025@50108a3a50ca18e0da3f4db709da3f8bea2ee24c`，包含后端 `ccba7ba`、前端/M2 `444f8be`、智能 `89aca5b`。它不是 main 或正式发布版本。
- 写入全部使用 `campusloop-mq5-audit` 独立数据库、对象卷及 Redis DB15。保留原界面和真实 SDK/会话。

## 缺陷与待办

### MQ5-D01：M2 CI 失败（P1，已修复）

Owner M2；用户委托 Codex 修复，M10 复验。9 个测试写死 API 8001，CI 实际为 8000。修复 `a47a9f6`、证据 `444f8be`；CI `40163071407`、`40163073917` 均成功。见 PR #120 和前端 `m2-pr120-acceptance.md`。技术缺陷关闭不等于 PR 已合并。

### MQ5-D02：聊天忽略 VITE_WS_URL（P2，已修复）

Owner M2，验证 M10。真实聊天使用统一 SDK 地址函数，支持显式 WebSocket 地址及 API 推导的 ws/wss；实际 socket URL 与生产预览均已验证。修改在 `a47a9f6`，保留批准界面。

### MQ5-D03：恢复文本哈希误报（P2，质量侧已补偿）

Owner M9，质量工具 Owner M10。PostgreSQL 恢复会重新打印等价的 varchar 数组转 text 表达式，原 `verify_restore.py` 的 schema 文本哈希因此不同。本轮新工具仅规范化已知等价表达式，仍比较全部约束和索引；实际删除角色约束的负例成功被检测。26 表计数、内容和迁移一致。没有修改 M9 生产脚本，直接调用旧脚本仍可能误报；使用本组 `recovery_drill.py` 复验，不得跳过约束检查。

### MQ5-R01：组汇总和个人材料仍缺项（发布阻塞）

Owner M1；上游 M2/M4/M5/M6/M7，验证 M10。PR #120 未正式合并；各组尚未依流程汇入 `phase5/integration`。候选未找到 M4 的 `transaction-regression.md`、`permission-final-audit.md`、`demo-recovery.md`，以及 M5 的 `security-review.md`、`moderation-security-report.md`。M10 联合回归不能冒充个人交付或独立 Review。下一步：上游补材料，或 M1 明确接管并记录归属，再按顺序合并。

### MQ5-R02：两项学习模型未获上线批准（NO_GO）

Owner M7/M8，范围接收 M1，验证 M10。M7 共 38 条查询，test_candidate=12，未形成封存独立测试集及可靠提升结论；M8 12 条 L0、0 条 L3，不能声称真实成交模型或 MAE/MAPE 达标。关键词、规则匹配、规则价格、信誉解释和人工风险线索可用。Phase 4 已把学习模型隔离并将真实评估交给后续测试组，本轮不撤销该决定。Issue 要求两个已通过评估的智能能力，并未强制两项学习模型；M1 应明确按已冻结规则能力接收及其评估依据，或安排补评。不能因单测通过自动将 NO_GO 学习模型改成 GO。

### MQ5-R03：实际课程材料和签收未提供（发布阻塞）

Owner M1，实际汇报成员协助，验证 M10。课程截止日期、完整五次实际汇报材料、演示视频及真实签收待提供。现有报告及自动化彩排不是课堂记录。下一步：提供真实文件并核对版本、隐私和 SHA；不代签 M1/M10 的本人接受结论。

### MQ5-R04：许可与数据使用确认（发布阻塞）

Owner M1，上游 M7/M8，技术清单验证 M10。已提供 npm/Python 依赖元数据和来源说明；根 LICENSE 未找到。清单不是法律审核，不擅自赋予团队或第三方作品开源许可。下一步：团队决定分发许可，确认数据/模型用途、署名及再分发条件；未确认前门禁 false。

### MQ5-L01：已披露的技术限制（P2，待范围接受）

前端主包约 906.92 kB/gzip 291.19 kB，构建存在 500 kB 提示，Owner M2。恢复仅含 PostgreSQL，不包含 MinIO 对象字节灾备，Owner M9。后端直接依赖固定，但传递依赖未全部锁定，Owner M9；M1 提供实际测试镜像 freeze 作为质量补充，新联网构建后的 173 项复验也已通过，见 package-reproduction.md。localhost 并发 10 测试不等于生产容量、RTO 或无障碍认证。M1 应明确接受或安排后续。

## 关闭规则

所有未完成项在上述内部期限复核；到期须更新日期和负责人，不自动视为延期批准。机器门禁见 `release-status.json`。执行场景中没有观察到未修复 P0/P1，但正式发布仍 BLOCKED，Issue #37 保持打开。
