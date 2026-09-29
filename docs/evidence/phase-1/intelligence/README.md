# CampusLoop · M7 Phase 1 交付包

原始设计版本：m7-p1-v1.1（2026-09-23）

仓库复核日期：2026-09-27

范围：AI1-01 至 AI1-05，以及 AI1-11 中由 M7 负责的搜索与匹配候选结论。

本目录包含五份核心设计、交付清单、验证记录、交接台账和共享能力矩阵补充。材料只证明 Phase 1 的需求、规则、边界和评估方法已经形成，不声称真实服务、数据集、模型效果或跨组签字已经完成。

## 阅读顺序

1. [AI1-01 搜索需求](search-requirements.md)：页面/业务字段映射、输入输出和 12 个场景。
2. [AI1-02 关键词基线](keyword-baseline-design.md)：分词、筛选、权重、排序、分页和手算。
3. [AI1-03 供需匹配](matching-baseline-design.md)：硬约束、软分数、解释和 10 个资格案例。
4. [AI1-04 生命周期](matching-lifecycle.md)：事件、版本、通知去重、恢复和 10 个故障场景。
5. [AI1-05 评估方案](search-evaluation-plan.md)：数据准入、标注、防泄漏、P@K、R@K 和 MRR。

配套材料：

- [交付与来源](deliverables.md)
- [验证记录](verification.md)
- [交接与待决事项](handoff.md)
- [能力决策矩阵](capability-decision-matrix.md)
- [评审意见处理](review-resolution.md)
- `scripts/m7_phase1/self_check.py`

## 仓库状态

- 任务分支：`task/m7-p1-search-feasibility`。
- 分支基线：`phase1/intelligence` 提交 `15d6dd52f6c960164619e55979f9ad3bc89cbee7`。
- M8 已有的价格、信誉和风险设计保持原文；M7 只在共享能力矩阵末尾追加搜索与匹配候选结论。
- 当前材料已经形成可检出的 Git 提交；具体提交和 PR 状态以仓库历史及 GitHub PR 页面为准。

## 自检

从仓库根目录运行：

```text
python scripts/m7_phase1/self_check.py
git diff --check origin/phase1/intelligence...HEAD
```

自检覆盖必需文件、相对链接、SR/MC/LC 场景编号、关键设计内容和公式算例。它不替代 M8 的组内 Review，也不替代 M10/M1 在阶段集成提交上的正式验收。

## 完成边界

M7 的 AI1-01 至 AI1-05 个人设计可以通过任务 PR 交付。智能功能组第一阶段 Issue 仍需 M8 交叉评审、AI1-11 共同确认、跨组字段确认、小组汇总 PR、M10 独立验收和 M1 阶段收口，不能因为 M7 PR 合并而关闭。
