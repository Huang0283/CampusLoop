# AI4-10 独立复核交付与原负责人确认

准备人：M7；日期：2026-10-17。本文件是待原负责人接收的交付，**不是 M10 签字**。用户已选择原 M8/M10/M1 分别确认。

## 可核对的事实

- 历史 M10 在 e4dc076 上的独立诊断已存在：38/26/12 请求、严格公式核对一致、结论 NO_GO、freezeApproved=false；原文与提交哈希见 evidence/joint-v1/m10-historical-*。该记录只证明当时的候选，不替代 c775 新提交验收。
- 当前干净 Git 基准 c775ccc 的联合验证通过，M7/M8 实际模型/规则各自保持原口径；M7 原数据、划分、标签和配置未改。完整命令、环境、逐请求结果、失败类别和输出哈希在 evidence/joint-v1/technical。
- 当前独立公式重算复用固定 M10 实现的 strict_check，不调用其 main、不生成“在 M10 请求下执行”的假归属。all/dev/test_candidate 的严格 MRR/Recall/P@5 容差 1e-12，重复评估一致；这是 M7 作者执行，humanIndependentExecution=false。证据见 formula-recalculation.json。
- 原 M10 坏返回探针在当前干净基准重放，18/18 PASS；源字节不变，仅显式绑定目标 checkout 的模块和 ROOT。记录明确 M7_AUTHOR_REPLAY_NOT_M10_SIGNOFF；Windows 故障注入导致的服务端断连堆栈保留，不删失败痕迹。

## M10 实际接收步骤

1. 从 PR/正式阶段最终 Git 提交干净检出，核对 codeCommit、工作树、模型/数据/依赖哈希，不能拿无 .git ZIP 代替。
2. 使用 [联合命令](joint-delivery/deployment-and-rollback.md) 新建独立输出目录，记录由谁、何时、何环境执行，检查每步退出码和所有子记录。
3. 独立重算三个 split，核对原始逐请求列表、U/过期/无答案和失败类别；不更换测试集/阈值，不将 12 条 test_candidate 称为已封存测试。
4. 复跑超时、停服务、坏 JSON/结构、无认证/错误 token、旧输入、候选关闭，以及 M8 低置信/无结果/人工边界。M9 发布环境/资源证据另行接收。
5. 核对当前改动是否满足历史 DEF-P4-01/02 的搜索客户端相关复测；旧记录不能被作者直接改成关闭，由 M10 记录复测结论。
6. 在原负责人确认表中记录实际结论及证据链接，再交 M1 决定保留基线/实验展示/正式集成和阶段冻结。

## 当前状态

技术证据准备完成；M8 已在 `f1b9b7519b51d896c09d36e391632d9460da1940` 完成交叉评审并确认 NO_GO；M10 最新独立执行和签署、M1 决定仍 PENDING。不能将公式的独立实现误写成执行人的独立验收。

## 独立公式重算入口

准备固定 M10 检出和本轮模型两次输出，执行下列诊断脚本；尖括号路径需替换。脚本核对 M10 原源码字节、目标 Git 提交与每个源哈希，运行独立公式，拒绝覆盖旧结果；成功也只记录 formalAcceptance=false，不自动签名。

```text
python docs/evidence/phase-4/intelligence/joint-delivery/recalculate_metrics.py --checkout <tested-checkout> --first <joint-run>/m7-semantic/evaluation --repeat <joint-run>/m7-semantic/evaluation-repeat --auditor <m10-checkout>/scripts/quality_phase4/archive_evaluation.py --output <new-recalculation.json>
```
