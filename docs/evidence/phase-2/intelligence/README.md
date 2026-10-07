# M7 Phase 2 · v1.1 候选交付

本目录提供 AI2-01—05 的数据、设计和可执行规格；本次提交用于评审，不代表阶段验收或线上功能完成。

- [完整 v1.1 交付包](packages/CampusLoop_M7_Phase2_AI2-01_05_v1.1.zip)（保留原包和 FILES.sha256.json）
- [五项交付清单](deliverables.md)
- [数据 schema](search-data-schema.md)、[标注记录](search-labeling-record.md)、[划分与哈希](search-split-manifest.md)
- [搜索/匹配服务契约](search-service-contract.md)、[匹配任务契约](matching-task-contract.md)
- [换行问题修订说明](portability-review.md)、[接收清单](contract-handoff.md)
- [本轮原始运行记录](../../../../evidence/portability-v1.1/run-record.json)

压缩包 SHA256：`4a2b667bbc9c650df7e91dda1ad4d09cc337546c871b00642b9b542eb03fc365`。

## 从仓库复现

使用 Python 3.12，在仓库根目录执行：

```text
python -m pip install --index-url https://pypi.org/simple --only-binary=:all: -r scripts/m7_phase2/requirements.txt
python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m7_phase2 -p test_contracts.py -v
python scripts/m7_phase2/contract_check.py
python scripts/m7_phase2/pipeline.py verify
```

本地验证：28 项数据测试、53 项契约测试、22 个样例通过；LF/CRLF 默认写入模拟和 Git autocrlf=true/false 实际检出均通过。没有 Linux/macOS 实机执行记录；没有真实数据库/队列/HTTP/通知联调。

## 上传与接收状态

分支基准为最新 phase2/integration 的 40173f8b31223e956fa4b247da513e8398385e16。组分支为 phase2/intelligence-contracts，个人提交为 task/m7-p2-search-dataset-contract，当前通过 PR #71 交叉评审。

包内文档和历史运行记录中“未提交/未推送”指生成归档时的状态，保留原文用于追溯；当前上传状态及真实提交号以本 PR 和 Git 历史为准。测试用临时 Git 仓库的提交不是项目交付提交。

仍待完成：228 对候选标签人工复核、M3/M6/M9 契约签字、M8 互审及 M1 阶段接收。M10 曾记录 M7 个人技术复现；包含 M8 和本次新增内容的联合独立验收仍待执行。不关闭 Issue #22，不合并 main。

## M8 Phase 2 候选交付

M8 已补充 AI2-06—08 以及 AI2-09/10 的可执行候选内容：

- [M8 交付清单](m8-deliverables.md)
- [价格数据 schema](price-data-schema.md)
- [价格规则评估集](price-evaluation-dataset.md)
- [价格/信誉/风险契约](price-trust-risk-contract.md)
- [统一评估运行手册](evaluation-runbook.md)
- [Phase 4 启用门槛](model-go-live-gates.md)
- [M8 验证记录](m8-verification.md)与[交接/阻塞](m8-handoff.md)

当前价格数据只有 12 条 L0 合成边界样本、L3 真实完成交易标签为 0，故预测指标明确为 `NOT_EVALUATED`。M3/M5/M6/M9 契约确认、M7 互审、M10 独立复现和 M1 门槛批准仍需由本人完成；在此之前不关闭 Issue #22。

## 2026-10-08 联合任务技术补齐

M8 PR #82 已于 2026-09-30 合并到智能组分支 `010e187`。本轮基于该提交推进 AI2-09/10：

- [联合复现手册与指标输入口径](evaluation-runbook.md)
- [联合复核与验证证据](joint-verification.md)
- [模型候选门槛与待签字项](model-go-live-gates.md)
- `scripts/intelligence_phase2/`：只读重建、统一运行记录、搜索/匹配指标骨架与门槛缺项检查。

AI2-09 的技术交付已补齐，M10 干净环境独立验收待执行；AI2-10 的候选数值与自动 NO_GO 检查已补齐，正式封存数据、资源环境确认及本人签字待完成。脚本通过不等于模型启用。
