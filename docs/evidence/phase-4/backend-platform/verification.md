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

### 记录表（执行后填写）

| 验证项 | 期望结果 | 实际结果 |
|---|---|---|
| `docker compose up -d --build` | 7 服务全部创建：db/redis/minio/minio-init/api/**baseline**/**worker** | 待填 |
| `docker compose ps` | api/baseline/worker 均 healthy；baseline 不发布宿主端口 | 待填 |
| worker `/healthz`（宿主 8002） | `{"status":"ok",...,"queue":{"reachable":true},...}` | 待填 |
| 观测落库 | `SELECT count(*) FROM ai_task_runs;` 随任务执行增长；`worker_heartbeats` 有心跳行 | 待填 |
| **模型关闭实验** | `docker compose stop baseline` → api 仍 healthy、`/health` 依赖 ok；worker 任务进有界重试（`error_code=SERVICE_DISABLED` 计数增长）；`docker compose start baseline` 恢复 | 待填 |
| SQL 定位能力（BP4-08 口径） | 按 ai-observability.md 第三节 SQL 能回答：输入版本/处理服务/失败原因/重试次数 | 待填 |
| 环境记录 | `uname -a`、`docker --version`、`docker compose version` | 待填 |

**执行记录**（执行后填写）：

- 日期：待填
- 机器/系统：待填（Windows / Git Bash + Docker Desktop，与 BP2-09 同机）
- 检出的分支与提交号：待填
- 关键输出摘录：待填（/healthz JSON、stop baseline 前后对比、SQL 结果）

## 四、已知未验证项声明

- 完整 Compose 拓扑验证（第三节）在提交时尚未执行——不宣称已通过。
- BP4-10 联合测试（与 M5/M6/FE/AI 的重复、乱序、超时、权限场景）：
  待小组集成分支合并后执行，M9 负责运行时环境与观测取证部分。
- M6/M7 真实模型服务接入后的观测字段扩展（algorithmVersion 落
  ai_task_runs）：属 M6 结果落库迁移范围，M9 仅预留口径（见
  ai-observability.md 第二节），不提前实现。
