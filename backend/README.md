# CampusLoop Backend

FastAPI、SQLAlchemy、Alembic、PostgreSQL/pgvector、Redis 与 MinIO。当前包含认证、市场、聊天交易、治理和智能业务编排；具体范围以[阶段任务](../docs/issues/README.md)、契约和实际验收证据为准。

## 日常启动

在仓库根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

该入口统一管理依赖、API、Worker 与前端，保留日常数据库及媒体卷。依赖、镜像更新、停止/状态和数据保护见[本机启动说明](../docs/development/local-startup.md)，不要另建临时环境冒充日常网站。

- API 文档：http://127.0.0.1:8001/docs
- 健康检查：`GET /health`；依赖降级时响应包含依赖状态。
- 就绪检查：`GET /ready`；未就绪时返回 503。
- 唯一 HTTP 契约：[openapi/campusloop.v1.yaml](../openapi/campusloop.v1.yaml)。宿主机 API 8001，容器内部 8000。

## 开发检查与专用验收环境

在 `backend` 目录、Python 3.12 虚拟环境中安装 `requirements.txt`，执行：

```powershell
python -m pip install -r requirements.txt
python -m ruff format --check .
python -m ruff check .
python -m pytest -m 'not integration'
```

集成测试与迁移/种子验收必须先提供独立审计数据库、测试媒体卷及 Redis DB14/15，并确认环境变量指向这些资源，再执行：

```powershell
python -m alembic upgrade head
python scripts/seed.py --check
python -m pytest -m integration
```

没有可达测试数据库时部分集成测试会跳过；skip 不能报告为已通过。空库迁移、回滚、并发和恢复等写入检查只允许在专用环境执行，不操作日常数据库或媒体卷。环境配置与命令按本轮版本通知登记，不把 `.env`、密码或数据库转储提交 Git。

## 迁移与目录

- `app/api/routes/`：HTTP 与 WebSocket 路由；`app/services/`：业务服务。
- `app/models/`、`app/db/`：模型、引擎与会话。
- `alembic/versions/`：数据库迁移；`scripts/seed.py`：幂等种子。
- `tests/`：单元与 integration 测试。

模型/迁移由对应文件负责人维护，其他任务先提交字段与查询需求。迁移必须人工检查 upgrade/downgrade，在审计环境验证；禁止跳过迁移直接修改日常库结构。OpenAPI/SDK 的唯一 Owner 和交接要求见[阶段规范](../docs/issues/README.md)。
