# AI2-04/05 上游核对、差异与接收清单

日期：2026-09-28。全部确认栏为待办；本文件不代替成员签字。文件随 PR #71 的修复提交更新，仍需真实接收人完成确认。

## 1. 本次读取的版本

本次修复分支基于最新 phase2/integration 的 40173f8b31223e956fa4b247da513e8398385e16，并将其合入 M7 个人交付分支。组分支 phase2/intelligence-contracts 仍停留在 d6e61b6806b48ccf67e5ae64b2d36b5f6b7a6548；PR #71 的目标仍是该组分支。读取其他组分支只作为设计输入，不把未收口内容直接替代本组契约。

| 来源 | 核查提交与文件 | 对 M7 的影响 |
| --- | --- | --- |
| 最新前端 Phase 2 | [182e1de](https://github.com/Huang0283/CampusLoop/tree/182e1de81af5d61383c5fd1f430d14a983d36c16)：openapi/campusloop.v1.yaml、MatchResultPage.tsx、wanted-ai-result-prototype.md | 匹配路由携带 wantedId，页面已使用 SDK 和相关程度；但尚未消费 degraded/resultVersion/expiresAt，仍客户端分页 |
| M6 领域设计候选 | [a52ff7b](https://github.com/Huang0283/CampusLoop/tree/a52ff7bdaf4fff2c1a4fa3ce2563f976e4dbab89)：domain-entity-catalog.md、state-machines.md、transaction-invariants.md | 匹配不关闭求购；商品生命周期与展示状态分开；订单取消释放到下架，不能直接重荐 |
| M5 字段白名单候选 | [773f2fd](https://github.com/Huang0283/CampusLoop/blob/773f2fd0ccb542684f8eec7185ca836c1082b571/docs/evidence/phase-1/backend-platform/user-field-visibility.md) | 搜索嵌套用户只用公开最小白名单；错误与通知同样禁止敏感字段 |
| M7 Phase 1 已补入智能组 | [7ae8484](https://github.com/Huang0283/CampusLoop/tree/7ae848413a454b0fe20ebb50ad2f882072689335/docs/evidence/phase-1/intelligence) | 承接规则、资格、epoch、CAS、降级设计；文档存在不等于团队冻结/业务实现 |
| 阶段任务书 | [AI-P2](https://github.com/Huang0283/CampusLoop/blob/40173f8b31223e956fa4b247da513e8398385e16/docs/issues/intelligence-phase-2-data-evaluation-contracts.md) | AI2-04 需 M3/M6/M9 签字；AI2-05 同业务版本确定性；AI2-09/10 仍为共同任务 |

当前 main 为 7e6ae5d87b691121a5d319a21db558596cd2d07f，phase2/integration 最新基线为 40173f8b31223e956fa4b247da513e8398385e16。前端 OpenAPI 和页面实现仍需与 M7 契约统一；不能把页面提交当成接口已补齐。M6/M5 候选仍等待跨组确认。

## 2. 可直接评审的材料

| 任务 | 文件/接收人 | 接收动作 | 当前结论 |
| --- | --- | --- | --- |
| AI2-04 | search-service-contract.md；M3/M6/M9 | 核对路由、字段、错误码、超时、降级与迁移表；执行样例校验 | 本地候选，待签字 |
| AI2-05 | matching-task-contract.md；M6/M9/M4 | 核对同库事务选择、事件/任务键、租约、周期与通知；确认表归属 | 本地规格和顺序模拟，待接收 |
| 机器文件 | schemas/m7-phase2/contracts.schema.json；contracts/m7-phase2；M6/M9 | 合入唯一契约体系，检查闭合字段/空值/枚举/时间 | 未修改公共 OpenAPI |
| 自动检查 | scripts/m7_phase2/contract_check.py、test_contracts.py；M8/M10 | 在独立环境运行，并检查失败用例是否反映业务含义 | 本会话自检，非独立验收 |
| 前三项数据 | data/m7-phase2 与原 schema/pipeline；M7/M8/M10 | 人工复核标签、冻结字典和测试集；不能复制候选标签冒充签字 | 原资产保持不变，228 对仍待人工复核 |

## 3. 必须关闭的差异与明确目标日期

以下日期是本次建议的接收目标（北京时间），不是已批准项目排期。M1 需确认或填写替代的具体日期；若未确认，阶段截止验收仍未满足。不能把“建议日期已填”视为 Owner 接受。

| 编号 | 未决项/影响 | Owner；依赖 | 下一动作 | 建议目标 |
| --- | --- | --- | --- | --- |
| C01 | 空分数及分页是对当前 SDK 的语义变化 | M6/M3；M7 | 同批修改 OpenAPI、生成 SDK，展示“仅条件匹配”、202/409/降级/过期 | 2026-09-29 18:00 |
| C02 | Wanted 分类/版本缺失、MATCHED 与 M6 新状态冲突；商品双维状态未冻结 | M6；M3/M9/M7 | 确认状态映射、字典、预算与必须地点；给出业务字段来源 | 2026-09-29 18:00 |
| C03 | 权限范围与授权版本来源未实装 | M5/M6；M9 | 确认匿名读取、本人匹配、失效凭据、权限不可用错误和事务检查来源 | 2026-09-29 18:00 |
| C04 | catalogRevision、同库事务、快照成本与开发预算待确认 | M9/M6；M7 | 选择实现协议，评估 1500ms 候选预算、租约与恢复参数，给出环境证据 | 2026-09-30 18:00 |
| C05 | 通知阈值/冷却/每日上限及重新合格政策空缺 | M4/M6/M7；M1 | 填具体配置与批准记录，未批准前通知保持关闭 | 2026-09-30 18:00 |
| C06 | 非作者评审/复现尚未执行 | M8/M10；M7 | 从提交或本包独立执行，填写环境、结果、日志与意见 | 2026-09-30 18:00 |
| C07 | 阶段接收、交付提交/汇报时间待确认 | M1/M7 | 已使用 40173f8 基线更新个人 PR #71；仍需 M1 确认 Phase 1 输入接收、组分支基准和实际汇报日期 | 2026-09-29 18:00 |

首次公开接入前必须完成 C01—C04；通知开启前完成 C05；阶段验收前完成 C06—C07。当前交付可继续供 Phase 2 评审，不能据此关闭 Issue #22。

## 4. 签字/接收记录

| 角色 | 必须确认内容 | 签字/日期/提交或 PR | 结论 |
| --- | --- | --- | --- |
| M3 | 页面字段、null 分数、服务端分页、202/409/降级和过期展示 | 待本人填写 | 未签 |
| M6 | 唯一 OpenAPI、权威业务字段、状态/版本/幂等与同库事务 | 待本人填写 | 未签 |
| M9 | 环境、超时资源预算、修订生成、持久化/调度/恢复 | 待本人填写 | 未签 |
| M5 | 公开白名单、本人匹配权限、授权撤销 | 待本人填写 | 未签 |
| M4 | 通知展示、阈值/冷却政策与重复提示处理 | 待本人填写 | 未签 |
| M8 | 同组交叉评审、共用字段与价格/风险边界 | 待本人填写 | 未签 |
| M10 | 非作者校验，Phase 3 故障注入接收计划 | 待本人填写 | 未签 |
| M1 | 范围、实际截止、集成基准与阶段门禁 | 待本人填写 | 未签 |

后续任务为 AI2-09 可重复指标脚本/运行手册，以及 AI2-10 数值门槛和签字。前面数据清洗和本次契约检查不是正式检索效果评估；本轮没有运行 P@K、R@K、MRR 或模型比较，也没有代填上线效果阈值。
