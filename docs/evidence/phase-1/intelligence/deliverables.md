# M7 Phase 1 交付清单

版本：m7-p1-v1.1；日期：2026-09-23。交付状态：本地候选文档已生成，等待团队评审。未推送、未创建 PR、未签字、未关闭阶段 Issue。

## 1. 本次范围

依据用户提供的《CampusLoop_M7_技术与任务进度文档》及仓库第一阶段任务，将“第一部分”按 Phase 1 可行性与规则设计整理。交付包含五项 M7 设计、共同记录和 M7 能力决策补充。可运行业务功能属于后续 Phase 3，本次未声称完成。

| 任务 | 文件 | 本次产物 | 正式验收剩余条件 |
| --- | --- | --- | --- |
| AI1-01 | [search-requirements.md](search-requirements.md) | 页面/后端候选映射、参数边界、12 个需求场景 | M3/M5/M6 确认 |
| AI1-02 | [keyword-baseline-design.md](keyword-baseline-design.md) | 分词、字段权重、排序分页、手算 | M8 互审、M10 复核 |
| AI1-03 | [matching-baseline-design.md](matching-baseline-design.md) | 硬约束、软因素、解释、10 个资格案例 | 成色/地点/状态冻结 |
| AI1-04 | [matching-lifecycle.md](matching-lifecycle.md) | 事件、原子版本检查、去重、10 个故障场景 | M4/M5/M6/M9 确认 |
| AI1-05 | [search-evaluation-plan.md](search-evaluation-plan.md) | 资产、标注、划分、指标、公式算例 | M8/M10 复核；真实数据准入 |
| AI1-11（M7 部分） | [capability-decision-matrix.md](capability-decision-matrix.md) | 追加搜索/匹配决策说明和字段差异 | M7/M8 互审、M1 定案 |
| 共同记录 | [verification.md](verification.md) | 核查范围、可复核步骤、真实检查结果 | 独立验收仍待执行 |
| 共同记录 | [handoff.md](handoff.md) | 缺口、Owner、接收动作与期限门禁 | 接收人实际确认 |
| 本轮意见处理 | [review-resolution.md](review-resolution.md) | 截图第 2—6 条的判断、修改及仍未满足项 | 流程缺口不因文字修改而关闭 |
| 可复跑自检 | `scripts/m7_phase1/self_check.py`（完整交付包内） | 文档/链接检查、合成公式验算、环境和原始日志 | 仅自检，不替代 M8/M10 复核 |

M8 已有价格、信誉和风险五份技术材料不属于本次新增交付；共享矩阵仅追加本次 M7 候选补充，不宣称他人批准。

## 2. 仓库核查基准

通过远程分支清单及 Git 克隆读取，不使用网页缓存推断实时进度。

| 来源 | 已核查版本 | 用途 |
| --- | --- | --- |
| main | `6046bc24819ada6461f995f6ec7312dfaf88e6a3` | 对照主分支 |
| phase1/intelligence | `15d6dd52f6c960164619e55979f9ad3bc89cbee7` | 本地工作基准、任务要求、M3 原型与 M8 材料 |
| phase1/backend-platform | `4d204c599e30bcfb358bf1b511961359a91b92a6` | M9 的 ER 候选设计 |

本地任务分支为 `task/m7-p1-search-feasibility`，从上述智能组提交创建；新增材料尚未提交，不能把基准 SHA 写成本次交付的提交号。读取远程列表时未见 `phase1/integration`，其创建/收口由 M1 确认。

## 3. 可追踪来源

- [AI-P1 任务文件](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/docs/issues/intelligence-phase-1-feasibility-baselines.md)：任务编号、五份交付及阶段边界。
- [M3 页面字段](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/docs/frontend/m3/01-market-fields-interactions-and-states.md)：搜索、状态、交互及降级。
- [商品市场原型](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/frontend/src/pages/market/index.tsx)：分类、成色、学校、排序的具体值。
- [求购表单原型](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/frontend/src/pages/wanted/PublishWantedPage.tsx)：预算、成色、学校、日期及未持久化提交流程。
- [匹配结果原型](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/frontend/src/pages/wanted/MatchResultPage.tsx)：静态 matchList，不作算法证据。
- [M8 共享矩阵](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/docs/evidence/phase-1/intelligence/capability-decision-matrix.md)：基线及候选降级政策。
- [M9 ER 候选](https://github.com/Huang0283/CampusLoop/blob/4d204c599e30bcfb358bf1b511961359a91b92a6/docs/evidence/phase-1/backend-platform/er-candidate.md)：金额、状态、实体及缺失字段。

## 4. 本次新增发现

后端候选以 NUMERIC(10,2) 存元，M7 用整数分需适配；两页面成色枚举不统一；学校不等于面交地点；求购候选表缺成色/地点，商品与求购缺单调版本；M3/M8 匹配降级表述不一致。M9 文档提到的 OpenAPI、迁移和 M6 实体字典在本次所查后端分支相应路径未见，不当作已存在实现。

ER 中 vector(768) 也是设计候选；不据此冻结未来模型维度，需随实际模型输出确定。未修改 M8 技术结论或后端源文件。

## 5. 跨阶段编号出处

以下编号已在 [AI-P2 数据集、评估与服务契约](https://github.com/Huang0283/CampusLoop/blob/15d6dd52f6c960164619e55979f9ad3bc89cbee7/docs/issues/intelligence-phase-2-data-evaluation-contracts.md) 中核实。AI-P1 不重复列出 AI2 编号不代表编号不存在；本包仅前瞻引用，不将其视为 Phase 1 已完成项。

| 编号 | 任务含义 | 交付物 |
| --- | --- | --- |
| AI2-03 | 固定划分、种子、哈希及泄漏检查 | search-split-manifest.md |
| AI2-04 | 冻结搜索/匹配输入输出、解释、版本、超时及降级 | search-service-contract.md |
| AI2-05 | 触发、幂等、结果版本、通知和落库字段 | matching-task-contract.md |
| AI2-09 | 可重复数据生成/检查和指标计算脚本骨架 | 脚本、evaluation-runbook.md |
| AI2-10 | 开发前签数值门槛、延迟/资源上限和降级必测项 | model-go-live-gates.md |

本轮附带的 Phase 1 文档自检脚本只核查文件和手算公式，不宣称完成 AI2-09 的数据校验及通用评估骨架。
