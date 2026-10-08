# BP2 移交说明（handoff）

> 证据文件：`docs/evidence/phase-2/backend-platform/handoff.md`
> 维护人：M9 ｜ 移交对象：M5 / M6 / M7 / M8 / 后端组长

## 给 M5（认证）

- `users.password_hash`：Phase 2 种子用 stdlib scrypt + 固定盐演示（`scripts/seed.py`），
  **仅为过渡方案**，Phase 3 请替换为正式方案（建议 passlib/argon2），并同步更新种子脚本。
- `refresh_sessions` 表已按 BP2-02 设计落库：只存 SHA-256 token 哈希、软删除 revoked_at、
  `(user_id, revoked_at)` 索引。认证实现直接使用即可。
- 敏感字段可见性：模型文件内有注释标注，任何响应/日志不得返回 password_hash。
- 种子演示账号 4 个（`*.demo@example.com` / `Demo@12345`），见 test-data-catalog.md。

## 给 M6（业务契约）

- **三处列可空性需你拍板**（模型 vs 迁移不一致，均不阻塞启动）：
  | 列 | 模型 | 迁移 | 建议 |
  |---|---|---|---|
  | order_events.operator_id | NOT NULL | NULL | 迁移为准（系统事件无操作人） |
  | products.campus_location | NOT NULL | NULL | 任选一侧，另一侧对齐 |
  | reports.description | NULL | NOT NULL | 迁移为准（截图举报可无文字） |
  确认后出一个小迁移补齐即可（Phase 3 初统一处理）。
- `orders.product_id` 取消后重卖的唯一性方案仍待确认（部分唯一索引位置已预留）。
- 契约修订后必须重新生成 SDK 并提交：CI 的 `sdk:check` 门禁已恢复，
  OpenAPI 与 SDK 不同步导致前端编译失败会被直接拦下。

## 给 M7 / M8（检索 / AI）

- `products.embedding` 列已建：`vector(768)`，pgvector 扩展由迁移自动创建。
  维度 768 为候选，若选型后改 1024 需要一次专门迁移（列上无数据，代价小）。
- 求购匹配用的 `wanted_posts.requirements` JSONB 列已就绪。

## 给所有人（环境使用）

- 本地启动：见 startup-guide.md（干净环境标准流程 + 国内镜像应急方案）。
- **MinIO 镜像策略（2026-10-08 起）**：MinIO 官方已删除 Docker Hub 仓库并
  关闭 quay 匿名拉取，本项目改为 `Dockerfile.minio` 从固定源码 tag 自建
  （`docker compose up --build` 自动完成，首次约 3-10 分钟）。**任何人都不要
  把 compose 里的 minio 改回 `minio/minio:xxx` 之类的拉取写法——仓库已不存在。**
  长期备选（Phase 3 评估）：继续源码自建 / 迁移 Garage 或 RustFS。
- db/redis 保持固定 tag；**Python 文件修改务必拖拽上传，禁止网页编辑器粘贴**
  （会引入尾随空格，ruff 门禁必拦，已有真实案例）。
- `.env.example` 与 `app/core/config.py` 一一对应，新增配置两侧同步改。
- CI 三门禁说明与范围边界见 ci-contract.md：CI 不含 MinIO，
  完整环境验证按 startup-guide 单独取证。

## 已知问题与遗留

| 问题 | 影响 | Owner | 期限 |
|---|---|---|---|
| 干净环境 Compose 完整验证待复跑（首次因 MinIO 官方下架镜像失败，已整改） | BP2-09 验收最后一项 | M9 | 本周 |
| MinIO 上游停止分发镜像（本仓库已自建，但需关注 CVE） | 安全更新需自行跟踪/重建 | M9 | Phase 3 评估迁移 Garage/RustFS |
| 三处可空性差异 | 无功能影响，规范问题 | M6 确认 | Phase 3 初 |
| 种子密码为演示方案 | 不满足生产安全 | M5 | Phase 3 |
| orders 重卖唯一性 | 并发极小概率重复下单 | M6 | Phase 3 |
