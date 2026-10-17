# M7 Phase 5：AI5-01～AI5-03

整理日期：2026-10-17。状态：前三项个人交付物已准备，正式验收待完成。

| 任务 | 入口 | 本次范围 | 验收状态 |
| --- | --- | --- | --- |
| AI5-01 | [版本清单](search-release-manifest.md) | 固定集成基线、实验候选、schema、模型、索引、权重和消费者出处 | 最终发布页面/服务版本核对待 M3/M6/M9/M10 |
| AI5-02 | [数据说明](search-data-documentation.md) | 来源许可、17 个数据文件哈希、划分、标注、泄漏和可执行重建 | 结构化复核归档与团队许可接收待完成 |
| AI5-03 | [复现指南](search-reproduction-guide.md) | 数据、基线、RPC、候选索引/增量/评估、独立重算的分步命令 | 本次作者实跑见 verification；M10 最终干净环境验收待完成 |

[交付清单](deliverables.md) · [实际验证](verification.md) · [交接与阻塞](handoff.md)

基于 `phase4/integration@6df25176866a6b1df2c1da5dcd28229b965f73ff` 整理。
工作分支为 `prep/m7-p5-search-reproducibility`。尚无 Phase 5 正式集成输入，不能将准备分支冒充正式分支。
`source-snapshots/` 保存带完整提交号和 SHA256 的上游证据原文，不代表本次新增签署。

AI5-04、M8 任务 AI5-05～07、共同任务 AI5-08～10 不在本次完成范围。此处支持性 verification/deliverables 文件不等于 AI5-10 已完成。
