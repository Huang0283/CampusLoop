# 前端每日 Git 工作流模板

适用成员：M2、M3、M4。本文中的分支名称以当前阶段 Issue 为准；第二阶段集成分支为 `phase2/frontend-integration`。

## 一、分支关系

```text
main
└── phase2/frontend-integration
    ├── task/m2-auth-shell-integration
    ├── task/m3-market-wanted-integration
    └── task/m4-transaction-realtime-integration
```

- `main`：最终稳定分支，只接收验收通过的汇总 PR。
- `phase2/frontend-integration`：前端组集成分支，由 M2 维护。
- `task/*`：个人任务分支，成员只在自己的任务分支开发。
- 个人 PR：`task/* -> phase2/frontend-integration`。
- 阶段汇总 PR：`phase2/frontend-integration -> main`。
- 禁止直接向 `main` 或集成分支推送个人功能代码。
- 禁止对共享分支 force-push 或 rebase 改写历史。

## 二、第一次创建任务分支

只在任务开始时执行一次：

```bash
git fetch origin
git switch phase2/frontend-integration
git pull --ff-only origin phase2/frontend-integration
git switch -c task/<成员编号>-<任务名称>
git push -u origin task/<成员编号>-<任务名称>
```

任务分支必须从最新集成分支创建，不能从旧任务分支或本地过期的 `main` 创建。

## 三、每天开始工作

```bash
git fetch origin
git switch task/<成员编号>-<任务名称>
git pull --ff-only origin task/<成员编号>-<任务名称>
git merge origin/phase2/frontend-integration
git status
git branch --show-current
```

这组命令依次完成：获取远端更新、切换到自己的分支、拉取自己的最新提交、合并前端集成分支、检查工作区和当前分支。

发生冲突时先查看：

```bash
git status
```

手动解决每个冲突并检查文件内容，然后执行：

```bash
git add <已解决的文件>
git commit -m "chore: resolve merge conflicts"
```

不得使用 `git reset --hard`、`git push --force` 或删除他人代码来回避冲突。无法判断正确内容时，在提交前邀请相关文件负责人确认。

## 四、开发前确认

- [ ] 当前分支是自己的 `task/*` 分支。
- [ ] 已合并最新 `origin/phase2/frontend-integration`。
- [ ] 今日任务对应 Issue 中的本人职责和交付物。
- [ ] 接口字段、状态、权限和错误码已有确认依据。
- [ ] 需要修改共享文件时，已在 PR 中标明影响范围。
- [ ] 没有跨范围重写其他成员负责的页面。

## 五、开发过程中提交

完成一个可以独立说明和检查的小功能后提交一次：

```bash
git status
git diff
git add <本次相关文件>
git commit -m "feat: 描述本次完成内容"
```

提交信息示例：

```text
feat: integrate login api
feat: add wanted market filters
fix: handle image upload failure
fix: enforce order action permissions
docs: update frontend state matrix
```

不要使用 `update`、`修改`、`最新版` 或 `test` 这类无法说明改动目的的信息。不要默认使用 `git add .`，先明确本次需要提交的文件。

## 六、每天推送前检查

在项目的 `frontend` 目录执行：

```bash
npm run lint
npm run build
```

Windows PowerShell 如果因执行策略无法运行 `npm.ps1`，使用：

```powershell
npm.cmd run lint
npm.cmd run build
```

回到项目根目录检查：

```bash
git status
git diff --check
```

确认没有 `.env`、密钥、账号密码、`node_modules/`、`dist/`、浏览器缓存、临时截图或调试日志后推送：

```bash
git push origin task/<成员编号>-<任务名称>
```

每天结束前至少推送一次可构建版本，避免工作只保存在个人电脑。

## 七、创建或更新 PR

个人任务 PR 的目标分支必须是 `phase2/frontend-integration`，不能直接选择 `main`。

PR 描述使用以下模板：

```markdown
## 对应任务

- Issue：#<编号>
- 负责人：M<编号>

## 完成内容

- 完成的页面和功能：
- 接入的接口：
- 串联的用户流程：

## 可验证产物

- 页面路径：
- 代码路径：
- 文档路径：
- 截图或录屏：

## 五类状态

- 加载：
- 空数据：
- 成功：
- 失败：
- 无权限：

## 跨组确认

- 已确认事项：
- 未确认事项：
- 阻塞项及负责人：

## 自检

- [ ] 已同步最新 phase2/frontend-integration
- [ ] npm run lint 通过
- [ ] npm run build 通过
- [ ] 页面已实际验证
- [ ] 没有提交密钥、环境文件、构建产物或临时文件
- [ ] 没有把 Mock 标记为真实联调
```

同一个任务继续开发时，继续推送同一任务分支即可更新现有 PR，不要每天重复创建 PR。

## 八、Review 和合并规则

- 每个任务 PR 至少需要另一名前端成员 Review。
- 认证和权限变更邀请 M5 确认。
- 商品、求购、报价和订单状态变更邀请 M6 确认。
- 搜索和匹配结果变更邀请 M7 确认。
- 价格建议变更邀请 M8 确认。
- 双账号和异常流程邀请 M10 确认可测试性。
- Review 意见处理完、检查通过后，才能合并到集成分支。

## 九、每天结束时记录

在任务 Issue 或 PR 留言：

```markdown
## 每日进度 YYYY-MM-DD

- 今日完成：
- 当前分支：
- 最新提交：
- 验证结果：
- 当前阻塞：
- 明日计划：
```

如果当日工作未完成，也要提交并推送边界清楚、能够构建的版本；不可提交会破坏集成分支的半成品，然后要求负责人直接合并。

## 十、阶段结束

所有个人 PR 合并后，由 M2 更新集成分支并统一验证：

```bash
git fetch origin
git switch phase2/frontend-integration
git pull --ff-only origin phase2/frontend-integration
cd frontend
npm run lint
npm run build
```

Windows PowerShell 可将最后两条 `npm` 命令替换为 `npm.cmd`。随后验证本阶段 Issue 规定的核心用户流程，创建 `phase2/frontend-integration -> main` 汇总 PR。

汇总 PR 合并后，在 Issue 中记录任务 PR、汇总 PR、最终提交、构建结果、验收结论和遗留问题。确认任务分支不再使用后，才删除已合并的远端任务分支。
