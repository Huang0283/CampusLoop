# BP2-10 CI 契约说明（ci-contract）

> 证据文件：`docs/evidence/phase-2/backend-platform/ci-contract.md`
> 维护人：M9 ｜ 状态：已交付（PR #76 全绿合并；sdk:check 门禁本次验收整改恢复）

## 触发范围

- push：`main`、`phase*`、`task/**`
- 全部 Pull Request
- 同一 ref 旧任务自动取消（concurrency）

## 三个门禁 Job

| Job | 内容 | 失败影响 |
|---|---|---|
| backend / format & lint | `ruff format --check` + `ruff check`（ruff 0.8.4 锁定） | 阻断合并 |
| backend / migrations, seed & tests | 空 PostgreSQL(pgvector)+Redis 容器上：迁移 → 回滚 → 再迁移 → 种子幂等两遍 → pytest | 阻断合并 |
| frontend / sdk & build | `npm ci` → **`npm run sdk:check`（SDK 漂移门禁）** → lint → build | 阻断合并 |

> 验收整改说明：`sdk:check` 曾因前端脚本未就绪而注释，
> 现前端已提供该脚本（`sdk:generate && tsc -b`），门禁恢复。
> OpenAPI 修改而 SDK 未同步导致前端编译失败时，此步骤红灯阻止合入。

## 环境一致性保证

- 后端依赖只来自 `backend/requirements.txt`（全锁定），无隐式全局包
- CI PostgreSQL 服务镜像与 docker-compose 一致：`pgvector/pgvector:pg16` 线
  （compose 侧已进一步固定为 `0.8.6-pg16`，CI 服务为 GitHub 托管同源镜像）
- 前端 Node 22 + `package-lock.json` 锁定

## CI 范围边界（重要，评审明确）

CI 使用 GitHub 托管 PostgreSQL/Redis 服务容器，**不启动完整 docker-compose
（不含 MinIO）**。因此 CI 绿灯证明：代码质量、迁移/种子逻辑、测试、前端构建；
**不等于** BP2-09 完整环境验收——后者需按 startup-guide.md 在干净环境跑
`docker compose up` 并记录，两项证据相互独立、缺一不可。

## 真实把关实例（证明门禁有效）

1. 模型缺列拦截：曾拦截 `Unconsumed column names: attributes, favorite_count`
   （模型/迁移/种子不一致），修复后转绿——migration-review.md。
2. 格式零容忍拦截：曾拦截网页粘贴引入的 72 处空行尾随空格
   （`ruff format --check` 4 文件 `Would reformat`），改为拖拽上传原样文件后转绿。
   教训：**Python 文件一律拖拽上传，禁止网页编辑器粘贴。**
3. 范围边界实证（2026-10-08）：MinIO 官方删除 Docker Hub 仓库后，**CI 依旧
   全绿**（CI 不含 MinIO），而干净环境 Compose 验证立刻失败（`denied`）——
   证明"CI 绿灯 ≠ 完整环境可用"不是理论，两类证据必须并存。见 verification.md。

## 保护规则（需要仓库管理员在 GitHub Settings 里配置）

1. Settings → Branches → Branch protection → `main`：要求 CI 通过 + 至少 1 个批准
2. 禁止 force-push 到 `main` 与 `phase*/` 集成分支（团队规范已要求）

## 验证记录

- [x] 首次全绿运行（PR #76 head）：
      https://github.com/Huang0283/CampusLoop/actions/runs/36379211539
      （备份链接：https://github.com/Huang0283/CampusLoop/actions/runs/36378574253）
- [x] 故意制造失败能正确拦截：两起真实事故即为证据（见"真实把关实例"）
- [ ] PR 状态检查截图：随 PR 截图存档
