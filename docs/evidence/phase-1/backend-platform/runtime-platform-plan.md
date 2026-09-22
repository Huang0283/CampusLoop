# BP1-10 运行环境与平台方案盘点

> Owner：M9 ｜ 阶段：BP-P1 ｜ 状态：候选方案；Phase 2（BP2-06~10）按此实现
> 目标：非作者读完能判断 Phase 2 需要安装和实现什么

## 1. 版本基线（全部锁定具体版本，见 backend/requirements.txt）

| 组件 | 版本 | 说明 |
|---|---|---|
| Python | 3.12 | 容器与 CI 一致 |
| FastAPI | 0.115.x | 含 TestClient 所需依赖 |
| SQLAlchemy | 2.0.x | 声明式模型 |
| Alembic | 1.14.x | 迁移 |
| psycopg | 3.2.x (binary) | PG 驱动 |
| pgvector Python | 0.3.x | embedding 列类型 |
| redis-py | 5.x | 健康检查/缓存 |
| PostgreSQL | 16（pgvector/pgvector:pg16 镜像） | 含 vector 扩展 |
| Redis | 7-alpine | — |
| MinIO | 最新 RELEASE 镜像 | S3 协议 |
| Node（CI 前端） | 22 | 与前端 Vite 8 匹配 |
| ruff | 0.8.x | 格式 + 静态检查 |
| pytest | 8.x | 单元/接口测试 |

## 2. 端口与地址分配（唯一分配表）

| 服务 | 端口 | 说明 |
|---|---|---|
| 前端 Vite | 5173 | `VITE_API_BASE_URL=http://localhost:8000` |
| FastAPI HTTP | 8000 | `/health`、`/ready`、`/docs` |
| FastAPI WebSocket | 8000 `/ws` | Phase 3 才有真实实现 |
| PostgreSQL | 5432 | 容器内 5432，映射宿主 5432 |
| Redis | 6379 | — |
| MinIO API / Console | 9000 / 9001 | 桶 `campusloop` |

## 3. 环境变量清单（.env.example 与此一致）

| 变量 | 示例值 | 消费方 | 备注 |
|---|---|---|---|
| APP_ENV | dev/ci/prod | API | 行为开关 |
| DATABASE_URL | postgresql+psycopg://campusloop:campusloop@db:5432/campusloop | API/Alembic/seed | 容器内主机名 `db` |
| DB_POOL_SIZE / DB_MAX_OVERFLOW | 5 / 10 | API | — |
| REDIS_URL | redis://redis:6379/0 | API | — |
| MINIO_ENDPOINT | minio:9000 | API | — |
| MINIO_ACCESS_KEY / MINIO_SECRET_KEY | minioadmin / minioadmin（仅本地） | API/MinIO | **生产必须换**，禁止提交真实密钥 |
| MINIO_BUCKET | campusloop | API | 初始化容器自动创建 |
| S3_PUBLIC_BASE_URL | http://localhost:9000/campusloop | API | 拼图片 URL |
| LOG_LEVEL / LOG_JSON | INFO / true | API | CI 用 false 便于读日志 |
| CORS_ORIGINS | http://localhost:5173 | API | 前端地址 |
| SEED_PASSWORD | campusloop-dev-123 | seed | 虚构账号统一密码 |
| POSTGRES_USER/PASSWORD/DB | campusloop/… | db 容器 | — |

## 4. 迁移策略

1. 工具：Alembic，单迁移目录 `backend/alembic/versions/`，`alembic.ini` 指向 `app.db.session` 的 URL。
2. 流程：改模型 → `alembic revision --autogenerate -m "..."` → 人工审阅（autogen 不识别 pgvector/触发器）→ 本地空库 `upgrade head` + `downgrade -1` + `upgrade head` 三连验证 → 提交。
3. 规则：禁止改已合并的 revision（只新增）；每个 revision 必须有可执行的 downgrade；`alembic stamp` 仅限救急且需登记。
4. 首版 `0001_initial_schema`：建全 15 张表 + pgvector 扩展 + 全部约束/索引（见 er-candidate.md）。

## 5. Compose 方案（一条命令）

`docker compose up -d --build` 拉起：db（healthcheck `pg_isready`）→ redis（`redis-cli ping`）→ minio（`/minio/health/live`）→ minio-init（`mc mb` 建桶，跑完退出）→ api（等依赖 healthy 后执行 `alembic upgrade head && python -m scripts.seed && uvicorn`，healthcheck `curl /health`）。
要求：非作者克隆仓库后 `cp .env.example .env && docker compose up -d --build` 即可全绿（BP2-09 验收）。

## 6. CI 方案（GitHub Actions）

单一 workflow `.github/workflows/ci.yml`，触发 push（main/phase*/task*）与 pull_request：
1. **backend-quality**：装依赖 → `ruff format --check` → `ruff check`；
2. **backend-test**：service 容器 pgvector:pg16 + redis:7 → `alembic upgrade head` → `alembic downgrade -1` → `alembic upgrade head`（回滚证明）→ seed 跑两遍（幂等证明）→ `pytest`；
3. **frontend-build**：node 22 → `npm ci` → `npm run sdk:check` → `npm run lint` → `npm run build`。
并发组按 ref 取消旧跑；不依赖任何个人缓存（`pip install -r requirements.txt` 全锁定版本）。

## 7. 日志方案

- 结构：JSON 行式（`timestamp/level/logger/requestId/message/extra`），CI 环境可切纯文本；
- requestId：中间件生成/透传 `X-Request-ID`，错误响应的 `requestId` 与日志一致（对齐契约 ErrorResponse）；
- 脱敏：email/password_hash/token 一律不打值；
- 级别：默认 INFO，`LOG_LEVEL` 覆盖。

## 8. 备份与恢复（候选，Phase 5 完整交付 BP5-06/07）

| 项 | 方案 |
|---|---|
| 数据库 | `pg_dump -Fc` 到 `backups/`（git 忽略）；恢复 `pg_restore --clean`；脚本 Phase 5 交付并演练 |
| MinIO | `mc mirror` 到本地目录；教学项目允许低频 |
| Redis | 不备份（可重建），重建=清空缓存 |
| 演练 | Phase 5 在干净容器按文档恢复并截图记录（不伪造） |

## 9. 风险与降级

| 风险 | 影响 | 缓解 |
|---|---|---|
| pgvector 镜像/扩展不可用 | embedding 列建不了 | 0001 迁移中扩展创建失败即快速失败；语义搜索降级关键词（契约已有降级字段） |
| 团队无 Docker 经验 | 环境起不来 | startup-guide.md 全步骤 + healthcheck 定位失败组件 |
| 迁移漂移（模型与库不一致） | 联调事故 | CI 每次空库跑迁移+回滚；PR 必含迁移说明 |
| 密钥泄漏 | 安全扣分 | 只提交 .env.example；CI 用 Secrets；M10 复查 |

## 10. 验收自检

- [x] 版本、端口、环境变量、迁移、Compose、CI、日志、备份恢复逐项盘点并给出方案
- [x] 每项标注 Phase 2 对应实现任务（BP2-06~10）
- [x] 非作者可据此在干净机器上复现环境
