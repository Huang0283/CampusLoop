# T3 缺陷登记

缺陷统一交 M10，修复后由原执行人按原用例及相关回归复测；合并代码不等于通过。
失败记录不删除，旧 SHA 的证据保留在 `logs/` 与 `verification-output` 对应路径。

| ID | 关联用例 | 软件 SHA | 现象 | 影响范围 | 期望 | 缺陷 Issue | 状态 |
|---|---|---|---|---|---|---|---|
| T3-DEF-01 | C36 | `c090ce4db7b5f4f2e6f63be77eedad2b233e937a` | T1 数据包 `response-contract.json` 记录的 `openapiSha256=431ea96…`（对应 OpenAPI 提交 `87750c1`，2026-10-20）；当前 OpenAPI 为 `04352a09…`（2026-11-20 检出），期间变更 8 次、新增 14 条路由。`verify_data.py` 在契约哈希门禁处抛 `Response contract snapshot is stale` | T1 静态包校验无法完成：单元测试 13/14 通过，其后 20 个响应 mock 与搜索覆盖检查未执行到；live 导入尚未开始即被此门禁与审计环境双重阻塞 | 由 T1 审阅 `87750c1..HEAD` 的 OpenAPI 变更（本轮已确认是纯新增，无删改既有端点），重生成契约快照并登记新基线；不直接刷新掩盖漂移 | 待开单 | 新建 |

## 已核查、不判缺陷

| 项目 | 关联用例 | 结论 | 依据 | 受影响接口与用户行为 | 覆盖方式 |
|---|---|---|---|---|---|
| 媒体服务不可达时 `/health` 与 `/ready` 仍返回 ok | C04 | 符合当前探针契约范围，不登记缺陷 | `backend/app/api/routes/system.py` 的 `collect_dependency_status()` 只收集 `database` 与 `redis`，未包含对象存储；`openapi/campusloop.v1.yaml` 的 HealthResponse 亦未约定媒体项，实现与契约一致。媒体可用性由业务接口表达：`app/services/storage.py` 上传失败与 `app/api/routes/media.py` 读取私有图片失败均抛 `503 STORAGE_UNAVAILABLE` | 受影响：`POST /uploads/images`、`GET /chat/messages/{messageId}/image`、`GET /avatars/image`、`GET /admin/reports/{reportId}/evidence/{imageIndex}` 返回 503；用户表现为上传图片失败、聊天图片/头像/举报证据无法加载。不受影响：浏览商品、文字消息、报价、下单、评价 | C10（重启后图片可读）与 C27（媒体恢复及范围）用真实图片请求覆盖媒体可用性 |

判为范围限制而非缺陷的理由：

1. 健康探针的职责是判断“该实例能否接流量”。对象存储属外部依赖，若纳入 `/ready`，媒体故障会让所有 API 实例同时 503 并被编排层摘流，把“图片打不开”放大为“整站不可用”。
2. 契约层未承诺媒体参与健康检查，实现与契约一致，不构成“实现偏离契约”的缺陷要件。
3. 媒体故障有可断言的外部表现（503 `STORAGE_UNAVAILABLE`），并非静默失败。

可选改进（不在本 PR 范围，建议另开 Issue）：为对象存储增加独立探针，或为 `/health` 增加 `media` 依赖项并同步更新 openapi 契约；该项一旦实施，C04 的期望与本文结论需同步修订。

## 登记规则

- 一行一个缺陷，ID 形如 `T3-DEF-01`；与 Issue 编号对应时写真实 Issue 编号，不用占位编号。
- `现象` 写可复现的最小步骤与实际观察，不写推测结论。
- `状态` 只能写：新建 / 已修复待复测 / 复测通过 / 复测失败 / 不修复并说明理由。
- 阻塞类问题（环境或权限导致无法执行）登记到 `blocked` 段落，不混入缺陷。

## 阻塞登记

| ID | 关联用例 | 阻塞原因 | 已尝试的替代路径 | 需要谁解除 |
|---|---|---|---|---|
|  |  |  |  |  |

## 交付缺口登记：构建包与 EXE（C12）

| 项 | 结论 |
|---|---|
| 仓库产物 | 无 `exe` / `msi` / `appx` / `dmg` 文件 |
| 打包配置 | 无 electron / tauri / pyinstaller / pkg 配置；前端为 Vite Web 产物，后端为 Docker 镜像 |
| 交付形态 | Web + Docker Compose 部署，通过 `scripts/start-local.ps1` 启动 |
| 判定 | 属"未提供可执行安装包"的交付缺口，登记备查；项目当前形态本不产出 EXE，本轮不判失败 |

## 阻塞登记补充：C06 需第二台设备

| ID | 关联用例 | 阻塞原因 | 已尝试的替代路径 | 需要谁解除 |
|---|---|---|---|---|
| B-03 | T3-C06 | 需在第二台设备上完成 S08 主旅程 | 本轮以同一审计环境的两个独立浏览器上下文等价验证了会话隔离，但未满足"另一设备"的原始定义 | 具备第二台设备的执行人 |
| B-04 | T3-C36 | 无 T1 数据包要求的独立审计栈：`DATABASE_URL` 库名需含 `_audit_`、Redis 需 DB14/15、公共/私有桶名需含 `audit` 且互不相同、容器需带 `campusloop.audit.software-sha` 标签，并需预建 R/S 两个管理员账号与 `.codex-tmp/admins-permission.json` 私有凭据；本机只有日常栈（API 8001） | 已跑完静态包校验与守卫探测；PR 分支检出上契约快照自洽；未在日常库造数据、未改限流、未清理 Redis | M10 提供合规模拟审计环境与 R/S 凭据（T1 说明中的 `campusloop-pr142-audit-api` 一类） |
