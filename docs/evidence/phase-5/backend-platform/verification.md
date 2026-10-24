# M6 验证记录与复现方法

2026-10-23；Windows PowerShell；本地 Python 3.13.7；仓库 CI 指定 Python 3.12、Node 22。本地复用 P4 虚拟环境中的同版后端依赖，但运行源码和目录均为 CampusLoop-M6-P5-Git；前端从 P5 锁文件安装。
基线 2eb166897fa1953b4514eef72b6d06baa869cf34；内容指纹见 evidence/m6-source-sha256.json。检查摘要保留真实绝对路径以便审计，未声称干净 CI 已复验。

## 实际结果

| 检查 | 结果 | evidence/ 下原始证据 |
| --- | --- | --- |
| Ruff lint / format | 通过，78 个后端文件格式检查通过 | m6-ruff.log、m6-format.log |
| 后端 pytest | 82 passed / 37 skipped / 1 xfailed；1 个第三方警告 | m6-backend.log、m6-backend-tests.xml |
| 结构契约 | 61 operations、9 enums、16 examples 通过 | m6-contract.log |
| M7 / M8 | 31 / 17 个基线测试通过 | m6-m7.log、m6-m8.log |
| SDK 生成/编译 | 通过，两次生成字节一致 | m6-sdk.log、m6-sdk-regenerate.log、m6-sdk-drift.log |
| 前端 lint / build | 通过，有大于 500KB 分块警告 | m6-frontend-lint.log、m6-frontend-build.log |
| 前端交易 Mock | 8 个场景通过 | m6-frontend-mock.log |
| 严格完整验收 | 未通过，38 项 skip/xfail，integrationAccepted=false | m6-check-summary.json |

37 个数据库相关用例跳过；1 个严格 xfail 是本基线未集成 M5 管理员路由。pytest 返回 0 不能代表验收完成。npm 安装报告继承锁文件中 7 项 high 漏洞，尚未升级或宣称解决，由前端依赖 Owner/M1 评估。

## 普通复现

安装 Python 3.12 和 Node 22，在仓库根 PowerShell 执行：

    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
    .\.venv\Scripts\python.exe scripts/m6_phase5/verify.py
    Push-Location frontend
    npm ci
    npm run sdk:check
    git diff --exit-code -- src/sdk/generated/
    npm run lint
    npm run build
    npm run test:transaction
    Pop-Location

脚本会覆盖对应 evidence 日志；新执行后需同步报告，不能把旧“通过”结论配上新失败日志。逐条 skip 原因见 JUnit。

## 严格集成复验

1. M9 提供专用可清理测试数据库；不能指向真实业务库。沿用 .github/workflows/ci.yml 的 pgvector/Postgres、Redis DB 15、对象存储配置，设置 DATABASE_URL、REDIS_URL、AUTH_SIGNING_KEY 等测试变量，不提交真实配置。
2. M5 合入治理路由后，由 M6 确认并移除 test_group_release_requires_m5_documented_routes 的 xfail 标记。
3. 在 backend 中用后端环境 Python 执行 python -m alembic upgrade head；迁移回滚/恢复由 M9 负责。本次未修改这些文件。
4. 在仓库根执行：

    .\.venv\Scripts\python.exe scripts/m6_phase5/verify.py --require-integration

退出 0 表示脚本检查无失败/跳过；失败返回 1；仍有 skip/xfail 返回 2。还需 M10 在最终同一提交执行真实浏览器回归和非作者验收。
5. 执行 SDK 生成与 diff，提交新证据，记录实际 commit、环境、接收人和结论。

既有 CI 普通 pytest 允许 xfail，绿灯不能替代严格门禁；M9 如需将严格脚本加入发布 workflow，由 M9 在其拥有文件中实施。
