# CampusLoop · M7 第一部分交付包

版本：m7-p1-v1.1｜2026-09-23｜范围：Phase 1 整体

已生成五项设计文档、交付清单、核查记录、交接记录，以及 M7 能力矩阵补充。依据用户项目文档，并核对智能组和后端平台组的指定 Git 快照。

本轮修订：补充 `/wanted` 范围边界和后续归属确认、统一期限回填动作、补齐 AI2 编号的固定版本来源、增加可复跑自检及原始执行日志。保留 ownerId 命名，明确商品卖家和求购发布者的语义。

[逐条意见处理](review-resolution.md) · `evidence/self-check.log`（完整交付包内） · `evidence/self-check.json`（完整交付包内）。


## 仓库收录说明

本目录收录 v1.1 交付包的 11 份 Markdown（含本阅读入口），并修正搬入仓库后的文档链接。自检脚本、原始日志和 checks.json 属于完整交付包附件，不在本次仅 Markdown 的提交范围内；复跑命令需在完整交付包中执行。

以下正文及各文档里的“未提交”“尚无交付 commit”描述的是 2026-09-23 打包时的历史状态；本次 Markdown 收录提交以 Git 历史为准，不将打包时日志中的基准 HEAD 冒充交付提交。可在仓库根目录查询本次收录及后续变更：

```text
git log -1 --format="%H %s" -- docs/evidence/phase-1/intelligence/README.md
```

提交文档不会补齐 M8/M10 非作者复核、日历期限或团队批准；这些门禁仍待执行。

## 阅读顺序

1. [AI1-01 搜索需求](search-requirements.md)：页面/业务字段映射、输入输出、12 个场景。
2. [AI1-02 关键词基线](keyword-baseline-design.md)：分词、筛选、权重、排序、分页与算例。
3. [AI1-03 供需匹配](matching-baseline-design.md)：硬约束、软分数、解释与 10 个资格案例。
4. [AI1-04 生命周期](matching-lifecycle.md)：事件、版本、通知去重、恢复和 10 个故障场景。
5. [AI1-05 评估方案](search-evaluation-plan.md)：数据、标注、防泄漏、P@K/R@K/MRR 与手算。

配套：[交付与来源](deliverables.md) · [核查记录](verification.md) · [交接台账](handoff.md) · [能力矩阵](capability-decision-matrix.md) · `checks.json`（完整交付包内）。

## 放入项目

包内保留仓库目录结构：`docs/evidence/phase-1/intelligence/`。在任务分支将九份新文档放入该目录，并放入 `scripts/m7_phase1/self_check.py`；共享 `capability-decision-matrix.md` 基于智能组 15d6dd52 的版本，仅追加末尾“M7 本次候选补充”及其期限口径说明。若远程矩阵已经变化，请只合入追加内容，避免覆盖他人的更新。相较 v1.0，已有文件使用本轮修订版，新增 review-resolution.md 和自检脚本。

智能组基准：`15d6dd52f6c960164619e55979f9ad3bc89cbee7`。后端 ER 参考：`4d204c599e30bcfb358bf1b511961359a91b92a6`。完整固定来源链接在交付清单中。

## 状态与下一步

本次文件和公式自检通过，26 项原始结果随包保存。仍缺交付提交号、M8 互审、M10 阶段集成复核及 M1 确认的具体期限。文档是可评审候选，未提交或推送 GitHub，未关闭 Issue；没有真实服务运行或模型效果数字。旧 v1.0 交付包保留，后续以本 v1.1 为修订候选。
