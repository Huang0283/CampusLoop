# 228 对人工审核补录、归档与重新评估

更新日期：2026-10-19。结论：**审核记录已归档；标签未封存；候选仍 NO_GO。**

## 审核事实与归属

- 审核人：KkkkRui。实际整批审核完成时间由用户补充为2026-10-18 23:31（Asia/Shanghai），按分钟精度记录为 `2026-10-18T23:31:00+08:00`；不声称228行在同一秒逐一审核。
- 用户选择补录“此前已经完成”的人工审核，并此前确认228对全部正确、标签不变。本轮据此保留原标签；不是把新的AI判断冒充人审，也不虚构M8独立互审。
- 每行reviewReason明确标注由Codex按请求/商品/硬约束源事实整理；不是对用户历史笔记的逐字转录。来源说明见 [recording-provenance](human-review/20261018-kkkkrui-v1/recording-provenance.json)。
- 完整覆盖228个原labelId，校验无缺失、重复、未知ID或标签差异；无争议裁决栏为空合法；原辅助表、候选草稿、原始数据和旧报告未覆盖。

## 新归档

[manifest](human-review/20261018-kkkkrui-v1/archive/manifest.json) · [实际逐条CSV](human-review/20261018-kkkkrui-v1/archive/review-records.csv) · [归档校验](human-review/20261018-kkkkrui-v1/archive/review-check.json)

新版本 `m7-label-reviewed-20261018-v1`，源版本 `m7-label-draft-v1`，datasetVersion仍为 `m7-synthetic-p2-v1.1`，humanReviewedPairs=228，labelSource=`HUMAN_REVIEWED_UNSEALED`，testSetSealed=false。

## 已用审核版本实际重跑

检出 `ca5a884c4980f2412da7bbd04ffb969ada5baae2`，运行前后干净；轻量环境/既有CPU模型环境分别执行基线和真实BGE候选评估，并对all/dev/test_candidate各用公共指标脚本重算，六份结果与报告一致。

[本次运行记录](human-review/20261018-kkkkrui-v1/run-record.json) · [基线状态](human-review/20261018-kkkkrui-v1/baseline/evaluation-status.json) · [候选状态](human-review/20261018-kkkkrui-v1/candidate/evaluation-status.json)

- 两侧新输出都读取到228条审核记录，labelSource为HUMAN_REVIEWED_UNSEALED，不再是PENDING_HUMAN_REVIEW。
- 标签数值未变，指标与原诊断一致：严格搜索/匹配MRR@10基线与候选均1.0，相对提升0；搜索P@5=0.5。
- 全部38请求、test_candidate12；未封存、样本/切片不足、候选门槛和环境审批/M10/M1仍未通过。因此继续DIAGNOSTIC_ONLY、NO_GO，不启用公开模型路径。

## 独立重现本轮审核版本

先从包含本记录的真实Git提交检出，复算输出用源码外全新空目录；候选模型按既有固定revision安装。以下在源码根执行：

```powershell
$review = 'docs/evidence/phase-5/intelligence/human-review/20261018-kkkkrui-v1/archive'
python -m services.m7_baseline.review_archive --review-sheet "$review/review-records.csv" --check-only
python -m services.m7_baseline.evaluate --review-archive $review --output-dir ../reviewed-baseline-result
python -m services.m7_semantic.evaluate --review-archive $review --model-dir ../m7-bge-fixed --output-dir ../reviewed-candidate-result
```

基线和候选使用各自锁定环境。新运行可用本目录archive，但不能伪造为在旧ca5a884工作树中已经存在此新增目录。本次原执行的归档位于源码外，由同一manifest哈希关联。

**必须显式传 --review-archive。** 原data/资产保留草稿；未传该参数的旧verify/默认评估仍读取原草稿，输出pending有其真实含义。不要批量篡改旧日志使其显示当时已人审，也不把现有full verify声称为审核后新跑的结果。新recording与旧技术回归分别保留。

## 仍待完成

M8独立互审、正式评估数据/切片与封存、发布全链路、M10独立执行及M1冻结仍须原负责人完成。原合成小池的指标上限不因审核归档而改变；不得改门槛/复制请求凑数/改历史报告冒充效果达标。

另核对：P4 PR #107已于2026-10-18合并到phase4/intelligence-models（d497d62995899a2784d613814c26399bb364d943）；phase4/integration仍为6df25176，不等于阶段已收口。
