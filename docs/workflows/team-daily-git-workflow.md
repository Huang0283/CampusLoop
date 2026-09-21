# CampusLoop 全组每日 Git 工作流模板

本文适用于 M1-M10 全体成员。每个阶段通常为 5 天；具体阶段编号、集成分支、任务范围和 DDL 以对应 GitHub Issue 为准。

## 一、四组分工与分支

| 小组 | 成员 | 集成负责人 | 标准集成分支 | 任务分支示例 | 汇总 PR |
|---|---|---|---|---|---|
| 项目管理与质量组 | M1、M10 | M1；M10 质量复核 | `phase<阶段>/management-quality` | `task/m1-project-scope`、`task/m10-test-strategy` | 集成分支 -> `main` |
| 前端体验组 | M2、M3、M4 | M2 | `phase<阶段>/frontend-experience` | `task/m2-auth-shell`、`task/m3-market-pages`、`task/m4-transaction-flow` | 集成分支 -> `main` |
| 后端与平台组 | M5、M6、M9 | M6 负责业务；M9 负责平台 | `phase<阶段>/backend-platform` | `task/m5-auth-api`、`task/m6-domain-api`、`task/m9-runtime-ci` | 集成分支 -> `main` |
| 智能功能组 | M7、M8 | M7 | `phase<阶段>/ai-feasibility` | `task/m7-search-matching`、`task/m8-price-risk` | 集成分支 -> `main` |

第一阶段使用的正式分支名称：

```text
phase1/management-quality
phase1/frontend-experience
phase1/backend-platform
phase1/ai-feasibility
```

后续阶段原则上只替换阶段编号。例如第二阶段可使用 `phase2/backend-platform`。如果阶段 Issue 已指定其他名称，例如 `phase2/frontend-integration`，以该 Issue 中记录的准确名称为准，不能一个成员使用一个名字。

所有组遵守同一层级：

```text
main
└── phase<阶段>/<小组集成分支>
    ├── task/m<成员编号>-<任务名称>
    └── task/m<成员编号>-<任务名称>
```

- `main`：验收通过的稳定成果。
- `phase<阶段>/<小组>`：小组集成和验收分支，不是个人开发分支。
- `task/*`：个人或单一任务开发分支。
- 个人任务 PR：`task/* -> 本组集成分支`。
- 小组汇总 PR：`本组集成分支 -> main`。

## 二、所有组的强制规则

1. 禁止直接向 `main` 推送功能或文档。
2. 禁止成员直接向小组集成分支推送个人任务；必须通过 PR。
3. 禁止对 `main`、小组集成分支或他人使用的任务分支 force-push。
4. 禁止在共享分支使用 rebase 改写已经推送的历史。
5. 禁止提交 `.env`、令牌、账号密码、真实隐私数据、依赖目录、构建产物、浏览器缓存和临时文件。
6. 接口、字段、状态、权限、数据库结构和智能结果口径不能由单组擅自决定，必须邀请受影响负责人评审。
7. 提交前先检查改动范围，默认不要使用 `git add .`。
8. 一个任务使用一个任务分支和一个 PR；继续开发时更新原 PR，不要每天创建新 PR。
9. 阻塞超过半天必须在 Issue 或 PR 中记录；预计无法按 DDL 完成时应尽早拆分任务，不能隐藏延期。
10. 页面截图、口头确认、Mock 数据和 README 描述不能代替构建、测试或联调证据。

## 三、阶段开始：创建小组集成分支

此步骤只由本组集成负责人执行一次。将 `<小组集成分支>` 替换为阶段 Issue 中的准确名称。

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c <小组集成分支>
git push -u origin <小组集成分支>
```

负责人随后必须把远端分支链接写入对应 Issue。集成分支必须从当时最新的 `origin/main` 创建，不能从旧任务分支、备份分支或过期本地分支创建。

## 四、任务开始：创建个人任务分支

每名成员只在任务开始时执行一次：

```bash
git fetch origin
git switch <小组集成分支>
git pull --ff-only origin <小组集成分支>
git switch -c task/m<成员编号>-<任务名称>
git push -u origin task/m<成员编号>-<任务名称>
```

分支名称示例：

```text
task/m1-requirement-baseline
task/m2-auth-shell
task/m3-market-pages
task/m4-transaction-flow
task/m5-auth-api
task/m6-order-state-machine
task/m7-search-matching
task/m8-price-advisor
task/m9-database-ci
task/m10-e2e-scenarios
```

任务分支必须从本组最新集成分支创建，不得从其他组的分支创建。

## 五、每天开始：拉取最新版本

```bash
git fetch origin
git switch task/m<成员编号>-<任务名称>
git pull --ff-only origin task/m<成员编号>-<任务名称>
git merge origin/<小组集成分支>
git status
git branch --show-current
```

这组命令依次完成：

1. 获取所有远端更新。
2. 回到自己的任务分支。
3. 拉取自己昨天或其他电脑推送的任务提交。
4. 把本组集成分支的最新成果合并到自己的任务分支。
5. 确认工作区和当前分支正确。

这里拉取的是自己的任务分支，同时合并本组集成分支。普通成员不需要每天直接把 `main` 合并进任务分支；由组负责人负责将必要的 `main` 更新同步到小组集成分支。

## 六、发生合并冲突

先查看冲突文件：

```bash
git status
```

逐个打开冲突文件，确认应保留的双方内容。处理完成后：

```bash
git add <已解决的文件>
git commit -m "chore: resolve merge conflicts"
```

无法确定正确内容时，先联系对应文件负责人。不得通过以下方式回避冲突：

```text
git reset --hard
git push --force
删除对方代码
重新复制整个旧目录覆盖新版本
```

## 七、开发前确认

- [ ] 当前在自己的 `task/*` 分支。
- [ ] 已同步自己的远端任务分支。
- [ ] 已合并本组最新集成分支。
- [ ] 今日工作属于 Issue 中分配给本人的任务和交付物。
- [ ] 依赖的字段、状态、权限或指标已有确认依据。
- [ ] 需要修改共享文件时，已明确影响范围和评审人。
- [ ] 没有未经沟通跨范围重写其他成员负责的内容。

检查命令：

```bash
git status
git branch --show-current
git log -3 --oneline
```

## 八、开发过程中提交

完成一个边界清晰、能够说明和检查的小功能后提交一次：

```bash
git status
git diff
git add <本次相关文件>
git commit -m "<类型>: <本次完成内容>"
```

常用提交类型：

| 类型 | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档修改 |
| `test` | 测试新增或修改 |
| `refactor` | 不改变功能的代码重构 |
| `chore` | 构建、配置和维护工作 |

示例：

```text
docs: update requirement traceability
feat: integrate login api
feat: add order state transition service
feat: implement keyword search baseline
test: add two-account transaction scenarios
fix: handle image upload failure
chore: add backend lint job
```

不要使用 `update`、`修改`、`最新版` 或 `test一下` 等无法说明目的的信息。

## 九、每天推送前检查

所有成员先执行：

```bash
git status
git diff --check
```

然后执行本组适用的检查。实际命令以仓库和阶段 Issue 为准。

| 小组 | 最低检查 |
|---|---|
| 项目管理与质量组 | Markdown 文件可读；链接、负责人、DDL、状态和术语一致；无占位符遗漏 |
| 前端体验组 | `npm run lint`、`npm run build`，并实际打开受影响页面 |
| 后端与平台组 | 后端格式/静态检查、相关测试、迁移检查；环境或 CI 变更需验证可重复运行 |
| 智能功能组 | 运行相关脚本或测试；记录数据版本、参数、随机种子、指标与降级结果 |

Windows PowerShell 如果因执行策略无法运行 `npm.ps1`，前端使用：

```powershell
npm.cmd run lint
npm.cmd run build
```

确认没有无关文件后推送：

```bash
git push origin task/m<成员编号>-<任务名称>
```

每天结束前至少推送一次能够通过本组最低检查的版本，避免成果只保存在个人电脑。

## 十、个人任务 PR

个人 PR 的目标必须是本组集成分支：

| 成员 | PR 目标 |
|---|---|
| M1、M10 | 当前阶段 `management-quality` 集成分支 |
| M2、M3、M4 | 当前阶段 `frontend-experience` 或 Issue 指定的前端集成分支 |
| M5、M6、M9 | 当前阶段 `backend-platform` 集成分支 |
| M7、M8 | 当前阶段 `ai-feasibility` 集成分支 |

个人 PR 不得直接选择 `main`。PR 描述使用以下模板：

```markdown
## 对应任务

- Issue：#<编号>
- 负责人：M<编号>
- DDL：YYYY-MM-DD HH:mm

## 完成内容

- 本 PR 完成：
- 本 PR 不包含：

## 可验证产物

- 代码或文档路径：
- 页面、接口、脚本或测试入口：
- 测试命令与结果：
- 截图、日志或结果文件：

## 跨组影响

- 页面：
- 接口/字段：
- 状态/权限：
- 数据库/迁移：
- 模型/指标/数据：
- 配置/环境：

## 已确认与阻塞

- 已确认事项：
- 未确认事项：
- 阻塞项、负责人和下一检查时间：

## 自检

- [ ] 已同步本组最新集成分支
- [ ] 已执行本组要求的构建或测试
- [ ] 改动未超出本人任务范围
- [ ] 没有提交密钥、隐私数据、依赖目录、构建产物或临时文件
- [ ] 没有把 Mock、计划或候选方案描述为真实完成结果
```

## 十一、各组 Review 要求

### 项目管理与质量组

- M1 与 M10 互审。
- 修改其他组负责人、范围、接口或验收条件时，邀请对应组负责人。
- 范围或优先级变化由 M1 负责，质量门禁不能跳过 M10 的独立复核。

### 前端体验组

- M2、M3、M4 至少一人交叉 Review。
- 公共路由、公共组件、布局和权限变更邀请 M2。
- 登录、权限和隐私字段邀请 M5。
- 商品、求购、报价和订单状态邀请 M6。
- 搜索和匹配展示邀请 M7；价格、信誉和风险展示邀请 M8。
- 双账号和异常流程邀请 M10。

### 后端与平台组

- M5、M6、M9 至少一人交叉 Review。
- 认证、账号、权限和隐私由 M5 确认。
- 商品、求购、聊天、报价和订单业务状态由 M6 确认。
- 数据库迁移、缓存、对象存储、容器、环境和 CI 由 M9 确认。
- 页面或展示契约影响邀请 M2/M3/M4；智能事件和结果影响邀请 M7/M8。
- 权限、并发、恢复和发布门禁邀请 M10。

### 智能功能组

- M7 与 M8 互审。
- 搜索和供需匹配由 M7 主责；价格、信誉和风险辅助由 M8 主责。
- 页面展示字段邀请 M3；业务事件与事实边界邀请 M6；运行环境和数据保存邀请 M9。
- 数据来源、许可、指标和评估方法邀请 M10 复核。
- 相似度不得描述为成交概率，价格建议不得描述为自动定价，风险结果不得直接作为封禁结论。

## 十二、每天结束时记录

在任务 Issue 或 PR 留言：

```markdown
## 每日进度 YYYY-MM-DD

- 今日完成：
- 当前分支：
- 最新提交：
- 验证结果：
- 当前阻塞：
- 需要谁协助：
- 明日计划：
```

预计无法按 DDL 完成时，必须写清：已完成内容、未完成内容、影响范围和拆分到下一 Issue 的建议。

## 十三、做错分支时如何补救

### 还没有 commit

不需要撤销代码，直接创建正确任务分支：

```bash
git switch -c task/m<成员编号>-<任务名称>
git add <相关文件>
git commit -m "feat: <完成内容>"
git push -u origin task/m<成员编号>-<任务名称>
```

### 已经 commit，但没有 push

从当前提交创建正确分支：

```bash
git switch -c task/m<成员编号>-<任务名称>
git push -u origin task/m<成员编号>-<任务名称>
```

### 已经 push 到错误的个人分支，但没有合并

从包含正确提交的位置创建新任务分支并推送，然后用新分支创建 PR。确认新分支内容完整且旧分支不再使用后，再删除旧分支。

### 已经 push 到小组集成分支或 `main`

立即停止继续推送，不得 force-push 或自行 reset。把分支名和提交号发给组负责人，由负责人通过 `git revert` 保留历史地撤销共享分支错误提交，再从任务分支重新提交 PR。

## 十四、小组汇总与阶段结束

所有个人任务 PR 合并后，由小组集成负责人执行：

```bash
git fetch origin
git switch <小组集成分支>
git pull --ff-only origin <小组集成分支>
```

负责人按本组门禁完成构建、测试或文档检查，并邀请 Issue 指定的跨组负责人验收。全部通过后创建：

```text
<小组集成分支> -> main
```

汇总 PR，不直接 push `main`。

汇总 PR 合并后必须：

1. 在 Issue 中记录个人任务 PR、汇总 PR、最终提交和交付物路径。
2. 记录构建、测试、评审和验收结论。
3. 记录仍未完成的事项、负责人和下一 DDL。
4. 各成员切回并更新本地 `main`。
5. 确认分支不再使用后，再删除已经合并的远端任务分支。

更新本地 `main`：

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

## 十五、五天阶段建议节奏

| 天数 | 目标 | 必须留下的证据 |
|---|---|---|
| 第 1 天 | 锁定范围、依赖、分支和验收标准 | Issue、分支链接、任务与负责人 |
| 第 2 天 | 完成主要实现或文档主体 | 可检查提交、PR 草稿 |
| 第 3 天 | 串联上下游并暴露问题 | 联调/评审记录、阻塞项 |
| 第 4 天 | 修复、补测试和处理 Review | 测试结果、Review 处理记录 |
| 第 5 天 | 回归、验收和汇总 | 个人 PR、汇总 PR、验收结论 |

预计超过 5 天的内容应拆成多个可独立验收的 Issue，不能只延长一个范围过大的 Issue。
