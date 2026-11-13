# T1 导入与复位

可复制命令、Python 3.12 安装和所有运行参数见 [测试包 README](../../../../../tests/collaboration/phase-5/data-permissions/README.md)。没有默认 API；每次运行先 inspect 实际审计容器并与 manifest 环境指纹核对。

本轮环境：`fix/pr142-runtime` worktree，应用软件 `3b0b333af6ae5a26272ef62b3954f14e293b56d6`；API `http://127.0.0.1:18014`；库 `campusloop_pr142_audit_20261030`；独立 Redis 容器 DB14；两个 `campusloop-pr142-audit-*` 桶。日常商城仍在 main / 8001，未写入日常账户库。

R/S 仅在该独立审计库通过本地 ORM 初始化（沿用 User/hash_password 初始化方式，运行时随机凭据）；此验收不代表已收到 M10 对其他环境的初始化许可。交接时 M10 仍需提供自己的初始化账号。setup 不提权，不公开任何凭据。

两次 setup 均为 8 账号/60 商品/12 求购；数据库 users/products/wanted_posts/uploaded_objects 总数不变。第二空间使用独立身份与 ID。默认 reset 仅预览；apply 软删除 60 商品并关闭 12 求购，另一空间的资源内容哈希不变。

apply 返回 2 并如实保留账号、媒体、幂等和审计历史，manifest 标为 reset-partial，必须换 runId。没有安全 API 的关联清理仍是阻塞，不执行全库清空，也不把关闭求购称为物理删除。原始摘要和脱敏 ID 映射见 `runtime-evidence.json`；运行凭据只在 ignored `.codex-tmp`。
