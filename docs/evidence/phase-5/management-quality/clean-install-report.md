# MQ5-03 干净安装与部署报告

2026-10-25，由用户委托 Codex 执行。源码 `50108a3a50ca18e0da3f4db709da3f8bea2ee24c`，Windows 11 AMD64、Node v24.21.0；后端镜像 Python 3.12，宿主辅助脚本 Python 3.14.7。环境完整回执在 `evidence/20261025/environment.json`。

## 隔离和构建

新 worktree 安装前端依赖，新 Compose 项目 `campusloop-mq5-audit` 使用此前不存在的 db-data、redis-data、minio-data、baseline-data 卷。没有复用日常账号库或媒体卷。后端代码构建进镜像，API/Worker 没有源代码绑定挂载。镜像和卷标识见 environment.json；构建日志 `backend-image-build.txt`。依赖层/基础镜像可命中本机缓存，因此这是空库和新目录部署，不声称另一台全新电脑或全部依赖首次联网下载已实测。

## 可重复步骤

1. 检出审计 SHA；准备 Docker Engine/Compose v2、Node/npm、Python。日常运行说明见 `docs/development/local-startup.md`，日常只用 `scripts/start-local.ps1`。
2. 审计目录执行 `python backend/scripts/init_local.py` 生成本地配置；复制生成配置到 ignored `.codex-tmp/quality.env`。密钥必须本地随机生成，不能从本报告复制真实值。
3. 将本目录 `evidence/20261025/compose.audit.yml` 复制为 `.codex-tmp/compose.audit.yml`。它指定审计项目 API 8025、Worker 8026、对象存储 19025、独立 DB/Redis（无宿主端口）、Redis DB15。镜像标签在文件中，构建命令：`docker build -f backend/Dockerfile -t campusloop-mq5-api:50108a3 .`。根配置的 CORS_ORIGINS 必须在 ignored quality.env 中设为 `http://127.0.0.1:5195`；使用 Compose v2.24.4+ 以支持 !override/!reset。MinIO 依赖镜像 `campusloop-local-minio:dev`，缺少时 `docker build -f Dockerfile.minio -t campusloop-local-minio:dev .`。初始化服务共用此镜像；依赖已构建后才能使用 --no-build。
4. 镜像准备后执行 `docker compose --env-file .codex-tmp/quality.env -p campusloop-mq5-audit -f docker-compose.yml -f .codex-tmp/compose.audit.yml up -d --no-build --wait --wait-timeout 120`。空库自动迁移到 `0010` 并初始化种子。实际启动日志 `clean-deploy.txt`。
5. `docker exec campusloop-mq5-audit-api-1 python -m alembic current`；`docker exec campusloop-mq5-audit-api-1 python scripts/seed.py --check`。实际命令回执为 `seed-idempotency.json`。两遍 +0，数据计数一致。
6. frontend 中执行 `npm ci`，`npm run sdk:check`、`npm run lint`、`npm run build`（脚本名以 package.json 和各 JSON 命令回执为准）。构建/启动前设置 `VITE_API_BASE_URL=http://127.0.0.1:8025`、`VITE_WS_URL=ws://127.0.0.1:8025/ws`。`npm run dev -- --host 127.0.0.1 --port 5195 --strictPort`，不得自动换到日常站点。
7. 检查 API `/health`、`/ready`、Worker 8026 `/healthz` 和 Compose 全部服务健康。实际三项 HTTP 200、六个常驻服务 healthy，RPC 双端口探测通过。新环境浏览器完整回归见下一份报告。

## 结果与限制

npm ci 安装 310 个依赖；SDK 漂移、lint、build 通过。`npm audit --registry=https://registry.npmjs.org` 为 0 漏洞；默认 npmmirror 审计端点不支持不是依赖通过的证据。前端大包提示仍披露。

生产镜像不包含 OpenAPI/完整测试文件，因此在镜像内直接 pytest 的首次尝试缺文件失败。最终使用只读挂载同一候选完整 checkout 的临时容器运行测试，不把测试资产塞进生产镜像。具体命令和结果见 backend-final.json；临时测试容器仍连接独立审计库。初始失败日志保留，不冒称每次尝试均通过。

干净部署技术场景通过。非作者人工复现、最终合并提交/标签对应的最后一次复现尚未发生，须在正式发布时再执行，不以候选环境代替。
