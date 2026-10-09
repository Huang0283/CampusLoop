# BP2 后端平台交付索引

本文件按 M5、M9 分章保留各自交付与证据。个人记录不代表后端小组联合验收完成。

## BP2 交付索引：M5 个人输入

Owner：M5（胡可铭）｜2026-10-08｜任务分支：`task/m5-p2-auth-contracts`。

本索引记录 M5 的 BP2-01、BP2-02 和 BP2-11 走查准备；不把 M6/M9 或小组共同任务写成已验收。阶段和范围以 [Issue #21](https://github.com/Huang0283/CampusLoop/issues/21) 为准。

| 任务 | 交付文件 | 内容 | 当前证据等级 |
|---|---|---|---|
| BP2-01 | [auth-contract.md](auth-contract.md) | 七个操作，请求/响应/权限/错误/失败恢复和虚构样例 | 个人设计文档；待同组与消费者评审 |
| BP2-01 | [auth-openapi-input.md](auth-openapi-input.md) | operationId、schema、序列化来源、M6 合入清单 | canonical 输入；未生成 SDK |
| BP2-02 | [auth-security-design.md](auth-security-design.md) | Argon2id、JWT、刷新链、撤销、WS、限流、字段及 18 个测试场景 | 设计与测试预期；非服务运行证据 |
| BP2-11 | [contract-signoff.md](contract-signoff.md) | 上游提交、9 项差异、决策输入与接收状态 | 联合评审登记，尚未完成共同签署 |
| 阶段证据 | [verification.md](verification.md) | 可复现结构/样例/所有权检查与实际结果 | 仅文档验证 |
| 阶段交接 | [handoff.md](handoff.md) | 下游 Owner、接收动作、阻塞和截止门禁 | 个人交接，保留组内汇总责任 |

本 PR 不修改 `openapi/campusloop.v1.yaml`、`frontend/src/sdk/generated/`、后端模型/迁移/种子、Compose 或 CI。公开市场读权限按照 Issue 最新内容处理，不以本地旧版 Issue 镜像遗漏为由要求游客登录。

M5 原始设计基线为 `c3a49290bf29cd54c1b569ed7a08dbd175891913`；本次已同步共享基线 `811e6249c5859f3d894de7014c0536ade73cdc71`（M9 #86 已合并）。当前个人交付提交由 PR head 和 `git log -1 --format=%H -- docs/evidence/phase-2/backend-platform/auth-contract.md` 确定。三份共享文档已按双方章节整合，保留各自证据来源，不代表完成 M5/M9 契约接收。

合并顺序：个人任务 PR → `phase2/backend-foundation`；个人交叉评审、M6 canonical 与 M9 接收完成后，M5 提交小组汇总 PR → `phase2/integration`；最后由 M1 收口 → `main`。已先合入的 M9 #76 不改写历史，后续差异按 PR 修正。

## BP2 后端平台交付物清单（deliverables）

> 证据文件：`docs/evidence/phase-2/backend-platform/deliverables.md`
> 维护人：M9 ｜ 对应 Issue：BP-P2 后端平台（M9 承担部分）
> 状态标记：✅ 已交付 ｜ 🔧 已交付待机房补证 ｜ ⏸ 依赖他组 ｜ ❌ 未开始

### 代码与配置

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

### 证据文档（docs/evidence/phase-2/backend-platform/）

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

### 验收整改对照（负责人评审意见 → 处理）

| 评审意见 | 处理 | 状态 |
|---|---|---|
| MinIO 使用 latest 无法拉取，需固定 registry/tag | 一轮整改（09-29）：固定 RELEASE tag。二轮整改（10-08）：官方删除 Docker Hub 仓库（09-11）并关闭 quay 匿名拉取（09-24），改为 `Dockerfile.minio` 从固定源码 tag 自建，版本号不变，不再依赖任何第三方 registry | ✅ 两轮修复 |
| CI 未执行 SDK 漂移检查（sdk:check 被注释） | 门禁恢复；恢复前本地预检无漂移、tsc 通过 | ✅ 一轮修复，CI 已全绿 |
| CI 绿灯 ≠ 完整 Compose 通过 | ci-contract.md 明确范围边界；干净环境流程与记录表就绪。首次执行（10-08）即捕获 MinIO 官方镜像下架——非项目缺陷，已按上述二轮整改，待复跑 | 🔧 待复跑取证 |
| 缺全部 8 份证据文档 | 已提交 8 份（verification.md 含待补区，不编造） | ✅/🔧 |

### 明确不在本交付范围（依赖他组，见 handoff.md）

- M5 认证契约与正式密码方案（种子 scrypt 为演示过渡）
- M6 业务契约修复与 SDK 正式重生成（本批仅恢复漂移门禁）
- 后端组内汇总 PR 与跨组验收（顺序：M5 → M6 → M9 补证 → 汇总）
