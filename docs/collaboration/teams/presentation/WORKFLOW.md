# 最终演示与提交组：每日 Git、提交、PR 与 Review

长期组分支：`team/presentation`。本组任务见 [TASKS.md](./TASKS.md)。完整交接见 [每轮升级验收工作流](../../../workflows/version-acceptance.md)。四组和岗位分支由 M10 建立，组员自行认领后直接使用，不再新建同名分支。

## 1. 先认领一个岗位，确认文件边界

- **D1 PPT、课程要求与证据来源**：分支 `work/presentation/slides-evidence`，仅本人使用；编辑范围：docs/submission/presentation/ 下 CampusLoop_Final_Presentation.pptx/PDF、slides-source/、slide-evidence-index.md、submission-checklist.md；本人 changes/<变更ID>/presentation-impact.md。
- **D2 讲稿、双账号演示与视频**：分支 `work/presentation/demo-video`，仅本人使用；编辑范围：docs/submission/presentation/ 下 presentation-script.md、demo-runbook.md、rehearsal-log.md、media-manifest.md；demo-notes/ 与视频课程提交位置；本人 changes/<变更ID>/demo-impact.md。

在 #129 登记姓名、M 编号、岗位、分支、独占文件、组内复核人、本周交付和预计回报日期。复核人必须是另一位组员；本人是唯一执行人时不得伪称独立 Review。建议人数不是强制分组，若要换岗位先在 Issue 明确文件/提交/接收人，不能两个人直接在同一岗位分支工作。

岗位分支是本轮持续使用的工作分支；独立临时子任务可另建 `docs/<方向>-<成员>-<主题>`，但不是必需。一个清晰任务一个 PR，未合并时往原 PR 继续推送，不每天重复建同样 PR。岗位工作量按每周实际执行/材料/Review 检查，有失衡在 Issue 协商转交独立文件，不重叠编辑。

## 2. 首次拉取（先保存本地工作）

先检查下面两条命令；发现有未提交/未跟踪文件先确认来源并妥善保留，不能执行 reset --hard 或清理目录。将岗位变量改成自己认领的准确名称；此示例使用本组第一个岗位。

```powershell
git status
git remote -v
$campusRoleBranch = 'work/presentation/slides-evidence'
git fetch origin --prune
git switch --track "origin/$campusRoleBranch"
git branch --show-current
git log -1 --oneline
```

如果本地已经有该岗位分支，改用 `git switch $campusRoleBranch`，不要再次 --track。先确认 origin 指向 Huang0283/CampusLoop；没有 GitHub 写入权限时由仓库负责人授予协作权限，不发送个人 token。变量仅在当前 PowerShell 会话有效，重开终端需要重新设置。

## 3. 每天开始：拉取自己的提交，再同步组分支

```powershell
$campusRoleBranch = 'work/presentation/slides-evidence'
git status
git fetch origin --prune
git switch $campusRoleBranch
git pull --ff-only origin $campusRoleBranch
git merge origin/team/presentation
git status
git branch --show-current
```

每条命令确认成功再执行下一条。有未提交工作先处理；pull 提示分叉、权限/网络失败或 merge 冲突时先停下来查原因，不能继续 push，更不能用 force 推掉对方。分支同步不会替你切换正在运行的软件：测试必须另按 M10 通知检出指定软件完整 SHA/使用指定部署，记录真实运行 UI/API/Worker 版本；不能把材料分支的 main 基线当新候选。

## 4. 每天怎么做、保存哪些结果

读本轮变更和冻结状态 → 冻结前只更新草稿/来源和演示影响 → D1 核对 PPT/数字/课程清单，D2 核对讲稿/脚本/彩排与媒体 → 冻结、测试和用户任务通过后录最终版 → 交叉 Review → 记录实际时长/软件 SHA/素材哈希/问题。D1 唯一编辑 PPT，D2 唯一维护讲稿/视频日志，大视频按课程位置交付。

## 5. 只提交自己相关文件，再 push 岗位分支

```powershell
git status
git diff --stat
git diff --check
git diff
# 在下面列出自己本次实际编辑的文件，不要直接照抄占位路径：
git add -- <本人相关文件1> <本人相关文件2>
git diff --cached --stat
git diff --cached --check
git diff --cached
git commit -m "docs(presentation): describe the actual task and change ID"
git push origin $campusRoleBranch
```

以上 `<本人相关文件>` 是要替换的参数，不是可直接运行的路径。push 的目标只可为本人岗位分支。提交前检查 Markdown 可读、链接存在、文件不含乱码/冲突标记、未混入密码/真实隐私/未执行结果。测试脚本实际运行并记结果；DOCX/PDF/PPTX 导出后检查能打开、页数/图文/内容一致。文档变更不必冒充跑过所有应用测试。

push 成功后记录 commit SHA 和链接；网络失败写清失败，不报告已上传。PR 已存在时这次 push 自动更新该 PR。不要使用 git add .，不要把 .env、数据库转储、node_modules、构建缓存、临时输出或原始隐私数据放入 PR。

## 6. 如何写 PR

GitHub 点 Compare & pull request，base 选择 `team/presentation`，compare 选择本人 `work/presentation/...`，绝不能误选 main。标题写 `[协作][岗位][变更ID] 本次具体交付`，正文按下面填：

```markdown
关联：Refs #129；相关缺陷/变更 Issue：
岗位、作者、组内复核人：
个人分支 → team/presentation：
软件完整 SHA、实际环境/数据版本：
本 PR 的任务与文件；不含的生产代码范围：
输入来源、完成步骤、验证命令/实际结果与证据：
更新的正文/用例/截图；已检查未变部分：
遗留/未执行/阻塞、Owner、影响与下一反馈日期：
接收人和接收动作：
```

不要用 Closes #129 关闭整个长期协作任务；修复缺陷先 Refs，待原执行人复测确认后再关闭。CLI 用户可将同样正文存为本地 UTF-8 文件后使用：

```powershell
gh pr create --repo Huang0283/CampusLoop --base team/presentation --head $campusRoleBranch --title '[协作][岗位][变更ID] 具体交付' --body-file <本地PR正文文件>
```

正文/标题中的岗位和变更 ID 要替换为真实值。无差异时不建空 PR，先完成实际任务。可提前建 Draft，但完成前不能声称交付已通过。

## 7. Review 与合并

1. 同组另一人查看 Files changed，按 TASKS.md 检查任务与文件边界、软件 SHA/输入、事实/证据、隐私、链接、实际结果与遗留。测试审查要复现选定用例；材料审查要核对真实源文件，不只回一句“看过了”。
2. Review 写检查文件/执行场景/结果/未确认项；需要修改用 Request changes 或评论指出具体位置，作者在原分支修复并 push。同组没人可独立 Review 时登记待 Review，不由作者自己批准。
3. CI 失败先看失败日志；文档 PR 沿用仓库门禁，不跳过失败或标为已通过。当前 CI 对所有 PR 触发，team/work 的直接 push 不一定触发，不能只看 push 成功。
4. Review 与适用检查通过后，由本组登记的材料集成人或有权限负责人 merge 到 `team/presentation`。持续使用的组/岗位分支选 merge，保留 head；不自动删除，不 squash 后继续沿用旧提交链。
5. 作者下次先 fetch/pull 并 merge 本组最新分支，再开下一轮 PR。同一文件有人维护时先交接，不以开分支为理由平行改同一索引。
6. 组汇总 PR 由材料集成人按 M10 通知选择阶段集成目标；阶段结束后的日常材料才可向 main 汇总。M10 核对技术边界，独立执行/贡献签名仍由实际成员负责。main 只能通过已获授权的汇总/阶段 PR 更新。

## 8. 冲突、阻塞与删除分支

冲突先 git status，确认冲突文件和双方改动，与文件负责人商量后手动合并、逐项 git add、git commit。拿不准可 git merge --abort（只在 merge 中且确认可回退时），保留本人工作并向负责人报告。禁止整目录覆盖、选全部 ours/theirs、reset --hard、force-push 或删除他人成果来假装解决。

测试库/媒体损坏、越权或数据丢失立即停止相关写入并报 M10；不要清空日常数据。无可用输入时提交草稿/阻塞说明，可以先做不依赖的任务；不能把未运行写通过。各人的失败记录保留，修复由原执行人复测。

main 与四条 team/* 长期保留；仍在使用的 work/* 不删。一次性 docs/task/fix 分支只有合并记录、主干/标签已有成果、无开放 PR/独有提交/他人或工作树依赖后再由负责人清理。不要运行批量删除命令。原课程要求、阶段验收证据与本地未提交文档不在“清理重复说明”的范围。
