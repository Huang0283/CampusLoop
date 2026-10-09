# 后端验证入口

在没有后台 worker 的独立测试容器执行 `python -m pytest -v`、`python -m ruff check .`、`python -m ruff format --check .`。真实 PostgreSQL、Redis 14/15、MinIO 必须可达；跳过集成测试不能判为通过。不能在测试库的API/匹配worker仍运行时复跑pytest，否则调度与限流会相互干扰。

测试库有专用名称，测试前验证 APP_ENV 与 Redis 数据库号。空库迁移回滚仅允许专用 migration_audit 库。完整结果及实际提交见 ../management-quality/verification.md。通过作者测试不自动批准 Issue 关闭。
