# M5 Phase 4 验证记录

执行者：M5 胡可铭；日期：2026-10-15（北京时间）。
被测源码：`c4687d5a44eb18d5a96af4bec03b85ec933da0be`；
基线：`cdf814364eec988e0d197c0a0098a92eb5db4d6e`。
逐用例记录：[evidence/m5-api-results.json](evidence/m5-api-results.json)。
作者自检不是 M10 独立验收或其他成员签字。

## 环境与实际结果

Windows / PowerShell、Python 3.12 隔离 .venv，依赖按 backend/requirements.txt 锁定。
Docker Desktop 更新至 4.95.0 / Engine 29.8.2 后可用；先前故障在 Docker 引擎启动。
Docker 没有重置或删除用户已有卷。真实服务绑定本机测试端口：

| 依赖 | 版本/容器 | 地址 |
|---|---|---|
| PostgreSQL / pgvector | pgvector/pgvector:0.8.6-pg16 / campusloop-m5-p4-db | 127.0.0.1:15432，专用campusloop_test |
| Redis | redis:7.4-alpine / campusloop-m5-p4-redis | 127.0.0.1:16379，专用DB15 |
| MinIO | 仓库Dockerfile.minio固定源码构建 / campusloop-m5-p4-minio | 127.0.0.1:19000，公共/私有双桶 |
| M7 / M8 | 基线提交中的真实Python HTTP服务 | 测试fixture临时loopback端口；浏览器运行18787/18788 |

| 验证 | 实际结果 |
|---|---|
| 空测试库升级 | 通过 |
| 测试库 downgrade base → upgrade head | 通过；只操作上述隔离测试库 |
| seed.py --check | 两遍全部表计数一致，第二遍新增均为0 |
| M5 专项 pytest | 10项通过，包括9项真实依赖集成和1项隐私投影单元测试 |
| 完整后端 pytest | 47 passed，0 failed，0 errors，0 skipped；42.862秒 |
| Ruff静态/格式、git diff --check | 通过，75个Python文件格式一致 |
| M7 / M8服务unittest | 31 / 17 项通过 |
| 前端SDK生成漂移/TypeScript | 通过；生成后git diff无内容差异 |
| 前端交易原型 | 8场景通过（Mock规则测试，不作真实联调替代） |
| 前端lint / build | 通过；存在既有大bundle提示，未扩大M5范围处理 |
| 现有Playwright浏览器回归 | 5 passed，0 failed；28.5秒；真实API/数据库/Redis/MinIO/M7/M8 |

pytest 有22条依赖弃用警告（Starlette BlockingPortal、botocore datetime.utcnow），无失败。
浏览器用例为 journey.spec.ts：真实双账号交易；求购约束与价格基线；游客浏览/失败恢复/
会话刷新/退出；移动导航与空状态；跨标签页账号切换不以新身份重试旧请求。
首次真实专项测试发现 StrictInput 对解码后的时间字符串不做自动转换；已在覆盖请求
显式解析 RFC 3339 并保留带时区验证。完整回归中的旧媒体断言按新审计上下文同步。
两处修正后才取得上述最终47项通过结果。

## 从干净检出复验

以下为 PowerShell；仓库根执行，服务名与端口应先确认未占用。
测试凭据只用于隔离开发容器，不读取生产 .env 的密钥。

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
docker run -d --name campusloop-m5-p4-db --label campusloop.task=m5-p4 -p 127.0.0.1:15432:5432 -e POSTGRES_USER=campusloop -e POSTGRES_PASSWORD=campusloop -e POSTGRES_DB=campusloop_test pgvector/pgvector:0.8.6-pg16
docker run -d --name campusloop-m5-p4-redis --label campusloop.task=m5-p4 -p 127.0.0.1:16379:6379 redis:7.4-alpine
docker build -f Dockerfile.minio -t campusloop-m5-p4-minio .
docker run -d --name campusloop-m5-p4-minio --label campusloop.task=m5-p4 -p 127.0.0.1:19000:9000 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin campusloop-m5-p4-minio server /data
# 服务就绪后继续；已有上述专用容器时用 docker start，避免重复创建。
docker exec campusloop-m5-p4-db pg_isready -U campusloop -d campusloop_test
docker exec campusloop-m5-p4-redis redis-cli ping
Invoke-WebRequest http://127.0.0.1:19000/minio/health/live
docker exec campusloop-m5-p4-minio mc alias set local http://127.0.0.1:9000 minioadmin minioadmin
docker exec campusloop-m5-p4-minio mc mb --ignore-existing local/campusloop-public
docker exec campusloop-m5-p4-minio mc mb --ignore-existing local/campusloop-private
docker exec campusloop-m5-p4-minio mc anonymous set download local/campusloop-public
docker exec campusloop-m5-p4-minio mc anonymous set none local/campusloop-private

$env:PYTHONUTF8='1'
$env:PYTHONPATH='backend;.'
$env:APP_ENV='test'
$env:DATABASE_URL='postgresql+psycopg://campusloop:campusloop@127.0.0.1:15432/campusloop_test'
$env:REDIS_URL='redis://127.0.0.1:16379/15'
$env:MINIO_ENDPOINT='127.0.0.1:19000'
$env:MINIO_ACCESS_KEY='minioadmin'
$env:MINIO_SECRET_KEY='minioadmin'
$env:MINIO_SECURE='false'
$env:S3_PUBLIC_BASE_URL='http://127.0.0.1:19000/campusloop-public'
$env:AUTH_SIGNING_KEY='m5-p4-local-test-signing-key-at-least-32-bytes'
$env:BASELINE_RPC_TOKEN='m5-p4-local-test-rpc-token-at-least-32-bytes'
$env:BASELINE_SERVICES_ENABLED='false'

# Alembic当前版本显式使用Windows locale读取INI，PYTHONUTF8不能覆盖该行为。
# 显式UTF-8读取配置，不修改M9共享配置；在专用空测试库升级。
.venv/Scripts/python.exe -c "from alembic.config import Config; from alembic import command; from pathlib import Path; c=Config(); c.file_config.read_string(Path('backend/alembic.ini').read_text(encoding='utf-8')); c.set_main_option('script_location','backend/alembic'); command.upgrade(c,'head')"
.venv/Scripts/python.exe backend/scripts/seed.py --check
.venv/Scripts/python.exe -m pytest backend/tests/test_governance_api.py backend/tests/test_governance_projection.py -q -ra
.venv/Scripts/python.exe -m pytest backend/tests -ra
.venv/Scripts/python.exe -m ruff check backend
.venv/Scripts/python.exe -m ruff format --check backend
.venv/Scripts/python.exe -m unittest discover -s services/m7_baseline/tests
.venv/Scripts/python.exe -m unittest discover -s services/m8_baseline/tests
```

隔离库回滚复验是在同一 Config 中依次调用 command.downgrade(c,'base') 和
command.upgrade(c,'head')，必须在种子/测试前执行，不能对用户业务库照做。
Linux CI 在 backend 目录直接执行 alembic upgrade head 即可，详见现有 ci.yml。
requires_postgres 在无数据库时会跳过：复验必须检查0 skipped，不能只看退出码。

前端现有契约回归（frontend目录）：

```powershell
npm ci
npm run sdk:check
git diff --exit-code -- src/sdk/generated/
npm run test:transaction
npm run lint
npm run build
npx playwright install chromium
```

浏览器使用上面的同一真实依赖、隔离测试数据。API环境额外设置
BASELINE_SERVICES_ENABLED=true、CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174、
M7_SERVICE_URL=http://127.0.0.1:18787、M8_SERVICE_URL=http://127.0.0.1:18788。
先执行 backend/scripts/reset_test_limiter.py，仅重置DB15测试限流计数。
默认serve.py使用8000；本机为避免其他服务冲突，调用时仅将uvicorn监听改为127.0.0.1:18000：

```powershell
.venv/Scripts/python.exe -c "import uvicorn,runpy; original=uvicorn.run; uvicorn.run=lambda *args,**kw: original(*args,**{**kw,'host':'127.0.0.1','port':18000}); runpy.run_path('backend/scripts/serve.py',run_name='__main__')"
# 独立frontend终端：
$env:VITE_API_BASE_URL='http://localhost:18000'
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
# 另一frontend终端：
$env:CAMPUSLOOP_UI_URL='http://localhost:5174'
npm run test:live
```

以上验证的前端是本任务基线中的现有MVP；M2的Phase4组分支没有合入此检出，
治理页面新增字段仅做静态调用核对，跨组联合浏览器验收待集成后完成。
本机原始成功JUnit位于忽略目录 `.codex-tmp/p4-backend-results.xml`；仓库仅归档脱敏记录，
不保存访问令牌、证据图或私聊截图。GitHub PR CI结果以对应最终head的checks为准。
