> 2026-10-25 ?????PR #122 ???????????????????????????????? fresh-image-dependencies.txt?????? [M9 ????](m9-pr122-acceptance.md)???????????????????????????????? fresh-image-dependencies.txt????????????????????????????????? fresh-image-dependencies.txt????????????????????????????????? fresh-image-dependencies.txt?

# BP5-06 干净环境部署指南（deployment-guide，发布版）

> 证据文件：`docs/evidence/phase-5/backend-platform/deployment-guide.md`
> 维护人：M9 ｜ 对应任务：BP5-06 固定镜像/Compose、依赖、配置模板、端口、卷和健康检查
> 原则：只记录真实实现与真实执行过的验证；未执行项标注"待执行"。

## 一、发布固定清单（本阶段冻结）

### 镜像（全部固定 tag / 固定源码构建，禁止 latest）

| 服务 | 镜像 / 构建方式 | 固定版本 |
|---|---|---|
| db | `pgvector/pgvector` | `0.8.6-pg16` |
| redis | `redis` | `7.4-alpine` |
| minio | 仓库 `Dockerfile.minio` 从固定源码 tag 构建 | 服务端 `RELEASE.2025-10-15T17-29-55Z`、客户端 `RELEASE.2025-08-13T08-35-41Z`（基础镜像 `golang:1.24-alpine` / `alpine:3.22`） |
| minio-init | 本地构建（无 image 名，compose pull 显示 Skipped 属正常） | 同上 |
| api / worker / baseline | 仓库 `backend/Dockerfile` 构建 | Python 3.12；依赖版本见 `backend/requirements.txt`（全部 `==` 锁定） |

### 依赖锁定

`backend/requirements.txt`：19 个运行依赖 + 3 个开发依赖全部 `==` 固定
（fastapi 0.115.6 / sqlalchemy 2.0.36 / alembic 1.14.0 / psycopg 3.2.3 /
ruff 0.8.4 等）。干净检出后无任何浮动版本。

### 端口（宿主 <- 容器）

| 宿主端口 | 服务 | 说明 |
|---|---|---|
| `${CAMPUSLOOP_API_PORT:-8001}` | api 8000 | 业务 API 与健康/就绪探针 |
| `${CAMPUSLOOP_DB_PORT:-5432}` | db 5432 | PostgreSQL 16 + pgvector |
| `${CAMPUSLOOP_STORAGE_PORT:-9000}` | minio 9000 | 对象存储（公开/私有桶） |
| 8002 | worker 8000 | worker `/healthz` 独立健康探针 |
| — | baseline 8787/8788 | M7/M8 RPC，仅 compose 内网，**不发布宿主端口** |

### 卷（跨重启持久化）

`db-data`（数据库）/ `redis-data`（队列）/ `minio-data`（对象）/
`baseline-data`（M7 快照，跨重启保留 snapshotVersion 语义）。

### 日志轮转（BP5-09 配套，compose 统一注入）

全部长驻服务 `json-file` 驱动，`max-size=10m`、`max-file=3`（单容器上限
约 30MB）。核验命令：

```bash
docker inspect --format '{{.Name}} {{.HostConfig.LogConfig.Config}}' $(docker compose ps -q)
```

### 配置模板

`.env.example`：唯一密钥来源说明 + 全部环境变量占位默认值
（真实密钥由 `backend/scripts/init_local.py` 生成，不入库——M10 复查项）。

## 二、干净环境部署步骤（非作者应能按本节一次完成）

前置：Docker Engine 24+ 与 Compose v2；8001/5432/9000/8002 宿主端口空闲；
首次构建 minio 需外网（或按第五节配置镜像加速）。

```bash
# 1) 检出（用户替换为小组仓库地址）
git clone --branch task/m9-p5-deployment-recovery https://github.com/Huang0283/CampusLoop.git && cd CampusLoop
# ??? PR???? git rev-parse HEAD ?? PR ???????????????????

# 2) 生成环境配置与本地密钥（真实密钥不入库）
cp .env.example .env
python backend/scripts/init_local.py     # 写入 AUTH_SIGNING_KEY / BASELINE_RPC_TOKEN

# 3) 一键启动（api 启动时自动 alembic upgrade head + 种子幂等校验）
docker compose up -d --build

# 4) 健康检查（全部就绪约 30-60 秒）
docker compose ps                        # 7 服务 Up，api/worker/baseline healthy
curl -fsS http://localhost:8001/health   # {"code":0,...,"dependencies":{"database":"ok","redis":"ok"}}
curl -fsS http://localhost:8001/ready
curl -fsS http://localhost:8002/healthz  # {"status":"ok",...,"checks":{"mainLoopAlive":true,"dbReachable":true}}

# 5) 冒烟（可选）：注册 -> 登录 -> 发商品/求购 -> 求购编辑触发匹配任务
#    数据核对：docker compose exec db psql -U campusloop -c "SELECT count(*) FROM ai_task_runs;"
```

### 非作者验收清单（BP5-06 口径）

- [ ] 仅凭本指南完成步骤 1-4，无需口头补充；
- [ ] `docker compose ps` 7 服务全部 Up，api/worker/baseline healthy；
- [ ] 两个健康端点 + worker `/healthz` 均返回预期 JSON；
- [ ] 日志轮转核验命令显示 `max-size=10m, max-file=3`；
- [ ] 未被要求修改任何代码或配置。

## 三、迁移（部署时自动，人工核验见 BP5-07）

api 容器启动即执行 `alembic upgrade head`；人工验证与回滚路径用：

```bash
bash backend/scripts/verify_migrations.sh
```

（空库升级 → 唯一迁移头 → downgrade base → 复升，全程在专用临时库，
详见 `migration-release-report.md`。）

## 四、备份与恢复（BP5-08）

```bash
python backend/scripts/verify_restore.py > backups/baseline-$(date +%Y%m%d-%H%M%S).json  # 行数基线
bash backend/scripts/db_backup.sh                 # pg_dump -Fc + sha256
bash backend/scripts/db_restore.sh backups/campusloop-<ts>.dump  # 恢复演练
python backend/scripts/verify_restore.py --baseline backups/baseline-<ts>.json   # 逐表比对
```

详见 `backup-recovery-report.md`。

## 五、常见故障

| 现象 | 处理 |
|---|---|
| minio/db 镜像拉取超时（国内网络） | daemon.json 增加 `{"registry-mirrors": ["https://docker.m.daocloud.io"]}` 后重启 Docker，再 `docker compose pull`（本地构建服务 Skipped 属正常） |
| 端口占用（8001/5432/9000/8002） | `.env` 设 `CAMPUSLOOP_API_PORT` / `CAMPUSLOOP_DB_PORT` / `CAMPUSLOOP_STORAGE_PORT` 改端口，或释放占用 |
| api 反复重启、日志报迁移失败 | 见 `migration-release-report.md` 第六节"失败恢复步骤" |
| worker unhealthy | `curl http://localhost:8002/healthz` 看 `checks`；DB/Redis 未就绪属等待期，超过 2 分钟再查 `docker compose logs worker` |
| worker 反复 Restarting，日志连续 ImportError / AttributeError | BP4-08 worker 增量文件缺失或过期（api 不加载该链路，api healthy 不能排除此故障）；按 `worker-recovery-report.md` 第三节清单核对 9 处文件，补齐后 `docker compose up -d --build api worker`；复盘见 `worker-recovery-report.md` |

## 六、执行记录（2026-10-15 起）

- 已在 M9 机器验证：BP4 阶段同拓扑 7 服务启动、健康检查、模型关闭实验
  （见 `docs/evidence/phase-4/backend-platform/verification.md`）；
- 本阶段新增项（日志轮转核验、非作者完整走查）：待执行后填写结论与
  执行环境（机器/提交号）——`verification.md` 第三节汇总登记；
- 2026-10-24：P5 恢复演练中发现 worker 容器 Restarting 循环——工作区缺失
  BP4-08「worker 运行时」增量 9 处（入口脚本、app/worker 四件套、ai_runs
  模型与导出、Settings 字段、matching_jobs 观测开关），按 import 链逐层
  暴露为 5 段报错；当晚逐处补齐（每处独立提交）并 `--build` 重建，全部
  服务 Up、api/worker 均 healthy、worker 启动横幅 `bp4-worker-runtime-v1`
  正常。完整复盘见 `worker-recovery-report.md`，教训已沉淀为 worker 验收
  三要点（同报告第五节：启动横幅、healthy 状态、更新后须 --build 重建）。
