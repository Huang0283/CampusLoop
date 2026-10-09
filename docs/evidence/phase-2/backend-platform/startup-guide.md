# BP2-09 启动指南（startup-guide）

> 证据文件：`docs/evidence/phase-2/backend-platform/startup-guide.md`
> 维护人：M9 ｜ 状态：已交付（干净环境验收记录见 verification.md）
> 验收口径：**非作者**按本文从零启动成功才算通过。

## 前置条件

- Docker Engine 24+（含 Compose v2）；磁盘 ≥ 3GB（含 MinIO 源码构建缓存）
- 组件来源全部固定，干净机器无需任何本地缓存：

| 组件 | 来源与固定版本 |
|---|---|
| PostgreSQL + pgvector | Docker Hub 固定 tag：`pgvector/pgvector:0.8.6-pg16` |
| Redis | Docker Hub 固定 tag：`redis:7.4-alpine` |
| MinIO 服务端 | **源码自建**（仓库 `Dockerfile.minio`）：tag `RELEASE.2025-10-15T17-29-55Z` |
| mc 客户端 | **源码自建**（同一镜像内）：tag `RELEASE.2025-08-13T08-35-41Z` |
| api | 本地构建（backend/Dockerfile，python:3.12-slim） |

### 镜像策略说明（2026-10-08 二次整改，重要背景）

MinIO 开源版已停止分发容器镜像：2026-09-11 Docker Hub 删除
`minio/minio`、`minio/mc` 仓库（拉取报 `denied`）；2026-09-24 quay.io
关闭匿名拉取（401，`docker login` 无效）。官方发布说明建议"clone 源码
自行构建容器"。本项目按此改为从固定源码 tag 构建（`Dockerfile.minio`），
比依赖第三方 registry 更可复现——镜像仓库会被删除，源码 tag 不会。
首次构建约 3-10 分钟（clone + Go 模块 + 编译），Go 模块下载已内置
`GOPROXY=goproxy.cn`，国内外网络均可用。

### 国内拉取超时的应急方案（改 Docker 守护进程，不改任何项目文件）

适用于 pgvector / redis / golang / alpine 等基础镜像（MinIO 已无需拉取）：

```bash
# /etc/docker/daemon.json 增加（没有该文件就新建）：
#   {"registry-mirrors": ["https://docker.m.daocloud.io"]}
sudo systemctl restart docker
```

## 干净环境标准验收流程（评审要求口径）

在**全新检出、无本地镜像缓存、无未提交配置**的环境依次执行：

```bash
git clone https://github.com/Huang0283/CampusLoop && cd CampusLoop
git checkout phase2/backend-foundation        # 或含最新修复的任务分支
cp .env.example .env

docker compose pull                            # 1. 拉取固定 tag 基础镜像（db/redis；
                                               #    minio 为源码自建，显示 Skipped 属正常）
docker compose up -d --build                   # 2. 构建 api 与 minio 镜像并启动五服务
                                               #    （minio 首次构建约 3-10 分钟）
docker compose ps                              # 3. 确认 db/redis/minio/api 均 healthy
docker compose exec api alembic upgrade head   # 4. 空库迁移（api 启动时已自动执行，此处独立复核）
docker compose exec api python scripts/seed.py --check   # 5. 种子两遍幂等校验
curl http://localhost:8001/health              # 6. 健康探针（本地映射 8001 → 容器 8000）
```

第 6 步期望输出：

```json
{"code":0,"message":"ok","data":{"status":"ok","dependencies":{"database":"ok","redis":"ok"}}}
```

### 回滚再升级验证（可选加强，评审建议执行）

```bash
docker compose exec api alembic downgrade base   # 清空全部表（保留库与扩展）
docker compose exec api alembic upgrade head     # 重新迁移
docker compose exec api python scripts/seed.py --check   # 种子重建后仍幂等
```

### MinIO 双桶验证

```bash
docker compose logs minio-init
# 期望末行：[minio-init] buckets campusloop-public(public-read) + campusloop-private(private) ready
curl -s http://localhost:9000/minio/health/live   # 期望 200（无输出即存活）
```

前端：`cd frontend && npm ci && npm run dev` → http://localhost:5173（Mock 数据，`VITE_WS_URL` 留空）

## 常见故障定位

| 现象 | 排查 |
|---|---|
| api 起不来 | `docker compose logs api`；启动命令含迁移+种子校验，失败会拒绝启动（这是设计行为） |
| db 不 healthy | `docker compose logs db`；端口 5432 被占用则改 compose 端口映射 |
| health 显示 degraded | 看 `dependencies` 哪项 unavailable，逐个 `docker compose logs <服务>` |
| MinIO 404 | 确认 minio-init 容器执行成功（创建 campusloop-public / campusloop-private 双桶） |
| minio 构建失败 | 重跑一次（BuildKit 有层缓存）；仍失败看日志是 clone 还是 Go 模块下载，网络问题等几分钟再试 |
| 镜像拉取超时 | 见上文"国内应急方案"（仅基础镜像需要；MinIO 无需拉取） |

## 停止与清理

```bash
docker compose down          # 保留数据卷
docker compose down -v       # 彻底清空（慎用：种子数据消失，重起会自动重建）
```

## 验证记录

- [ ] 非作者从干净机器按上述步骤启动成功（记录于 verification.md）
- [ ] 验证人 / 日期 / 提交号：见 verification.md 预留区
