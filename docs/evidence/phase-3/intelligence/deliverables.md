# M7 Phase 3 候选交付清单

日期：2026-10-08。代码提交 `1c235abba1c7a337501aacdec14f987c447563b0`，准备分支 `prep/m7-p3-search-matching-baseline`；阶段任务来源 `docs/issues/intelligence-phase-3-baseline-services.md`。Phase 2 联合内容已提交 [草稿 PR #87](https://github.com/Huang0283/CampusLoop/pull/87)，等待真人评审。

| 任务 | 本次成果 | 状态与缺口 |
| --- | --- | --- |
| AI3-01 | 字段权重倒排索引、结构筛选、四种排序、持久快照扫描分页；keyword-baseline.md | 算法与本机 RPC 可复核；M6 权威目录和公共接口映射未接入 |
| AI3-02 | 求购权限、硬约束、文本规则排序、逐项事实解释；matching-baseline.md | 候选实现已验证；可信身份/字典仍需 M6/M3/M9 批准 |
| AI3-03 | SQLite 原子保存、逻辑任务去重、事件内容冲突、修订倒退拒绝、历史状态；matching-task-integration.md | 部分实现；M6 实际事件、业务原子复核、生产队列和通知未联调 |
| AI3-04 | 38 条逐查询结果、三个 split 的指标输入/输出、独立重算、三类实际失败；search-baseline-report.md | 诊断交付完成；草稿标签人工复核 0/228，未封存正式效果基准 |
| AI3-09（M7 部分） | 版本 schema、内部 HTTP、脱敏日志、网络超时/断连回退；service-contract-verification.md | 本机真实调用通过；M3/M5/M6 实际调用与基础交易关闭智能服务场景未验收 |
| AI3-10（M7 部分） | 锁定依赖、完整运行器、源哈希、两个干净检出证据；verification.md/handoff.md | 作者验证通过；M8/M10 互审、M9 环境确认、M1 范围及 Phase 4 固定基准签字待完成 |

M8 的 AI3-05—08 不在本次实现范围。以上均不作为 Phase 3 小组完成、Issue 关闭或主分支发布的依据。

源码：`services/m7_baseline/`；schema：`schemas/m7-phase3/rpc.schema.json`；证据：`evidence/m7-v0/`。未修改公共 OpenAPI/SDK、M8 个人服务、前端、M9 业务迁移或冻结 Phase 2 数据；原 ownerId 字段保留。
