# CampusLoop Backend（BP2-06 运行时基线）

FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL 16(pgvector) + Redis + MinIO。
Phase 2 交付范围：**可启动的骨架与统一环境**，不含业务接口实现（Phase 3）。

## 本地启动（不用 Docker）

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 需要本地 PostgreSQL(含 pgvector) 与 Redis；或在仓库根目录起 docker compose up -d db redis minio
cp ../.env.example ../.env       # 按需修改连接串

alembic upgrade head             # 建表
python scripts/seed.py           # 种子（幂等，可重复执行）
python scripts/seed.py --check   # 幂等性自检（CI 同款）
uvicorn app.main:app --reload    # http://localhost:8000/docs
```

## 健康检查

```bash
curl http://localhost:8000/health
# {"code":0,"message":"ok","data":{"status":"ok","dependencies":{"database":"ok","redis":"ok"}}}
# 依赖不可用时：status=degraded 并标明哪个依赖 unavailable（仍返回 200，契约语义）
curl http://localhost:8000/ready   # degraded 时返回 503，供探针使用
```

## 测试

```bash
pytest                              # 单元测试（无需数据库）
pytest -m integration               # 集成测试（需要 PostgreSQL，CI 中自动执行）
ruff format . && ruff check .       # 提交前自查（CI 同款门禁）
```

## 迁移规约（M9 维护，全组必须遵守）

1. 改模型后：`alembic revision --autogenerate -m "..."`，**人工检查生成脚本**后再提交；
2. 每个迁移必须有可用的 `downgrade`；CI 会执行 `downgrade base -> upgrade head` 验证；
3. 手写迁移（如 pgvector、触发器）放 `alembic/versions/`，命名 `NNNN_描述.py`；
4. 禁止手改生产/集成数据库结构，禁止跳过迁移直接 `CREATE TABLE`。

## 目录导览

```text
backend/
├── app/
│   ├── main.py              # 应用工厂 + 中间件
│   ├── core/config.py       # 环境变量（对齐 ../.env.example）
│   ├── core/logging.py      # JSON 日志 + requestId
│   ├── core/envelope.py     # 契约响应信封/错误结构
│   ├── api/routes/system.py # /health /ready（契约 BP2-06）
│   ├── db/                  # 引擎、会话、声明基类
│   └── models/              # 全部表模型（BP2-07，按领域分文件）
├── alembic/versions/0001_initial_schema.py   # 首版迁移
├── scripts/seed.py          # 幂等种子数据（BP2-08）
├── tests/                   # pytest（单元 + integration 标记）
└── requirements.txt         # 锁定版本
```
