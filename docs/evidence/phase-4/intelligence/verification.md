# Phase 4 智能功能组验证入口

本轮只验证 PR #97 的 M8 交付及其修复，尚不构成智能组整体冻结验收。

## 操作与通过条件

1. 检出修复 PR 提交，从根目录按 [m8-verification.md](m8-verification.md) 执行统一验证器，使用新的空输出目录。
2. 确认三套测试均成功且用例数非零，日志存在，运行记录中的 SHA-256 与文件相符；本轮实际结果为 Phase 2 14 项、Phase 3 31 项、Phase 4 23 项。
3. 确认 `readiness.json` 为 `NO_GO`，逐样本比较输出的 12 个 L0 回退样本均保持 Phase 3 规则结果；无 L3 标签时不得将未评估指标改成数值。
4. 查看 Phase 3 HTTP 测试日志，确认价格、信誉和风险的正常、空结果、缺字段、坏 JSON、版本错误、超时及服务停止均经过真实回环 HTTP 验证。
5. 在专用数据库执行 M8 后端兼容性检查，确认两个集成用例真正执行且零跳过，价格/信誉/风险公开 DTO 与权限边界仍符合原接口。环境及记录见 [后端运行记录](evidence/m8-backend-compat-v1/run-record.json)。
6. 核对 [handoff.md](handoff.md) 中的接收人、未完成事项和截止门禁。只有本人实际确认后的接收结论才可改为通过。

## 原始证据

- [M8 三阶段运行记录](evidence/m8-acceptance-v2/run-record.json) 与对应 `.txt` 日志。
- [M8 后端兼容性记录](evidence/m8-backend-compat-v1/run-record.json)。
- [main 前三阶段运行检查](phase123-runtime-review.md)，使用独立数据库、对象存储和浏览器，不与原演示环境共用数据。

## 当前结论

M8 技术修复通过本轮测试，可提交评审。候选模型上线决策仍为 `NO_GO`。M7 任务、实际部署与独立冻结验收未由此文档批准；#31 保持打开，第四阶段也尚未合并到 `main`。
