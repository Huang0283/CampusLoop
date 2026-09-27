# M5 Phase 1 个人交付与执行记录

> Owner：M5（胡可铭）｜日期：2026-09-27｜任务：[Issue #5](https://github.com/Huang0283/CampusLoop/issues/5)
> 本目录仅保存 M5 原始证据。小组/阶段正式验收索引、签字和关闭结论由 M10/M1 维护，本文不代签。

## 1. 任务与产物

| 任务 | 交付文件 | 覆盖内容 | 当前结论 |
|---|---|---|---|
| BP1-01 | [auth-domain.md](../auth-domain.md) | 领域对象、三种状态维度、操作权限、管理员边界 | 候选已编写，待 M6/M9 交叉 Review |
| BP1-02 | [user-field-visibility.md](../user-field-visibility.md) | 公开/本人/审核/禁止返回矩阵、序列化和写入白名单 | 候选已编写，待 M2/M6/M9/M10 确认 |
| BP1-03 | [auth-flows-and-risks.md](../auth-flows-and-risks.md) | 六条 Mermaid 流程、失败恢复和攻击风险 | 候选已编写，未执行真实认证测试 |
| BP1-11 共同任务输入 | [high-risk-scenarios.md](../high-risk-scenarios.md) | 18 个权限、状态、并发和环境场景及责任 | M5 初稿，M6/M9/M10 待确认 |
| M5 证据 | [verification.md](verification.md) | 自检方法、结果、版本定位和验证边界 | 作者自检，不替代独立验收 |
| M5 交接 | [handoff.md](handoff.md) | 输入版本、差异、接收人和阻塞 | 未确认项有负责人和建议检查时间 |

## 2. 本次执行计划与完成范围

- [x] 读取最新 Issue #5、M1 范围、M2 权限原型、M9 三份候选。
- [x] 从 `origin/phase1/backend-platform` 的 `e1fe4810740b1ab53f2f8d14bd2fd178829f6b37` 创建 `task/m5-p1-auth-boundary`。
- [x] 完成 BP1-01/02/03 三份候选，区分角色、对象权限、账号状态及模拟认证。
- [x] 汇总 BP1-11 场景初稿，记录 M6/M9 依赖，不改写他人候选或验收记录。
- [ ] M6/M9 交叉 Review、M2/M10 消费确认，处理反馈。
- [ ] 任务 PR 通过评审并合入 `phase1/backend-platform`。
- [ ] M6 交付齐备、M10/M1 验收后，M5 提交后端组汇总 PR。
- [ ] M1 按 Issue #5 的阶段门禁将 `phase1/integration` 收口到 `main`，统一关闭阶段 Issue。

本任务选择“基于已有平台设计完成认证候选”的路径：既保留 M9 的数据库/缓存职责，又明确轮换、撤销和证据授权的缺口。正式 Cookie/JWT 传输、算法参数、数据库索引以及代码实现由 Phase 2/3 决定，当前不增加工程骨架。

## 3. 分支与评审路线

```text
task/m5-p1-auth-boundary
  -> phase1/backend-platform       个人 PR；M6/M9 交叉评审
  -> phase1/integration            小组汇总；需 M6 产物和 M10/M1 门禁
  -> main                         M1 阶段收口
```

截至本次检查，远端没有 `phase1/integration`，不由 M5 擅自替 M1 新建或绕行 `main`。最终提交号通过 `git log -1 --format=%H -- docs/evidence/phase-1/backend-platform/auth-domain.md` 定位；PR 和独立验收状态以 GitHub 实际记录为准。此 PR 仅关联 Issue #5，不使用自动关闭整个小组 Issue 的关键词。
