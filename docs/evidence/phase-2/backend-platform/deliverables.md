# BP2 后端平台交付物清单（deliverables）

> 证据文件：`docs/evidence/phase-2/backend-platform/deliverables.md`
> 维护人：M9 ｜ 对应 Issue：BP-P2 后端平台（M9 承担部分）
> 状态标记：✅ 已交付 ｜ 🔧 已交付待机房补证 ｜ ⏸ 依赖他组 ｜ ❌ 未开始

## 代码与配置

| 交付物 | 路径 | 状态 | 证据 |
|---|---|---|---|
| FastAPI 骨架（工厂/requestId/CORS） | `backend/app/` | ✅ | PR #76，runtime-foundation.md |
| 配置加载 + `.env.example` | `backend/app/core/config.py`、根 `.env.example` | ✅ | 同上 |
| 结构化日志（JSON+脱敏） | `backend/app/core/logging.py` | ✅ | 同上 |
| /health /ready | `backend/app/api/routes/system.py` | ✅ | test_health.py 5/5 |
| ORM 模型（15 表） | `backend/app/models/` | ✅ | migration-review.md（含三方一致性修复） |
| 首版迁移（含回滚） | `backend/alembic/versions/0001_*.py` | ✅ | CI 回滚步骤绿 |
| 种子脚本（幂等+自检） | `backend/scripts/seed.py` | ✅ | CI 种子两遍绿 |
| pytest 套件 | `backend/tests/` | ✅ | CI 全绿 |
| 一键 Compose（五服务） | `docker-compose.yml` | ✅ | 镜像已全固定 tag（验收整改） |
| 后端 Dockerfile（非 root） | `backend/Dockerfile` | ✅ | — |
| GitHub Actions CI（三门禁） | `.github/workflows/ci.yml` | ✅ | ci-contract.md（sdk:check 已恢复） |

## 证据文档（docs/evidence/phase-2/backend-platform/）

| 文档 | 状态 |
|---|---|
| runtime-foundation.md | ✅ 本批 |
| migration-review.md | ✅ 本批（含三方一致性修复记录） |
| test-data-catalog.md | ✅ 本批 |
| startup-guide.md | ✅ 本批（含干净环境标准流程与国内镜像应急方案） |
| ci-contract.md | ✅ 本批（含 sdk:check 恢复与 CI 范围边界声明） |
| deliverables.md | ✅ 本文件 |
| verification.md | ✅ 全部证据已填齐（2026-10-12 干净环境验证通过，含 5 次执行事件链与日志归档） |
| handoff.md | ✅ 本批 |

## 验收整改对照（负责人评审意见 → 处理）

| 评审意见 | 处理 | 状态 |
|---|---|---|
| MinIO 使用 latest 无法拉取，需固定 registry/tag | 一轮整改（09-29）：固定 RELEASE tag。二轮整改（10-08）：官方删除 Docker Hub 仓库（09-11）并关闭 quay 匿名拉取（09-24），改为 `Dockerfile.minio` 从固定源码 tag 自建，版本号不变，不再依赖任何第三方 registry | ✅ 两轮修复 |
| CI 未执行 SDK 漂移检查（sdk:check 被注释） | 门禁恢复；恢复前本地预检无漂移、tsc 通过 | ✅ 一轮修复，CI 已全绿 |
| CI 绿灯 ≠ 完整 Compose 通过 | ci-contract.md 明确范围边界；10-08 首次执行捕获 MinIO 官方下架（非项目缺陷）→ 源码自建二轮整改；10-12 复跑通过（@1f46ecc，Windows），四份失败日志 + 一份成功日志全链路留档 | ✅ 验收闭环 |
| 缺全部 8 份证据文档 | 已提交 8 份；verification.md 待补区已于 2026-10-12 全部填写 | ✅ |

## 明确不在本交付范围（依赖他组，见 handoff.md）

- M5 认证契约与正式密码方案（种子 scrypt 为演示过渡）
- M6 业务契约修复与 SDK 正式重生成（本批仅恢复漂移门禁）
- 后端组内汇总 PR 与跨组验收（顺序：M5 → M6 → M9 补证 → 汇总）
