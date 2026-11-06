# 环境与异常验证总索引（T3 唯一维护）

本文件是 T3 环境结论的**唯一入口**。其他岗位只引用本文件链接，不复制第二套结论。

## 状态

| 项目 | 值 |
|---|---|
| 本轮软件 SHA | 待执行时填写 |
| 已执行用例 | 0 / 36 |
| 通过 | 0 |
| 失败 | 0 |
| 阻塞 | 0 |
| 未执行 | 36 |
| 不适用 | 0 |

> 上表如实反映当前进度，执行后按实际结果更新，不用计划数代替通过数。

## 明细索引

| 内容 | 路径 |
|---|---|
| 36 条用例 | [environment-recovery/test-cases.md](environment-recovery/test-cases.md) |
| 执行记录 | [environment-recovery/execution-log.csv](environment-recovery/execution-log.csv) |
| 缺陷与阻塞 | [environment-recovery/defects.md](environment-recovery/defects.md) |
| 复测记录 | [environment-recovery/retest-log.csv](environment-recovery/retest-log.csv) |
| 环境构成 | [environment-recovery/environment.md](environment-recovery/environment.md) |
| 异机安装 | [environment-recovery/install-session.md](environment-recovery/install-session.md) |
| 原始日志 | [environment-recovery/logs/README.md](environment-recovery/logs/README.md) |
| 性能原始值 | [environment-recovery/performance.csv](environment-recovery/performance.csv) |
| 并发场景 | [environment-recovery/concurrency.md](environment-recovery/concurrency.md) |
| 停启与恢复 | [environment-recovery/recovery.md](environment-recovery/recovery.md) |
| 路由状态矩阵 | [environment-recovery/route-state-matrix.csv](environment-recovery/route-state-matrix.csv) |
| 组件状态结果 | [environment-recovery/component-state-results.csv](environment-recovery/component-state-results.csv) |
| 独立评估 | [environment-recovery/independent-evaluation.md](environment-recovery/independent-evaluation.md) |
| 非功能结果 | [non-functional-results.md](non-functional-results.md) |

## 移交对象

| 接收方 | 用途 |
|---|---|
| T2 | 汇总进测试总表，不重复结论 |
| M10 | 核对问题与复测 |
| U2 | 修部署与恢复手册 |
| R1 | 写有依据的性能结论 |

## 需要其他岗位注意的限制

- 本轮结论只对上面写的 SHA 生效；基线变化后受影响用例需在原 SHA 证据保留的前提下复测。
- 真实路由结果与隔离组件的模拟结果分开登记，模拟结果不算真实 API 通过。
- 未执行的用例保持“未执行”，不填估算值。
