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
| verification.md | 🔧 CI/本地证据已填；干净环境 Compose 记录待机房执行后补 |
| handoff.md | ✅ 本批 |

## 验收整改对照（负责人评审意见 → 处理）

| 评审意见 | 处理 | 状态 |
|---|---|---|
| MinIO 使用 latest 无法拉取，需固定 registry/tag | compose 四镜像全部固定 tag，附国内镜像应急方案 | ✅ 本批修复 |
| CI 未执行 SDK 漂移检查（sdk:check 被注释） | 门禁恢复；恢复前本地预检无漂移、tsc 通过 | ✅ 本批修复 |
| CI 绿灯 ≠ 完整 Compose 通过 | ci-contract.md 明确范围边界；干净环境流程与记录表就绪 | 🔧 待机房执行 |
| 缺全部 8 份证据文档 | 本批提交 8 份（verification.md 含待补区，不编造） | ✅/🔧 |

## 明确不在本交付范围（依赖他组，见 handoff.md）

- M5 认证契约与正式密码方案（种子 scrypt 为演示过渡）
- M6 业务契约修复与 SDK 正式重生成（本批仅恢复漂移门禁）
- 后端组内汇总 PR 与跨组验收（顺序：M5 → M6 → M9 补证 → 汇总）
