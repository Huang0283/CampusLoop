# BP2 验证记录（verification）

> 证据文件：`docs/evidence/phase-2/backend-platform/verification.md`
> 维护人：M9 ｜ 本文件汇集 M9 交付范围的全部验证证据
> 原则：只记录真实执行过的验证；未执行的项目明确标注"待补"，不编造结果。

## 一、CI 验证（GitHub Actions，真实运行链接）

| 验证项 | 结果 | 证据 |
|---|---|---|
| ruff format + lint（30 文件） | 通过 | run 36379211539 |
| 空库迁移 → 回滚 → 再迁移 | 通过 | 同上（步骤 Verify rollback then re-migrate） |
| 种子两遍幂等 + pytest | 通过 | 同上 |
| 前端 lint + build | 通过 | 同上 |
| PR #76 合并 | 已合并（c3a4929 → phase2/backend-foundation） | https://github.com/Huang0283/CampusLoop/pull/76 |

链接：https://github.com/Huang0283/CampusLoop/actions/runs/36379211539
备份：https://github.com/Huang0283/CampusLoop/actions/runs/36378574253

## 二、本地机器验证（M9 开发机，2026-09-28）

修复"模型/迁移/种子三方不一致"后执行：

| 验证项 | 命令 | 结果 |
|---|---|---|
| 三方列一致性（14 种子表 / 15 模型表） | 脚本化比对 | 5 项检查全部通过（字段⊆模型、模型==迁移、必填覆盖、长度合规、可空性差异单列） |
| ruff 0.8.4 | `ruff format --check . && ruff check .` | 30 文件全过，零告警 |
| 健康接口测试 | `pytest tests/test_health.py -v` | 5/5 通过 |
| SDK 漂移（恢复门禁前预检） | `npm run sdk:generate` + 指纹比对 + `tsc -b` | 生成结果与提交版本一致（无漂移），编译通过 |

## 三、CI 拦截真实缺陷记录（门禁有效性证据）

1. **模型缺列拦截**：`backend / migrations, seed & tests` 红灯，
   `Unconsumed column names: attributes, favorite_count` → 修复 4 处三方不一致后转绿
   （明细见 migration-review.md）。
2. **格式零容忍拦截**：`backend / format & lint` 红灯，网页粘贴引入
   72 处空行尾随空格（4 文件 `Would reformat`）→ 改为拖拽上传原样文件后转绿。

## 四、干净环境完整 Compose 验证（BP2-09 验收口径）

> 状态：**待复跑**（首次执行记录见下方"事件记录"）。CI 不启动 MinIO/完整
> Compose，故此节必须单独取证。
> 执行环境：学校机房 / 任何全新机器（无本地镜像缓存、无未提交配置）。
> 操作步骤：startup-guide.md「干净环境标准验收流程」。
> 建议使用 `clean-env-verify.sh` 一键执行并自动留存日志。

### 事件记录：2026-10-08 首次执行（Linux，Docker 29.8.2，提交 2499d9b）

- 结果：**失败于镜像拉取步骤**，非项目缺陷：
  `minio/minio:RELEASE.2025-10-15T17-29-55Z → error from registry: denied`
- 根因（外部事件）：MinIO 于 2026-09-11 删除 Docker Hub `minio/minio`、
  `minio/mc` 仓库，2026-09-24 关闭 quay.io 匿名拉取；固定 tag 与
  docker login 均无法绕过。日志留档：`clean-env-verify-20261008-212608.log`。
- 处置：二轮整改——MinIO 服务端与 mc 改为 `Dockerfile.minio` 从固定源码
  tag 自建（版本号不变），不再依赖第三方 registry；pgvector/redis 拉取
  正常（证明网络与 registry 访问本身无问题）。
- 意义：本事件恰好证明"CI 绿灯 ≠ 完整环境可用"（CI 不含 MinIO 所以一直
  绿），干净环境验证作为独立证据不可省略——与负责人第 3 点意见一致。

### 待复跑验证项

| 验证项 | 期望结果 | 实际结果（复跑后填写） |
|---|---|---|
| `docker compose pull` | pgvector/redis 拉取成功（minio/api 为自建，Skipped 属正常） | 待填 |
| `docker compose up -d --build` | api 与 minio 镜像构建成功，五服务启动 | 待填 |
| `docker compose ps` | db/redis/minio/api 均 healthy，minio-init exited(0) | 待填 |
| 空库升级（api 启动自动执行） | `alembic upgrade head` 无错误，启动日志可见 | 待填 |
| `docker compose exec api python scripts/seed.py --check` | `[seed][PASS] 两遍执行结果完全一致` | 待填 |
| 回滚再升级 | `alembic downgrade base` 后 `upgrade head` 成功，种子重建仍幂等 | 待填 |
| `curl http://localhost:8000/health` | `{"code":0,...,"status":"ok","dependencies":{"database":"ok","redis":"ok"}}` | 待填 |
| MinIO 双桶 | minio-init 日志出现双桶 ready；`/minio/health/live` 存活 | 待填 |
| 环境记录 | `uname -a`、`docker --version`、`docker compose version` | 待填 |

**执行记录**（执行后填写）：

- 日期：待填
- 执行人：待填（非作者复核人另记）
- 机器/系统：待填
- 检出的分支与提交号：待填
- 日志文件：`clean-env-verify-<日期>.log`（脚本自动生成，建议随证据提交或贴关键输出）

## 五、已知未验证项声明

- 完整 Compose 联调（第四节）在本次提交时尚未执行——不宣称已通过。
- `sdk:check` 门禁恢复后的首次 CI 运行结果：以 Actions 页面为准（本地预检无漂移、编译通过，预期绿）。
