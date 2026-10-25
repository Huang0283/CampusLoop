> 2026-10-25 ?????PR #122 ?????????????????? [M9 ????](m9-pr122-acceptance.md)???????????????????????????????????????

# Phase 5 backend group: M6 and M9 records

2026-10-25: PR #122 conflict resolution retains both members' records below. M6 regression results do not certify M9 deployment, recovery or performance work. M9 pending checks remain pending. No stage approval is implied.

# M6 第五阶段独立复验记录

2026-10-25，M10。原 PR #121 已合并，组分支输入 `9bf23ff57d86b6c8b7c69a686a679f298e52c791`；接入已验收 main `1b3385ac0df557ddf34d7d9d52d608a9c26e7df7`。修复分支 `fix/m6-p5-acceptance`，最终源码以修复 PR HEAD 为准，内容指纹见 `evidence/m6-acceptance-source-sha256.json`。

## 结果

- 严格命令 `python scripts/m6_phase5/verify.py --require-integration` 返回 0：Ruff lint、format、完整后端、结构契约、M7/M8 基线全部通过。
- 后端：**168 passed，0 failed，0 skipped，0 xfailed**，99.96 秒。JUnit 与日志分别为 `evidence/m6-backend-tests.xml`、`evidence/m6-backend.log`。
- 38 条第三方弃用警告，来自 Starlette/AnyIO、Botocore 的接口/日期调用；未屏蔽，也不是业务断言失败。
- 结构契约：67 operations、9 enums、16 schema examples；`evidence/m6-contract.log`。
- M7 基线 38、M8 基线 31 项通过；`evidence/m6-m7.log`、`evidence/m6-m8.log`。这不等于正式模型质量或全部智能组阶段验收。
- 前端：干净 `npm ci`，lint/build、sdk:check 均通过，SDK 再生成与暂存源码快照无漂移。构建仍有大于 500KB 分块提示。提交后再次执行 SDK diff。
- 本次没有修改 M9 部署、备份、性能或迁移实现；审计空库按当前迁移执行到 0010，只证明当前源码可迁移及业务回归，不替代 M9 全部运维验收。

## 隔离环境

- 检出：原项目内 `.codex-tmp/m6-p5-repair`，不切换日常 main。
- Docker 独立网络 `campusloop-m6-p5-audit`，三个专用容器：`campusloop-m6-p5-audit-db`、`campusloop-m6-p5-audit-redis`、`campusloop-m6-p5-audit-minio`，未映射宿主端口。
- PostgreSQL 16.15，镜像 `pgvector/pgvector:0.8.6-pg16`，数据库 `campusloop_m6_p5_audit`；Redis 7.4、DB15；专用 MinIO 公共/私有桶。
- 执行器复用已安装后端依赖的 `campusloop-local-api:dev`，Python 3.12.15；通过 bind mount **运行本修复检出的源码**。不是重新构建的最终发布镜像，镜像构建和最终部署留给 M9。
- 合成账号/图片/消息只进入审计容器；没有运行日常库清空、重建、种子覆盖或删除媒体卷。

## 可复现步骤

使用已安装后端 requirements 的 Python 3.12，按 `.github/workflows/ci.yml` 规格准备**专用可清理** PostgreSQL/Redis/MinIO。连接值按自己的审计环境替换，不可指向日常库：

```powershell
$env:APP_ENV='test'
$env:DATABASE_URL='postgresql+psycopg://campusloop:audit-only@127.0.0.1:25432/campusloop_m6_p5_audit'
$env:REDIS_URL='redis://127.0.0.1:26379/15'
$env:MINIO_ENDPOINT='127.0.0.1:29000'
$env:MINIO_ACCESS_KEY='minioadmin'
$env:MINIO_SECRET_KEY='minioadmin'
$env:AUTH_SIGNING_KEY='m6-audit-only-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
$env:BASELINE_SERVICES_ENABLED='false'
# 为专用 MinIO 创建 campusloop-public 和 campusloop-private 两个桶。
Push-Location backend
python -m alembic upgrade head
Pop-Location
python scripts/m6_phase5/verify.py --require-integration
Push-Location frontend
npm ci
npm run sdk:check
git diff --exit-code -- src/sdk/generated/
npm run lint
npm run build
Pop-Location
```

25432/26379/29000 是复现配置示例端口，不是本次已启动的服务地址；本次容器内部连接无需宿主端口。合成测试密钥不可用于日常或生产。服务准备采用专用环境，不改日常启动脚本。

脚本退出 0 表示检查无失败/跳过，1 表示检查失败，2 表示严格模式仍有 skip/xfail。不要只看普通 pytest 退出码。重新执行会覆盖日志，需同步本记录；耗时随合成数据量变化。

## 修复依据与限制

旧组分支在专用服务就绪后无断言失败，但保留 1 个缺治理路由 xfail，且缺 main 的已验收内容。接回 main 后该标记变成严格 XPASS；确认路由存在后移除标记和路由跳过，再全量严格复验。新增真实 WebSocket 断开/重连补拉以及智能异常下交易事实不变测试，结果已计入 168 项。

2026-10-23/24 的死锁 before/after 日志、旧本地环境摘要、包扫描及 source-sha256 是历史记录；最新通用测试日志和摘要已更新到本次结果。旧无数据库“37/41 skipped”不再用作本次结论。

M6 个人技术范围可交付评审。最终消费者、公网/多机故障、真实模型评估、发布镜像、备份恢复/性能、阶段统一标签及人工签收仍需在统一 P5 集成提交完成，不能以本报告关闭整个后端 Issue。


---

# BP5 验证记录（verification，backend-platform）

> 证据文件：`docs/evidence/phase-5/backend-platform/verification.md`
> 维护人：M9 ｜ 汇集 BP5-06/07/08/09 全部验证证据
> 原则：只记录真实执行过的验证；未执行项明确标注"待执行"，不编造结果。

## 一、静态与脚本校验（开发环境，M9，已执行）

| 验证项 | 命令 | 结果 |
|---|---|---|
| 新增 python 脚本编译 | `py_compile`（verify_restore.py / api_bench.py） | ✅ 全部通过 |
| 新增 shell 脚本语法 | `bash -n`（verify_migrations.sh / db_backup.sh / db_restore.sh） | ✅ 全部通过 |
| ruff format（CI 锁定 0.8.4 口径） | `ruff format --check .`（backend，80 文件） | ✅ 全部已格式化（0.17.0 双口径复核同样通过） |
| ruff lint | `ruff check .` | ✅ 通过 |
| compose 配置语法 | `docker compose config -q` | 待补测（本机执行后打勾） |

## 二、任务验证登记（结果在各报告内，此处汇总状态）

| 任务 | 验证项 | 口径/命令 | 状态 | 报告位置 |
|---|---|---|---|---|
| BP5-06 | 非作者按 deployment-guide 一次完成部署 | 指南第二节步骤 1-4 + 验收清单 | 待执行 | deployment-guide.md |
| BP5-06 | 日志轮转配置核验 | `docker inspect ... LogConfig` | 待执行 | platform-test-report.md 第四节 |
| BP5-07 | 空库升级 + 唯一头 + 回滚复升 | `bash backend/scripts/verify_migrations.sh` | 待执行 | migration-release-report.md 第三节 |
| BP5-08 | 备份 + 恢复 + 26 表行数与状态链核对 | db_backup.sh → db_restore.sh → verify_restore.py --baseline | 待执行 | backup-recovery-report.md 第三、四节 |
| BP5-09 | 并发读基线（10 并发 × 100 请求） | `python backend/scripts/api_bench.py` | 待执行 | platform-test-report.md 第一节 |
| BP5-09 | worker/api 重启恢复 | restart + /healthz 心跳续接 | 待执行 | platform-test-report.md 第二节 |
| BP5-09 | 存储/磁盘水位 | `docker system df` + `df -h` | 待执行 | platform-test-report.md 第三节 |
| BP5-09 | 日志轮转实测 | inspect + 压测后体积 | 待执行 | platform-test-report.md 第四节 |

## 三、执行环境（执行后统一填写）

- 日期：待填
- 机器/系统：待填（Windows / Git Bash + Docker Desktop，与 BP2-09/BP4 同机）
- 检出的分支与提交号：待填（`git rev-parse --branch --short HEAD`）
- 依赖版本：requirements.txt 全锁定（见 deployment-guide.md 第一节）

## 四、已知未验证项声明

- 本阶段四项任务均含"待执行"实测项：脚本/文档已交付，实测在用户机器
  上按各报告步骤执行后回填——在全部回填前，不宣称 BP5-06~09 通过。
- 非作者部署走查（BP5-06 验收标准）需由 M5/M6 或 M10 任一人独立执行，
  M9 提供本指南与答疑。
- MinIO 对象文件不包含在 pg_dump 逻辑备份内（见 backup-recovery-report.md
  第四节）：是否纳入发布流程待 M1 确认范围，未确认前登记为遗留项。
