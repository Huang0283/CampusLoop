# BP1-10 运行环境与平台方案盘点

> Owner：M9 ｜ 阶段：BP-P1 ｜ 状态：候选方案；作为 Phase 2（BP2-06~10）的评审输入
> 目标：非作者读完能判断 Phase 2 需要安装和实现什么

## 1. 版本基线候选

> 说明：下表是 Phase 2 建立依赖锁前的兼容性候选，不代表依赖已经安装或验证。BP2-06 必须通过依赖解析和测试后生成 `backend/requirements.txt`，以锁文件为唯一事实来源并回填最终版本。

| 组件 | 候选版本 | Phase 2 验证 |
|---|---|---|
| Python | 3.12 | 容器和 CI 使用相同补丁版本 |
| FastAPI | 0.115.6 | 与 Pydantic、HTTPX 执行最小接口测试 |
| uvicorn[standard] | 0.32.1 | 执行启动和优雅退出测试 |
| SQLAlchemy | 2.0.36 | 与 psycopg、Alembic 执行迁移测试 |
| Alembic | 1.14.0 | 验证 upgrade/downgrade/upgrade |
| psycopg | 3.2.3 (binary) | 连接 PostgreSQL 16 |
| pgvector Python | 0.3.6 | 创建扩展和向量列；失败时记录降级 |
| pydantic / pydantic-settings | 2.10.3 / 2.6.1 | 验证配置加载和字段校验 |
| redis-py | 5.2.1 | 验证健康检查和断连降级 |
| httpx | 0.28.1 | 验证 FastAPI TestClient 兼容性 |
| PostgreSQL | 16（pgvector PostgreSQL 16 镜像） | BP2-09 固定具体镜像 tag/digest |
| Redis | 7-alpine | BP2-09 固定具体镜像 digest |
| MinIO | 待选择 RELEASE tag | BP2-09 禁止使用 `latest`，固定 RELEASE tag/digest |
| Node（CI 前端） | 22 | 固定满足 Vite 8 要求的补丁版本 |
| ruff | 0.8.4 | 执行 format/check |
| pytest | 8.3.4 | 执行单元和接口测试 |

## 2. 端口与地址分配（唯一分配表）

| 服务 | 端口 | 说明 |
|---|---|---|
| 前端 Vite | 5173 | `VITE_API_BASE_URL=http://localhost:8000` |
| FastAPI HTTP | 8000 | `/health`、`/ready`、`/docs` |
| FastAPI WebSocket | 8000 `/ws` | Phase 3 才有真实实现 |
| PostgreSQL | 5432 | 容器内 5432，映射宿主 5432 |
| Redis | 6379 | — |
| MinIO API / Console | 9000 / 9001 | 桶 `campusloop-public`（匿名公共读）/ `campusloop-private`（默认私有，仅预签名访问） |

## 3. 环境变量候选（BP2-09 写入 `.env.example` 后逐项核对）

| 变量 | 示例值 | 消费方 | 备注 |
|---|---|---|---|
| APP_ENV | dev/ci/prod | API | 行为开关 |
| DATABASE_URL | postgresql+psycopg://campusloop:campusloop@db:5432/campusloop | API/Alembic/seed | 容器内主机名 `db` |
| DB_POOL_SIZE / DB_MAX_OVERFLOW | 5 / 10 | API | — |
| REDIS_URL | redis://redis:6379/0 | API | — |
| MINIO_ENDPOINT | minio:9000 | API | — |
| MINIO_ACCESS_KEY / MINIO_SECRET_KEY | minioadmin / minioadmin（仅本地） | API/MinIO | **生产必须换**，禁止提交真实密钥 |
| MINIO_PUBLIC_BUCKET | campusloop-public | API | 商品图片等公开内容，匿名公共读 |
| MINIO_PRIVATE_BUCKET | campusloop-private | API | 举报举证等敏感对象，默认私有 |
| S3_PUBLIC_BASE_URL | http://localhost:9000/campusloop-public | API | 拼公开图片 URL（**只允许指向公共桶**） |
| LOG_LEVEL / LOG_JSON | INFO / true | API | CI 用 false 便于读日志 |
| CORS_ORIGINS | http://localhost:5173 | API | 前端地址 |
| SEED_PASSWORD | campusloop-dev-123 | seed | 虚构账号统一密码 |
| POSTGRES_USER/PASSWORD/DB | campusloop/… | db 容器 | — |

## 4. 迁移策略

1. 工具：Alembic，单迁移目录 `backend/alembic/versions/`，`alembic.ini` 指向 `app.db.session` 的 URL。
2. 流程：改模型 → `alembic revision --autogenerate -m "..."` → 人工审阅（autogen 不识别 pgvector/触发器）→ 本地空库 `upgrade head` + `downgrade -1` + `upgrade head` 三连验证 → 提交。
3. 规则：禁止改已合并的 revision（只新增）；每个 revision 必须有可执行的 downgrade；`alembic stamp` 仅限救急且需登记。
4. 首版迁移候选范围：覆盖经 M5/M6 评审接受的核心表、pgvector 扩展和必要约束/索引；不得直接把 `er-candidate.md` 的未确认项全部冻结进迁移。

## 5. Compose 方案（一条命令）

`docker compose up -d --build` 拉起：db（healthcheck `pg_isready`）→ redis（`redis-cli ping`）→ minio（`/minio/health/live`）→ minio-init（`mc mb` 建公共/私有双桶，**仅对公共桶** `mc anonymous set download`，跑完退出）→ api（等依赖 healthy 后执行 `alembic upgrade head && python -m scripts.seed && uvicorn`，healthcheck `curl /health`）。
要求（**BP2-09 验收目标，待 Phase 2 实测证明**）：非作者克隆仓库后 `cp .env.example .env && docker compose up -d --build` 即可全绿。Phase 1 仅输出方案，不声称已在干净机器复现。

## 6. CI 方案（GitHub Actions）

单一 workflow `.github/workflows/ci.yml`，触发 push（main/phase*/task*）与 pull_request：
1. **backend-quality**：装依赖 → `ruff format --check` → `ruff check`；
2. **backend-test**：service 容器 pgvector:pg16 + redis:7 → `alembic upgrade head` → `alembic downgrade -1` → `alembic upgrade head`（回滚证明）→ seed 跑两遍（幂等证明）→ `pytest`；
3. **frontend-build**：node 22 → `npm ci` → `npm run sdk:check` → `npm run lint` → `npm run build`。
并发组按 ref 取消旧跑；不依赖个人缓存。BP2-06 生成依赖锁后，CI 只从锁文件安装并验证无漂移。

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
- [x] 非作者可以据此判断 Phase 2 需要安装、实现和验证的内容
- [ ] 干净机器复现属于 BP2-09 验收：待 Compose、锁文件和 CI 实际提交后由非作者执行，本阶段不声称已复现
