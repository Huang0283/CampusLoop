# MQ2-07 Phase 3 CI 与质量门禁

> Owner：M10
> 日期：2026-09-29
> 状态：候选门禁；由 M9 在统一 CI 合入后生效。

## 必跑命令

### 前端 `CI-FE`

```text
cd frontend
npm ci
npm run sdk:check
npm run lint
npm run build
git diff --exit-code -- src/sdk/generated
```

通过阈值：全部退出码为 0；SDK 无漂移；不得有 TypeScript/ESLint 错误。bundle 超过 500 kB 当前记 P2 性能缺陷，Phase 5 前必须有拆分或书面预算。

### 后端质量 `CI-BE-QUALITY`

```text
cd backend
python -m pip install -r requirements.txt
ruff format --check .
ruff check .
python -m pytest -m "not integration"
```

通过阈值：Python 3.12；格式、Lint 和单元测试零失败。skip 必须只来自明确标记的外部集成依赖，不能用 skip 隐藏业务失败。

### 数据库与环境 `CI-BE-INTEGRATION`

```text
cd backend
alembic upgrade head
alembic downgrade base
alembic upgrade head
python scripts/seed.py --check
python -m pytest -m integration
python -m pytest tests/test_health.py -v
```

通过阈值：空库迁移、回滚、再迁移、两次种子和集成测试零失败；健康/就绪必须覆盖依赖正常与降级。

### 智能契约 `CI-AI-CONTRACT`

```text
python -m pip install -r scripts/m7_phase2/requirements.txt
python -m unittest discover -s scripts/m7_phase2 -p test_pipeline.py -v
python -m unittest discover -s scripts/m7_phase2 -p test_contracts.py -v
python scripts/m7_phase2/contract_check.py
python scripts/m7_phase2/pipeline.py verify
```

通过阈值：28 项数据测试、53 项契约测试、22 个样例、原始/派生哈希和字节重建全部通过。数量变化必须伴随版本、清单和评审说明。

### 文档与仓库 `CI-DOC`

```text
python scripts/mq_phase2/self_check.py
git diff --check <base>...HEAD
```

通过阈值：要求文件、32 个需求 ID、核心测试类别、链接目标和禁止占位符检查通过；无尾随空格。

## 失败归属

- OpenAPI/SDK 漂移：M6 修契约，M2/M3/M4 修消费者；不得手改生成文件。
- 前端编译/Lint：修改页面的 Owner。
- 认证/权限契约：M5。
- 业务状态/事务/错误：M6。
- 迁移、Compose、种子、CI 和运行环境：M9。
- 搜索/匹配契约与数据：M7；价格/信誉/风险：M8。
- 场景、门禁或证据缺失：M10；范围冲突和延期：M1。

## 合并规则

- P0/P1 缺陷或任何必跑 job 失败时禁止合并。
- 取消检查、删除失败测试、放宽断言或把异常改成 skip，必须按基线变更流程评审。
- Mock 页面可以在 Phase 2 通过构建，但不得据此通过 Phase 3 E2E。
- 没有真实环境时允许 PR 保持 Draft，不允许用作者本机截图替代 CI。

## 豁免流程

豁免必须写入 PR 和缺陷记录，包含失败 job、根因、风险、临时保护、Owner、修复 PR 和到期时间。只有 M1 与 M10 共同确认，且不涉及 P0/P1、安全、隐私、交易事实、迁移不可恢复或密钥泄露时才可临时豁免。最长 48 小时；到期未修复自动阻断后续合并。口头批准无效。

## 当前 CI 差异

- 后端分支 CI 已有 Ruff、迁移、种子、pytest 和前端 build。
- 当前 workflow 注释掉 `npm run sdk:check`，与本门禁不符；M9/M6 必须恢复。
- 当前 Compose 使用不可拉取的 `minio/minio:latest`，环境 job 在修复固定镜像前不能计为通过。
