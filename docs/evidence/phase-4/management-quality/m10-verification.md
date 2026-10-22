# MQ4-03/04/05：M10 第四阶段独立质量验收

验收基线：`phase4/integration`，提交 `018ba69ea73987f2a6febc716b634416d4049727`。验收日期：2026-10-22。执行人：Codex，依 M10/M1 任务负责人在本轮明确授权执行；本记录仅记录可复现技术检查，不冒充线下签字或未举行的汇报。逐项原始日志和 JSON 位于同目录 `m10-2026-10-22/`。

## 验收结论

- 当前阶段集成的技术验证通过：Phase 4 智能基线/规则/联合部署检查通过；M7 数据协议 28/28 通过；M7/M8 RPC 正常、超时、关闭、坏结构、坏 JSON 等故障场景 18/18 安全返回；前端原型、lint、production build、OpenAPI SDK 生成/类型和生成漂移检查通过。
- M7 语义候选仍为 `NO_GO`：现有 AI 起草数据不是经授权、独立人工标注并封存的正式测试集；在当前候选评估中搜索提升为 0，搜索 Precision@5 为 0.5，低于候选门槛 0.7。不得将 288 个查询或 20,736 个查询—商品判断对误写成独立真实用户查询/标签。
- M8 价格回归仍为 `NO_GO`：合格 L3 成交标签数为 0，尚无满足训练/评估门槛的数据。保留已验证的规则价格、信誉中性和人工风险线索；不声称预测准确率、成交概率或自动处罚。
- 后端完整 118 项隔离数据库回归、24 项浏览器旅程属于提交 `87750c1` 的历史集成审计证据；未在本次 Windows 环境声称重新运行（本机 Python 3.14.7 未安装 pytest，且未启动新的隔离审计数据库）。最新 `018ba69` 另有 GitHub CI 的迁移/种子/后端测试、前端构建以及 Windows/Linux M7 协议检查通过。
- 技术建议：接受“保留规则基线、M7/M8 模型不进入正式路径、以后由测试组按授权采集和封存真实评估集”的第四阶段交付边界。当前可合并代码候选；这不等于模型 Go，也不证明真实数据评估完成。

## 本次新运行记录

源码提交固定为 `018ba69ea73987f2a6febc716b634416d4049727`；运行环境 Windows 11、Python 3.14.7、Node v24.21.0。

| 检查 | 实际结果 | 原始证据 |
|---|---:|---|
| `python -m services.intelligence_phase4.verify --output-dir ...` | PASS；M7 基线、M8 Phase 2/3/4 回归、联合部署 smoke、M7 语义私有单测均 exit 0；其中 M8 规则/回归 14+31+29 项 | `m10-2026-10-22/intelligence-run-record.json` 及同目录 stdout |
| `python -m unittest discover -s scripts/m7_evaluation/tests -v` | 28/28 PASS | `m10-2026-10-22/m7-protocol-tests.stderr.txt` |
| `python scripts/quality_phase4/probe_rpc_degradation.py --output ...` | 18/18 PASS、0 FAIL；Windows 故意超时断连会打印服务器 `ConnectionAbortedError`，探针结果仍是全部预期安全降级 | `m10-2026-10-22/rpc-fault-observations.json` |
| `node scripts/maintenance/verify_frontend.mjs . ... 018ba69...` | 原型、lint、构建、SDK 检查、SDK drift 5/5 PASS | `m10-2026-10-22/frontend-run-record.json` 和对应日志 |
| `python scripts/quality_phase4/check_archived_evidence.py` | PASS；仅证明归档哈希与独立指标复算一致，不证明候选优于基线 | 命令输出；M7 最新交付由 PR #115/#116 的 CI 覆盖 |

`python -m pytest` 本机不可运行：环境不存在 pytest 模块；没有用安装/重置项目环境代替检查，也没有触碰日常数据库。最新远端 CI run `39609311107`（`018ba69`）结论 success；PR #116 五个 CI job 全部 success。

## 冻结范围与安全边界

1. 搜索与供需匹配正式保留关键词/结构化硬约束基线；语义/hybrid 只作为隔离实验，不调用为正式生产排序。
2. 价格建议、信誉和风险提示正式保留规则实现；风险结果只给管理员人工复核。
3. 智能服务关闭、超时或返回无效数据时采用已验收的安全降级；不回滚商品发布/订单事实，不重复通知，不暴露私密治理信息。
4. 后续测试组负责在 M1 批准数据来源/授权/标签方案之后，建立真实代表性测试集、独立双人标注/仲裁、无泄漏划分和封存流程；先报告数据合规、样本数和切片覆盖，再由 M7/M8 评估、M10 独立复核。达到各自门槛前，继续 `NO_GO`。不把 Phase 4 没有的真实数据评估当作已完成交付。

## 不能由自动证据替代的步骤

- 课程/组内现场第四次汇报没有在本次工具验收中发生；`fourth-presentation-package.md` 是讲稿，不是会议记录。M1 如完成真实汇报，应补记日期、在场人、演示提交、问题与负责人；否则保持待办。
- 对本次 M1 范围决定和 M10 验收意见的最终人工确认，应由本人在 PR 中确认。当前记录准确标为代理按授权执行，不声称有电子/线下个人签名。
- 是否打正式阶段 tag、关闭 #29/#30/#31/#33，须在阶段 main PR 合并且实际汇报记录补齐后执行；本提交不自动关闭 Issue。
