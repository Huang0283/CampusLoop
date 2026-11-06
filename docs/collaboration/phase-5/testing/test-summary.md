# 测试汇总（test-summary.md）

给 R1/D1 写可信结论；数值回到各岗位原日志，不在此代填。

## 软件与环境

- T1：修复分支 fix/session-token-validation、PR #154 等（以 T1 原日志为准）
- T2：`78ae89a8d66789670056ffab726eebce2362efa4`；business/run1（UI 5184 / API 18024）
- T3：`d063588c3be59b1e9f013ff27e2a541cc03fed62`；environment-recovery

## 五类计数（计划总数 168）

| 岗位 | 计划 | 通过 | 失败 | 阻塞 | 未执行 | 不适用 |
|---|---|---|---|---|---|---|
| T1 | 48 | 见 T1 原日志 | 见 T1 原日志 | 1 | ≥3 | 0 |
| T2 | 84 | 33 | 0 | 0 | 51 | 0 |
| T3 | 36 | 0 | 0 | 0 | 36 | 0 |
| 合计 | 168 | 待各岗位核对 | | | | |

## 实际指标 / 证据 / 限制

- T2 证据：`business-journeys/execution-log.csv` + `business-journeys/evidence/`（S01–S12、三条链截图）。
- 限制：T3 未执行；T2 剩余 51 条未执行；T1 C36 阻塞。
