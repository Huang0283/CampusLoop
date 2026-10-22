# M6 第四阶段独立验收与修复

验收日期：2026-10-15。验收对象：PR #102，合并提交 `9fe2ee65ce32b778ad3df554cff4c2b30afa3211`。
对应任务：Issue #30 的 BP4-03、BP4-04、BP4-05、BP4-06。
修复分支：`fix/m6-p4-acceptance`，PR 目标：`phase4/backend-integration`。

## 验收结论

版本化事务任务、重复事件去重、五次失败终止、旧事件按当前事实重算、结果与通知原子性、首次商品匹配通知去重，以及模型故障下的基础发布隔离均已有实现。原有 M6 专项测试在真实数据库上执行，37 项通过，无跳过。

本次补充输入和远端响应边界测试，发现并修复两类问题。修复后完整后端测试 95 项通过，无失败、无跳过。可以接收 M6 本人的编排/API/降级修复；此结论不代表第四阶段跨组验收或冻结完成。

## 问题与修复

1. 搜索价格筛选可接收 `inf`、`1e309`，金额换算抛出 `OverflowError`。有限但过大的 `1e308` 在乘以 100 后也溢出。现在路由拒绝非有限数，业务换算前再次检查缩放结果，统一返回 422，不产生服务器错误。普通金额和预算倒序校验沿用原有规则。
2. 价格适配器只检查区间及部分字段，负数/布尔/NaN 样本数、错误类型的说明、空降级原因和未批准的不可用结果版本可能透传；超大整数区间还可能在业务投影时溢出。现在校验业务输出使用的元数据、已准入规则版本、降级标志及金额范围；坏响应统一变成 `UNAVAILABLE` / `INVALID_SERVICE_RESPONSE`，上下限为空，继续允许手动定价。

新增测试先在原实现运行：当时 12 个初始边界用例中 11 个失败，复现响应被错误接收及搜索数值溢出；随后补充极大有限数、空版本和超大区间回归。

未改变 API 路径、字段、枚举、OpenAPI、生成 SDK、表结构、迁移、订单状态机或 M9 Worker 配置。M8 的 NO_GO 门禁继续生效，只接受既有 `m8-price-rule-v1` 或显式不可用，不启用价格模型。

## 运行环境与实际检查

独立工作区，Linux 容器内 Python 3.12，依赖来自已有项目验证镜像；独立 PostgreSQL 测试库 `campusloop_m6_p4_test`，迁移 0001 至 0008；Redis 专用 DB 15，真实 MinIO。没有在用户演示数据库运行测试，也没有重启现有演示服务。

在 backend 目录执行：

```text
alembic upgrade head
python -m pytest -ra -p no:cacheprovider --tb=short
python -m ruff check --no-cache .
python -m ruff format --check --no-cache .
```

- 空测试库升级成功。
- 完整后端测试：95 passed，42.11 秒，0 skipped。
- Ruff 静态与格式检查通过，77 个文件符合格式。
- 既有依赖弃用提示 25 条，来自 Starlette/AnyIO 与 botocore，不是测试失败。

在仓库根目录执行：

```text
python -m unittest discover -s scripts/m6_phase4 -v
python -m unittest discover -s services/m7_baseline/tests -q
python -m unittest discover -s services/m8_baseline/tests -q
```

分别为 7、31、17 项通过。治理契约检查也包含 SDK 操作入口和价格状态可表示性；本次没有改动契约及生成文件。

完整后端回归覆盖真实账号、商品/求购发布、搜索/匹配、越权、超时降级、任务事务回滚、重复事件、领取锁、旧快照重试、关闭求购、通知去重、交易 API、治理及私有媒体。浏览器跨组联合验收未在本次重复执行，不以服务端测试代替签字。

## 合并边界与待接收事项

本次修复从最新已合 M6 的后端分支建立，仅改 M6 智能 API、适配器、输入投影及对应测试，使用单独验收文档，避开 M9 正在修改的 `matching_jobs.py` 与公共交付文档。

验收时 `origin/task/m9-p4-worker-runtime` 为 `5ccfe03`。在本次修复前，对其与后端集成提交 `9fe2ee6` 执行 `git merge-tree --write-tree`，已存在以下冲突：

- `backend/app/services/matching_jobs.py`。
- `docs/evidence/phase-4/backend-platform/deliverables.md`。
- `docs/evidence/phase-4/backend-platform/handoff.md`。
- `docs/evidence/phase-4/backend-platform/verification.md`。

这些是 M6/M9 现有分支之间的冲突，本次未新增对这四个文件的修改。M9 按原 Issue 规定先接收 M6 最新基线，再合并自身 Worker/观测改动；不能直接用旧版覆盖任务幂等和重试修复。

仍待 BP4-10：M7/M8 结果与版本确认、M2/M3 页面消费、M9 部署/观测/迁移证据，以及阶段集成环境的真实浏览器正常与降级验收。Issue #30 包含其他成员与共同任务，继续保持开启；本次不将第四阶段合入 main。
