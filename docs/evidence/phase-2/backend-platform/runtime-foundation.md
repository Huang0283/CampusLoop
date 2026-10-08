# BP2-06 运行时基线说明（runtime-foundation）

> 证据文件：`docs/evidence/phase-2/backend-platform/runtime-foundation.md`
> 维护人：M9 ｜ 状态：已交付（PR #76 合并于 c3a4929）

## 交付物

| 项 | 路径 | 说明 |
|---|---|---|
| FastAPI 骨架 | `backend/app/main.py` | 应用工厂、requestId 中间件、CORS |
| 配置加载 | `backend/app/core/config.py` | 全部环境变量集中定义，与 `.env.example` 一一对应 |
| 结构化日志 | `backend/app/core/logging.py` | JSON 行式 + 敏感键打码 |
| 健康接口 | `backend/app/api/routes/system.py` | `/health`（200+degraded 语义）、`/ready`（503 探针） |
| 依赖锁 | `backend/requirements.txt` | 全部固定版本（fastapi 0.115.6 / sqlalchemy 2.0.36 / alembic 1.14.0 等） |
| 一键环境 | `docker-compose.yml` | db / redis / minio / minio-init / api 五服务，全部固定镜像 tag |

## 运行环境版本基线

| 组件 | 版本 | 说明 |
|---|---|---|
| Python | 3.12（CI 实测 3.12.14） | 本地与容器均为 python:3.12-slim |
| PostgreSQL | 16 + pgvector 0.8.6 | `pgvector/pgvector:0.8.6-pg16` |
| Redis | 7.4 线 | `redis:7.4-alpine` |
| MinIO | RELEASE.2025-10-15T17-29-55Z | 服务端；初始化客户端 mc RELEASE.2025-08-13T08-35-41Z |
| Node（前端/SDK 门禁） | 22 | GitHub Actions setup-node |

镜像版本策略：验收整改后全部固定 tag，禁止 `latest`，保证干净环境可复现；
国内拉取超时的应急方案见 startup-guide.md。

## 验证记录

- [x] `pip install -r requirements.txt` 干净环境安装成功（CI 每次运行均验证）
- [x] CI 全绿：https://github.com/Huang0283/CampusLoop/actions/runs/36379211539
- [x] `/health` 依赖全部在线返回 ok；依赖不可用返回 200 + degraded（tests/test_health.py 5 项测试，CI 中通过）
- [x] 停 Redis → `status=degraded, redis=unavailable`（单测 mock 验证，见 test_health.py）
- [x] 运行环境：GitHub Actions ubuntu-latest；Python 3.12.14
- [x] 提交号：PR #76 → phase2/backend-foundation，merge commit c3a4929
- [ ] 本地完整 Compose 五服务联调（db+redis+minio+minio-init+api 全 healthy）：待干净环境验收（见 verification.md 预留区）

## 遗留问题

- MinIO 旧版使用 `latest` tag 导致部分网络环境拉取失败，已改为固定 RELEASE tag（验收整改项 1，本次修复）。
- 三处列可空性差异待 M6 确认（见 handoff.md），不阻塞启动。
