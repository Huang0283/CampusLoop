# MQ2-08 非作者验证记录

> 执行日期：2026-09-29
> 执行人角色：M10 非作者技术复核
> 结论：前端和 M7 自动门禁通过；后端静态/单元门禁通过，完整环境因 MinIO 镜像阻塞未通过。

## 验证版本

- 前端：`phase2/frontend-prototype@b9efa31`。
- 后端：`phase2/backend-foundation@c3a4929`。
- 智能：`phase2/intelligence-contracts@6037bb7`。
- 质量输入：`phase2/integration@40173f8`。

## 前端

环境：Windows、Node.js 24.21.0、npm 11.19.0，干净 `npm ci`。

```text
npm run sdk:check
npm run lint
npm run build
```

结果：全部退出码 0；3218 个模块完成构建。主包约 1674.47 kB、gzip 523.33 kB，Vite 给出超过 500 kB 警告，登记为 P2 性能项，不阻塞 Phase 2 原型。

边界：没有声称真实后端联调；M4 页面和五态证据仍待前端组收口。

## 智能契约

环境：Windows、Python 3.14.7、独立虚拟环境和锁定依赖。

结果：

- 数据测试 28/28 通过。
- 契约测试 53/53 通过。
- 合成契约样例 22/22 通过。
- 原始/派生哈希与字节重建通过。

边界：这是独立自动复现，不是 228 对人工标签复核，也不是 M3/M6/M9 契约签字或真实 HTTP/数据库/队列测试。

## 后端静态和单元验证

依赖：锁定依赖可在 Python 3.12 与 3.13 安装；默认 Python 3.14 缺少 `pydantic-core==2.27.1` 预编译 wheel，不作为项目支持版本。

```text
ruff format --check .
ruff check .
python -m pytest -m "not integration" -q
```

结果：30 个文件格式通过；Ruff 零错误；普通 Windows Python 3.13 环境 5 passed、2 skipped。两个 skip 是数据库集成测试，没有被计为通过。

项目声明的 Codex Python 3.12 运行时在本 Windows 环境创建 AnyIO TestClient event loop 时卡在系统 socketpair fallback；相同锁定代码在普通 Python 3.13 可运行。此项记录为本机运行时差异，CI 仍必须在 Ubuntu Python 3.12 验证。

## Compose、迁移和健康检查

```text
docker compose config -q
docker compose pull db redis minio minio-init
```

- Compose 解析通过，服务为 `db/redis/minio/minio-init/api`。
- Docker Desktop 29.8.0 已启动。
- 拉取 `minio/minio:latest` 返回 repository 不存在或需要登录；其余镜像被中断。
- 因此未执行空库 upgrade/downgrade、种子两遍、数据库集成测试、双桶初始化和完整 `/health`。

结论：BP2-09 和“非作者完整启动”门禁未通过。M9 必须改成公开可拉取的固定镜像/tag 后重新执行；不能用 Compose 语法通过替代真实启动。

## 质量结论

- 可接收为候选：前端原型构建、后端静态/单元骨架、M7 自动契约。
- 不能冻结：后端完整环境、M5/M6 契约、M4/M8 输出、人工标签和跨组确认。
- Issue #23 不应关闭；本记录完成的是当前可执行的 M10 技术检查。
