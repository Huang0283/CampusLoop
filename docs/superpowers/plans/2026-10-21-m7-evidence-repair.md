# M7 第四阶段证据修复计划

**目标：**修复 #115 合并后的交付完整性问题，明确正式评估剩余任务，保留 NO_GO。

**依据：**`docs/issues/intelligence-phase-4-model-integration-evaluation.md`、`docs/evidence/m7-evaluation/README.md`，验收基点 `ad2bfc8056babb88af6b3590aea3d615ee95721e`。

**约束：**在原项目目录的独立分支执行；不改业务服务、模型、标签、实际时间、审批和测试集；不代替 M8 审核；不直接合并 main。

- [x] 新增实际交付文件哈希与 JSONL 本地确认引用的回归检查，先确认原交付失败。
- [x] 保留用户修订 Excel，按实际文件刷新清单；新增历史修订说明，恢复可追溯确认章节而不编造原始声明。
- [ ] 扩大现有协议 CI 的路径触发范围至评估证据。GitHub 当前 OAuth 凭据缺 workflow 权限，远端明确拒绝此项；已撤下工作流改动，现有 CI 仍因新增脚本测试触发。本项待有权限的维护者更新，不计作本次完成。
- [x] 写明数量复算、来源方案、独立审核、分组切片、封存及首次对比的接收顺序；明确测试通过不等于模型准入。
- [x] 运行协议及基线/语义回归、数据准入拒绝检查、独立代码复核；交付修复将通过 PR 提交到 phase4/integration。

本地结果：28 项协议/交付、38 项基线、34 项语义模块测试通过；草稿保持 NOT_READY。独立复核未发现 Critical/Important 问题，文案历史范围意见已修正并重跑交付检查。分支 `fix/m7-p4-evaluation-evidence`，不包含用户未跟踪的报告和 PDF。

发布分支：`fix/m7-p4-delivery-integrity`。原本地草稿分支保留审计轨迹；发布为不含工作流变更的单一提交，不改写远端历史。

验收命令：`python -m unittest discover -s scripts/m7_evaluation/tests -v`；`python -m unittest discover -s services/m7_baseline/tests -v`；`python -m unittest discover -s services/m7_semantic/tests -v`。草稿 `check` 仍须 NOT_READY；这是未满足真人输入条件的预期结果。
