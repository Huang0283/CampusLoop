# BP2-11 认证契约联合走查登记

维护：M5｜2026-10-08｜本文件仅登记 M5 输入及接收门禁，不代签他人，不代表 BP2-11 已完成。

## 1. 输入版本

| 输入 | 已核对版本/来源 | 用途 |
|---|---|---|
| Phase 2 分工 | [Issue #21](https://github.com/Huang0283/CampusLoop/issues/21)，2026-10-08 API 读取，仍 open | 任务/分支/所有权与公开读取要求优先于 README roadmap |
| 当前后端组基线 | `c3a49290bf29cd54c1b569ed7a08dbd175891913`，[M9 PR #76](https://github.com/Huang0283/CampusLoop/pull/76) 已合并 | ORM、种子、初始 canonical OpenAPI |
| 验收后的 Phase 1 + MQ2 输入 | `3837d3c351f830568b1f52955015752010e32fbb`，[阶段集成提交](https://github.com/Huang0283/CampusLoop/tree/3837d3c351f830568b1f52955015752010e32fbb) | Phase 1 认证边界、HR-01～18，MQ2 安全状态矩阵 |
| 前端契约走查 | `a4b06faa90492faee27eb075db270dc0e4903bb9`，[前端走查](https://github.com/Huang0283/CampusLoop/blob/a4b06faa90492faee27eb075db270dc0e4903bb9/docs/evidence/phase-2/frontend/contract-review.md) | nickname、bio、campusVerified、school、退出参数差异 |
| M9 补证 | [PR #86](https://github.com/Huang0283/CampusLoop/pull/86)，2026-10-08 为 open | 种子哈希说明、启动/CI 证据；不能视作已合入 |

当前后端组基线尚不含完整 Phase 1 认证证据，因此本次使用上述固定提交读取输入，而非伪造当前分支已有输入。同步事项列在 G01；本次不把其他组改动混入个人 PR。

## 2. 差异、决定与接收人

“M5 决定”指本 PR 的明确提案；“共同最终值”只有接收人评审确认并记录修改提交后才成立。当前共同最终值均待确认，不能以空白签名冒充闭环。

| ID | M5 决定及受影响场景 | 决策/接收人 | 本次修改位置；外部修改提交 | 状态及完成条件 |
|---|---|---|---|---|
| D01 | 注册 201 同时创建会话；注册成功不再跳登录页 | M5/M2/M6/M10 | auth-contract.md 注册节；外部提交尚未产生 | 待 M2/M6 确认且 SDK/页面一致 |
| D02 | logout 使用 Bearer sid，无 refreshToken body；重复有效退出 204 | M5/M2/M6/M10 | auth-contract.md 退出节；外部提交尚未产生 | 待调用及 OpenAPI 更新 |
| D03 | 注册 nickname 必填；bio/campusVerified 本人响应；新增 school/college/major 可空存储 | M5/M2/M6/M9 | auth-openapi-input.md；外部提交尚未产生 | 待 schema、迁移和前端字段同步 |
| D04 | 默认公开五字段，自填学校和简介只本人可见 | M5/M2/M3/M6 | auth-contract.md 公开资料节；外部提交尚未产生 | 待公共卡片隐私走查 |
| D05 | tradeCount=transactionCount；creditLevel 无权威映射为 null | M5/M6/M8 | auth-openapi-input.md；外部提交尚未产生 | 待 M8 映射确认或接受空值，不生成假信誉 |
| D06 | 7 天固定家族期限、15 分钟 access；原子消费及全链重放撤销 | M5/M9/M6/M10 | auth-security-design.md SEC-DB-01；外部提交尚未产生 | 待家族模型、计数及迁移方案接收 |
| D07 | 真实 token 仅内存；页面重载重新登录 | M5/M2/M9/M10 | auth-security-design.md 生命周期节；外部提交尚未产生 | 待 M2 接受体验或共同变更 Cookie 设计 |
| D08 | 禁用 423；字段非法 422；角色越权 403；未知资源 404 | M5/M6/M2/M10 | auth-contract.md 错误节；外部提交尚未产生 | 待 error schema 和页面错误映射接收 |
| D09 | WS 先鉴权帧；逐次私有投递验权，最多 30 秒空闲复核 | M5/M6/M4/M9 | auth-security-design.md WS 节；外部提交尚未产生 | 待 WS 协议和恢复测试冻结 |

M5 交付的准确提交可用 `git log -1 --format=%H -- docs/evidence/phase-2/backend-platform/auth-contract.md` 获取，并由 PR head 追踪；合并后填入小组汇总证据。修改提交栏不允许填写尚未创建的提交号。

## 3. 接收及签署状态

| 接收方 | 应审内容 | 当前结论 |
|---|---|---|
| M5 | BP2-01/02 全部个人文件与本登记 | 已提交设计输入，未替代同组 Review |
| M6 | canonical OpenAPI、写事务授权、WS 及生成 SDK | 待确认 |
| M9 | SEC-DB-01/02、密码种子、密钥/限流/审计配置 | 待确认 |
| M2/M3/M4 | 注册跳转、资料、公开卡片、退出、WS 恢复 | 待确认 |
| M7/M8 | 只读取公开/获授权字段；信用空值及不自动封禁 | 待确认 |
| M10 | A01～A18，401/403/423、重放和故障分支 | 待独立复核；未执行真实认证测试 |
| M1 | 输入同步、阶段范围、日历 DDL 与汇总门禁 | 待范围复核 |

全部差异必须补最终值、决定人、实际修改提交、受影响场景和验收证据。个人 PR 未经同组 Review 不合并；M5 汇总到 `phase2/integration` 后还需 M10/M1 验收，不能提前关闭 Issue #21。
