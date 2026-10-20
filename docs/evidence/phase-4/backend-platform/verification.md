# M5 Phase 4 验证记录

执行者：M5 胡可铭；日期：2026-10-15（北京时间）。
被测源码：`c4687d5a44eb18d5a96af4bec03b85ec933da0be`；
基线：`cdf814364eec988e0d197c0a0098a92eb5db4d6e`。
逐用例记录：[evidence/m5-api-results.json](evidence/m5-api-results.json)。
作者自检不是 M10 独立验收或其他成员签字。

## H4-06 修复复验

后续修复将 `ReportWrite.description`、OpenAPI `ReportWriteRequest.description` 与现有数据库
`reports.description VARCHAR(1000)` 统一。1000 个字符的举报描述可以创建；1001 个字符在
Pydantic 请求校验阶段返回 `422 VALIDATION_ERROR`，字段为 `body.description`，不会执行数据库
写入，也不会返回误导性的 `503 Database unavailable`。对应测试为
`test_report_description_matches_database_limit`。

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
---

以下保留 M9 分支原始验证记录，不视为本次联合提交已通过。最新复验结果另行记录。
# BP4 验证记录（verification，backend-platform）

> 证据文件：`docs/evidence/phase-4/backend-platform/verification.md`
> 维护人：M9 ｜ 汇集 BP4-07/08/09 全部验证证据
> 原则：只记录真实执行过的验证；未执行项明确标注"待执行"，不编造结果。

## 一、静态与单元验证（本地开发环境，M9，已执行）

| 验证项 | 命令 | 结果 |
|---|---|---|
| ruff format | `ruff format .`（后端 80 文件） | ✅ 80 files already formatted（新增/修改文件已按项目风格重排） |
| ruff lint（E/W/F/I/B/UP） | `ruff check .` | ✅ All checks passed!（修复 3 处未用 import 后全绿） |
| worker 运行时单测 | `pytest tests/test_worker_runtime.py`（独立运行模式） | ✅ **10 passed**（17.43s，详见执行记录） |
| 关键文件编译检查 | `py_compile`（迁移 0009 / worker 三模块 / 两脚本 / serve / config / matching_jobs） | ✅ 全部通过 |
| 全量测试套件（含队列集成语义回归） | `pytest`（CI 提供 PostgreSQL/MinIO 容器） | 待 CI（本 PR 触发） |
| 迁移空库升级 + 回滚复升 | `alembic upgrade head && alembic downgrade base && alembic upgrade head`（CI 步骤） | 待 CI |

**执行记录**（M9 本地，开发验证 venv）：

- 日期：2026-10-12（本地会话）
- 环境：Python 3.12.14 / pytest 9.1.1 / sqlalchemy 2.0.x / ruff 0.17.0
- 单测输出摘录：

```
collected 10 items
test_worker_runtime.py ..........                          [100%]
============================= 10 passed in 17.43s ==============================
```

- 说明：本地开发环境未装全 requirements（无 PostgreSQL/MinIO 容器），
  单测以独立模式执行（等价于 CI 中 `pytest tests/test_worker_runtime.py`；
  该测试文件刻意不依赖 PG——观测表无 PG 专有类型、健康端点用标准库）。
  conftest 的集成夹具仅在全量套件中生效，不影响本文件 10 个用例的语义。
- 测试覆盖：/healthz 200/503 契约、observer 内存计数与 sqlite 落地
  （含丢弃上限、坏事件容错、最终心跳）、钩子容错、baseline 绑定校验、
  phase-3 兼容默认值锁定。

## 二、CI 验证（GitHub Actions，PR 触发后填写）

| 验证项 | 结果 | 证据 |
|---|---|---|
| backend / format & lint | 待 CI | run 链接待填 |
| backend / migrations, seed & tests（含 0009 空库升级+回滚+复升） | 待 CI | 同上 |
| frontend / sdk & build | 待 CI | 同上 |

链接：待填（PR 创建后，从 PR Checks 页复制 run 链接）

## 三、干净环境完整 Compose 验证（BP4-07 验收口径，M9 机器）

> 前置：沿用 BP2-09 的干净环境标准流程（startup-guide.md），
> 新增服务的构建走同一 backend/Dockerfile（无新基础镜像、无新外网依赖）。

### 记录表（2026-10-15 已执行）

| 验证项 | 期望结果 | 实际结果 |
|---|---|---|
| `docker compose up -d --build` | 7 服务全部创建：db/redis/minio/minio-init/api/**baseline**/**worker** | ✅ 7 服务全部创建（镜像初建于本机此前会话完成，本轮直接复用） |
| `docker compose ps` | api/baseline/worker 均 healthy；baseline 不发布宿主端口 | ✅ 7 服务全部 Up，api/worker/baseline 均 healthy |
| worker `/healthz`（宿主 8002） | `{"status":"ok",...,"queue":{"reachable":true},...}` | ✅ `status=ok`，checks.mainLoopAlive/dbReachable、queue.reachable 均 true，queue.pending=0；workerId=worker-869aab7f32b6-1（见摘录三） |
| 观测落库 | `SELECT count(*) FROM ai_task_runs;` 随任务执行增长；`worker_heartbeats` 有心跳行 | ✅ ai_task_runs 随网页编辑求购帖逐次增长（见执行记录摘录一）；worker_heartbeats 4 行：3 条历史实例行（容器重建所致）+ 当前实例 worker-869aab7f32b6-1（runs_total=6、runs_failed=0，与 /healthz 一致，见摘录三） |
| **模型关闭实验** | `docker compose stop baseline` → api 仍 healthy、`/health` 依赖 ok；worker 任务**降级而不失败**：RPC 不可达时 `call_baseline` 就地回退内嵌引擎，任务仍 DONE，降级标记写入 `matching_results.metadata`（degraded=true，fallbackReason=SERVICE_UNAVAILABLE）；`docker compose start baseline` 后自动恢复正常路径 | ✅ 完整执行"正常→降级→恢复"三态闭环，matching_results 四条时间线（见执行记录摘录二） |
| SQL 定位能力（BP4-08 口径） | 按 ai-observability.md 第三节 SQL 能回答：输入版本/处理服务/失败原因/重试次数 | ✅ ai_task_runs 可定位 outcome/attempt/duration_ms/result_version；降级原因经 matching_results.metadata 按 wanted_id/updated_at 关联定位 |
| 环境记录 | `uname -a`、`docker --version`、`docker compose version` | ✅ Windows 10（Git Bash / MINGW64，x86_64）、Docker 29.8.2、Docker Compose v5.5.1 |

**执行记录**（2026-10-15 实测）：

- 日期：2026-10-15（本地会话，北京时间）
- 机器/系统：Windows 10（Git Bash / MINGW64，x86_64）+ Docker Desktop（Docker 29.8.2 / Compose v5.5.1），与 BP2-09 同机
- 检出的分支与提交号：`task/m9-p4-worker-runtime` @ `5ccfe03`
- 关键输出摘录：

摘录一：实验 A —— 编辑求购帖触发匹配任务，任务记录（`ai_task_runs`）：

```
 task_id | outcome | attempt | duration_ms | error_code | result_version
---------+---------+---------+-------------+------------+------------------------------------------------------------------
       1 | DONE    |       1 |         428 |            | f45b4cb9d8c4c14b12e5bab72b37e6687e5cd8dc6ad30fba6511530e9e7abdc3
       2 | DONE    |       1 |        7880 |            | 3d0c2222318c465a46c9df20ad3a1b0257c58f3669edd57e5bd572cc75a3a3c1
(2 rows)
```

摘录二：实验 B —— 模型关闭实验降级时间线（`matching_results.metadata`）：

```
 wanted_id | degraded |    fallbackReason    | updated_at
-----------+----------+----------------------+------------
      3006 | false    |                      | 14:36:27   ← start baseline 恢复后：自动回到正常路径
      3005 | true     | SERVICE_UNAVAILABLE  | 14:31:27   ← stop baseline 期间：降级兜底，任务仍成功
      3004 | true     | SERVICE_UNAVAILABLE  | 14:11:01   ← 同上
      3003 | false    |                      | 14:01:33   ← 正常基线
(4 rows)
```

- 说明：摘录按实测终端输出截图整理（时间列仅示时刻部分）；
  stop baseline 期间网页端 API 主链路、注册/发帖等功能全程正常。

摘录三：worker `/healthz` 关键字段（完整 JSON 截图留存）与 `worker_heartbeats`：

```
{"status":"ok","workerId":"worker-869aab7f32b6-1","workerVersion":"bp4-worker-runtime-v1",
 "secondsSinceLastLoopTick":0.113,
 "runs":{"total":6,"succeeded":4,"skipped":2,"retryScheduled":0,"failed":0,
         "workerFailure":0,"droppedEvents":0,"dbWriteErrors":0},
 "queue":{"reachable":true,"pending":0,"oldestPendingSeconds":null},
 "checks":{"mainLoopAlive":true,"dbReachable":true}}
```

```
 worker_id              | version               | runs_total | runs_failed
------------------------+-----------------------+------------+-------------
 worker-574c7778e268-1  | bp4-worker-runtime-v1 |          0 |           0
 worker-9bdee26a6591-1  | bp4-worker-runtime-v1 |          0 |           0
 worker-2f62d6d1df0b-1  | bp4-worker-runtime-v1 |          0 |           0
 worker-869aab7f32b6-1  | bp4-worker-runtime-v1 |          6 |           0
(4 rows)
```

- `/healthz` 的 recentRuns 与 ai_task_runs 一一对应：6 次运行 =
  4 次 DONE（task 1–4，对应 3003–3006）+ 2 次 SKIPPED（求购帖状态
  变更后触发，业务输入不再有效，无需重算——SKIPPED 语义正常）；
  failed=0，droppedEvents=0；
- worker_heartbeats 为按 worker_id UPSERT：3 条 runs_total=0 的行为
  容器重建期间的历史实例（身份含 hostname-pid），当前实例
  worker-869aab7f32b6-1 runs_total=6、runs_failed=0，与 /healthz 一致。

## 四、已知未验证项声明

- 完整 Compose 拓扑验证（第三节）已于 2026-10-15 在 M9 机器全部执行：
  服务编排、worker /healthz、观测落库（ai_task_runs + worker_heartbeats）、
  模型关闭实验、SQL 定位能力、环境记录共 7 项全部通过；其中模型关闭
  实验含"正常→降级→恢复"三态闭环实测。
- BP4-10 联合测试（与 M5/M6/FE/AI 的重复、乱序、超时、权限场景）：
  待小组集成分支合并后执行，M9 负责运行时环境与观测取证部分。
- M6/M7 真实模型服务接入后的观测字段扩展（algorithmVersion 落
  ai_task_runs）：属 M6 结果落库迁移范围，M9 仅预留口径（见
  ai-observability.md 第二节），不提前实现。
