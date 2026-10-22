# MQ4-08：发布候选基线与 Phase 5 起点

当前候选集成提交：`phase4/integration` `018ba69ea73987f2a6febc716b634416d4049727`。`main` 当前提交：`2eb166897fa1953b4514eef72b6d06baa869cf34`，仍不含 Phase 4。不得把组分支 tip 写成已发布/正式冻结版本。

## 候选内容

- 四组 Phase 4 汇总、治理/Worker/前端能力和 M7 评估档案修复已集成。
- 正式功能路径保留业务基线、关键词搜索、规则价格/信誉和管理员人工风险处理。
- M7 语义候选、M8 学习型价格回归均 NO_GO，不能作为产品默认结果或宣传能力。
- 最新 `018ba69` 的 CI success；M10 新运行细节见 `m10-verification.md`。

## 正式收口动作（尚未发生）

1. PR review 确认此范围及 M10 验收记录。
2. M1 创建从 `phase4/integration` 至 `main` 的唯一阶段收口 PR，并实际合并。
3. 记录实际 main merge SHA，基于它创建合法 Phase 4 tag（例如仓库统一采用的 `phase4-freeze` 命名；先检查冲突，不覆盖已有 tag）。
4. 真实第四次汇报完成后，将日期、参与者、演示提交、问题与负责人写入会议记录。
5. 用合并 SHA/tag 更新 `freeze-candidate.json` 并重跑 freeze gate；依 issue 关闭条件处理 #29/#30/#31/#33。

任何步骤未发生前，本文件均只是收口 PR 的候选基线。Phase 5 分支应从最终 main 冻结提交创建，不从该尚未合并的候选 tip 创建。
