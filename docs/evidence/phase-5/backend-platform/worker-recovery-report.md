# M9/P5 worker 容器恢复报告（真实故障复盘）

> 证据文件：`docs/evidence/phase-5/backend-platform/worker-recovery-report.md`
> 维护人：M9 ｜ 对应任务：BP5-06 部署指南「常见故障」配套证据、P5 部署恢复演练
> 原则：只记录真实执行过程；验证截图存于本目录。

## 一、故障概述

- 时间：2026-10-24 晚；
- 环境：M9 机器，工作区 `~/Desktop/111/CampusLoop`，分支 `task/m9-p5-deployment-recovery`；
- 现象：`docker compose up` 后 worker 容器 Restarting 循环，api/db/redis/minio 全部 healthy 正常——api 正常掩盖了缺口，只有 worker 容器暴露问题；
- 触发：P5 部署恢复演练中清理并重建容器，worker 重建后无法完成启动。

## 二、根因

工作区缺少 BP4-08「worker 运行时」交付的一组**互相咬合的增量文件（共 9 处，
4 个新增 + 5 个新增/更新，见第三节清单）**。该链路 api 镜像不加载，因此此前
所有以 api 健康为准的验收均未发现；worker 容器首次真正加载完整 import 链，
缺口才逐层暴露为 5 段连环报错。

## 三、暴露与修复过程（按 import 链逐层）

| # | 报错（`docker compose logs worker`） | 缺口 | 修复 |
|---|---|---|---|
| 1 | `can't open file '.../scripts/worker.py'` | worker 入口脚本 | 新增 `backend/scripts/worker.py` |
| 2 | `ModuleNotFoundError: No module named 'app.worker'` | worker 运行时包 | 新增 `backend/app/worker/` 四件套（`__init__.py` / `runner.py` / `observer.py` / `health.py`） |
| 3 | `ImportError: cannot import name 'AiTaskRun' from 'app.models'` | AI 运行数据模型及导出 | 新增 `backend/app/models/ai_runs.py`，更新 `backend/app/models/__init__.py` 导出 |
| 4 | `AttributeError: 'Settings' object has no attribute 'worker_id'` | worker 运行时配置字段 | 覆盖 `backend/app/core/config.py`（BP4-08 增补 4 个 worker 字段） |
| 5 | `AttributeError: module 'app.services.matching_jobs' has no attribute 'RUN_OBSERVERS'` | 观测开关 | 覆盖 `backend/app/services/matching_jobs.py` |

修复方式：9 处逐一补齐（git 每处独立提交），随后
`docker compose up -d --build api worker` 重建。

提交清单（提交号由维护人按 `git log --oneline` 回填）：

| 文件 | 处置 | 提交号 |
|---|---|---|
| `backend/scripts/worker.py` | 新增 | 待回填 |
| `backend/app/worker/__init__.py` | 新增 | 待回填 |
| `backend/app/worker/runner.py` | 新增 | 待回填 |
| `backend/app/worker/observer.py` | 新增 | 待回填 |
| `backend/app/worker/health.py` | 新增 | 待回填 |
| `backend/app/models/ai_runs.py` | 新增 | 待回填 |
| `backend/app/models/__init__.py` | 更新 | 待回填 |
| `backend/app/core/config.py` | 更新 | 待回填 |
| `backend/app/services/matching_jobs.py` | 更新 | 待回填 |

## 四、恢复验证（2026-10-24 深夜）

- `docker compose ps`：全部服务 Up，api `Up (healthy)`，
  worker `Up (healthy)`（宿主 8002 → 容器 8000 `/healthz` 探活通过）；
- worker 日志启动横幅正常：
  `worker 启动: id=worker-… version=bp4-worker-runtime-v1 health_port=8000`；
- 证据截图：`recovery-ps-final.png`（compose 全绿）、
  `recovery-worker-log.png`（worker 启动日志），存本目录。

## 五、验收要点沉淀（供 deployment-guide 引用）

BP4-08 交付为一组互相咬合的增量文件，同类部署验收不能只看 api 健康：

1. worker 日志必须出现 `bp4-worker-runtime-v1` 启动横幅；
2. `docker compose ps` 中 worker 必须为 `healthy`（而非仅 Up 或 Restarting）；
3. 更新 worker 相关文件后必须 `docker compose up -d --build` 重建，热替换不生效。
