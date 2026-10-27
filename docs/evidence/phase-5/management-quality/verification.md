# M10 第五阶段验证入口

技术候选 `50108a3`；日期 2026-10-25；用户委托 Codex 执行，不代签最终质量批准。

- MQ5-03：`clean-install-report.md`，空审计库/新目录部署及实际健康回执。
- MQ5-04：`final-regression-report.md`，173 后端、49 浏览器、38/31 基线单测、18 RPC 探针。
- MQ5-05：`non-functional-test-report.md`，小规模并发、安全边界与数据库恢复及真实负例。
- MQ5-07：`final-rehearsal-report.md`，两轮技术彩排、初始失败及十分钟人工脚本。课程现场彩排/视频待补。
- 原始证据：`evidence/20261025/`；完整性清单 `evidence/20261025/FILES.sha256.json`，每个文件记录字节数和 SHA256，不包含清单自身。

复验工具：`python -m unittest discover -s scripts/quality_phase5 -p test_recovery_constraints.py -v`。实际恢复工具只在独立审计环境运行：`python scripts/quality_phase5/recovery_drill.py`；失败也会恢复原 Worker 运行状态并清理本轮随机临时库。工具不是任意生产库备份方案。

测试 SHA 与未来正式发布 SHA 不同，因此发布前必须在最终唯一提交重跑必需 CI/复现并补签收。当前证据不能代替跨组 PR 合并、模型 GO、课程材料和最终 tag。Issue #37 保持打开。
