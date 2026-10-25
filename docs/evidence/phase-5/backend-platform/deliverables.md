# Phase 5 交付清单（仅 M6 已填写）

日期：2026-10-23；个人分支 task/m6-p5-business-hardening。
基线 2eb166897fa1953b4514eef72b6d06baa869cf34；内容指纹 evidence/m6-source-sha256.json。尚未产生任务 PR/合并提交，后续由 M5 补记。

| 任务 | 交付物 | 状态 |
| --- | --- | --- |
| BP5-03 | business-invariant-report.md；business.py/transactions.py 修复；test_p5_business_contract.py、test_p5_integration.py | 本地检查完成，真实数据库验收待执行 |
| BP5-04 | realtime-ai-regression.md；ai_adapters.py、matching_jobs.py 及调用侧；test_ai_orchestration.py、智能/队列回归扩展 | 单元/RPC 通过，持久化与真实 WS/E2E 待验收 |
| BP5-05 | final-api-documentation.md；OpenAPI/生成 SDK；test_p5_api_examples.py；examples/m6-api-examples.json | 候选 0.5.0-rc.1，M5 路由未集成 |
| 复验工具 | scripts/m6_phase5/verify.py；evidence/ 日志、JUnit、摘要 | 已提供，严格模式拒绝 skip/xfail |
| BP5-10 M6 部分 | release-verification.md、verification.md、handoff.md、m6-pr-body.md | 已整理，全组签收未完成 |

源码和测试保留原目录；报告、示例、证据统一在本目录。M5/M9 内容与全组通过状态由各 Owner 补充，不能据此关闭全阶段 Issue。
