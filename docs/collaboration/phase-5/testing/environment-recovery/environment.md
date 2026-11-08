# T3 测试环境记录

本文件记录执行环境的具体构成，供 T2 汇总、U2 修部署说明、M10 复核使用。
凭据、令牌、真人邮箱一律不写入本文件。

## 本机环境

| 项目 | 实际值 | 采集时间 |
|---|---|---|
| 操作系统 | Windows 11 家庭版 中文版 10.0.26200（Build 26200） | 2026-11-08 11:20 |
| Node / npm 版本 | Node v24.21.0 / npm 11.19.0 | 2026-11-08 11:20 |
| Python 版本 | 3.13.7（宿主机，仅用于 start-local 初始化；业务代码在容器内运行） | 2026-11-08 11:20 |
| Docker 版本 | Docker 29.8.2 / Compose v5.6.0 | 2026-11-08 11:20 |
| 浏览器与版本 | Edge 157.0.4341.42；Playwright Chromium build 1248（随 `frontend/node_modules` 固定） | 2026-11-08 11:44 |
| 前端端口 | 127.0.0.1:5174（vite dev server，`--strictPort`） | 2026-11-08 11:20 |
| 后端端口 | API 127.0.0.1:8001；Worker 探针 127.0.0.1:8002；DB 15432；Redis 16379；MinIO 19000/19001 | 2026-11-08 11:20 |
| 数据库实例与库名 | 容器 `campusloop-local-db-1`（pgvector 0.8.6-pg16）。日常库 `campusloop`；审计库 `campusloop_t3_audit`（同实例、独立库，仅 T3 用例写入） | 2026-11-08 11:20 |
| Redis 实例与 DB 号 | 容器 `campusloop-local-redis-1`（redis 7.4-alpine）。日常 DB0；审计 DB14 | 2026-11-08 11:20 |
| 媒体服务与桶名 | 容器 `campusloop-local-minio-1`（MinIO RELEASE.2025-10-15T17-29-55Z）。公共桶 `campusloop-public`，私有桶 `campusloop-private` | 2026-11-08 11:20 |

## 软件基线

| 项目 | 值 |
|---|---|
| 执行时完整 SHA | `d063588c3be59b1e9f013ff27e2a541cc03fed62` |
| 分支 | `main`（材料分支 `work/testing/environment-recovery`，材料 SHA `f77afc1`） |
| 依赖安装方式 | `scripts/start-local.ps1` 构建 `campusloop-local-api:dev`（镜像带 `campusloop.sourceFingerprint` 标签）；前端使用 `frontend/node_modules` 中已安装依赖，vite 直接服务当前 checkout |
| 与上轮基线的差异 | 开测前本机运行的是 2026-10-26 构建的镜像（迁移只到 `0011`，缺 `moderation`、`admin_console` 模块），已按 `AGENTS.md` 用 `start-local` 重建为 `0012 (head)` |

> 基线会随 main 前进而变化。每条执行记录都要写当时实际 SHA，不要沿用文档里的旧 SHA。

**版本一致性取证（C05）**：容器内 `app/main.py` 的 sha256 = `89ecf55535c885f1d4c2e159c51908a0221e34114a14a5ff968650e23c269033`，
与仓库 `main` 同名文件逐字节一致；`/openapi.json` 的 `info.version = 0.5.0-rc.1`；Worker `/healthz` 的
`workerVersion = bp4-worker-runtime-v1`，与 API 同镜像。证据见 `logs/c05-code-identity.log`。

## 隔离约束核对

- [x] 写入类验证使用独立审计数据库 `campusloop_t3_audit`，未使用日常库 `campusloop`
- [x] Redis 使用 DB14（C03 种子校验显式指定 `REDIS_URL=…:6379/14`）
- [x] 未在审计环境之外做禁用、下架、复位或故障注入：C04 的依赖中断全部在一次性容器
      `t3-audit-pg`、`t3-audit-redis`、`t3-audit-api`、`t3-audit-worker` 上制造，日常栈未停任何依赖，用完即删
- [x] 未删除任何数据卷（旧栈卷 `campusloop_*` 完整保留，仅停止其容器）
- [x] 演示账号与随机凭据未写入版本库（`.env` 与 `t3-audit-*.env` 均在仓库外或已删除）

## 服务启动方式

记录实际使用的命令与端口，若与文档不一致，说明原因：

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -NoBrowser
# 项目名 campusloop-local，端口 8001(API) / 5174(前端) / 15432(DB) / 16379(Redis) / 19000(MinIO)
```

偏离说明：`Dockerfile.minio` 在构建阶段需要 `github.com` 与 Go 模块网络，本次构建容器内访问 `github.com:443` 失败。
改用本机已有的 2026-10-13 构建镜像并打标签 `campusloop-local-minio:dev`；该镜像内
`minio version RELEASE.2025-10-15T17-29-55Z`、`mc version RELEASE.2025-08-13T08-35-41Z`，
与当前 `Dockerfile.minio` 固定 tag 完全一致，属于相同构建输入的等价产物。

## 已知环境限制

| 限制 | 影响用例 | 替代方案 | 是否已记阻塞 |
|---|---|---|---|
| Docker 构建容器内无法访问 `github.com:443`，MinIO 镜像无法现场重建 | 无（用等价镜像打标签） | 复用同 tag 同版本的本地镜像 | 否 |
| `/health` 与 `/ready` 只探测 database 与 redis，媒体服务不在探测范围 | C04 | 媒体在 C04 中只记录为范围限制；媒体可用性由 C10（重启后图片可读）与 C27（媒体恢复及范围）用真实图片请求覆盖 | 否（范围限制，非缺陷） |
| 无独立审计栈，审计库与日常库同实例 | C19–C30 | 审计库为独立库名，写操作只作用于 `campusloop_t3_audit`；并发与备份类用例执行前逐条复核 `DATABASE_URL` | 否 |
