本 PR 为 M6 的 BP1-04～BP1-07 补齐第一阶段领域与交易设计，供前端、账号权限、数据库及测试负责人评审。接受报价、约定变更、双方完成、评价和举报均有角色、前置条件、合法/非法结果及一致性保护方案。

- 任务：BP1-04、BP1-05、BP1-06、BP1-07；另提供 BP1-11 的 M6 输入，不关闭整个阶段 Issue。
- 交付目录：`docs/evidence/phase-1/backend-platform/`。
- 核心文件：`domain-entity-catalog.md`、`state-machines.md`、`transaction-invariants.md`、`transaction-concurrency-risks.md`。
- 个人清单/交接/验证：`m6-phase1-workbook.md`、`m6-review-record.md`；本文件保存 PR 正文。
- 内容：九类核心实体、五类状态图、16 条不变量、16 个场景、20 个风险及 6 组并发交错推演。
- 完善：删除保留已售事实；报价绑定商品版本；争议恢复用新确认轮次隔离旧请求；双确认不因无害订单版本变化互相阻塞；安全提交顺序补拉消息。
- 验证：`m6-review-record.md` 第 5 节的只读检查已通过，7 文件、46 个相对链接、5 个图源码块、16 条不变量、16 场景及 20 风险编号齐全；按第 4 节纸面走查正常/异常路径。未运行后端服务测试，未验证 Mermaid 图形渲染。
- 输入基线：后端组 `e1fe4810740b1ab53f2f8d14bd2fd178829f6b37`。本地准备时两次 fetch 失败，提交前应同步后端组分支并复核差异；输出版本以本 PR 的 head commit 为准。
- 遗留：`m6-phase1-workbook.md` 的 Q01～Q12，含状态、报价/争议/取消、模型/消息、M5 认证、课程日历和验收编号；均有 Owner、下一动作和截止门禁，队友尚未签字。
- Review：请 M5 或 M9 交叉评审；M3/M4 确认页面，M5 确认权限/治理，M9 接收模型约束，M10 独立核对可测试性；建议负责人待实际接收。
- 下一阶段：M6 转为 API/状态契约；M9 转为模型与迁移；M3/M4 对齐原型；M10 转为独立测试。

个人 PR 目标为 `phase1/backend-platform`，来源为 `task/m6-p1-domain-rules`。本 PR 不改变其他成员文件、阶段勾选结论或运行代码；共同规则冻结与阶段关闭仍依赖团队评审。
