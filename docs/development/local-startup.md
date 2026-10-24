# 本机日常启动与账号数据

日常启动固定使用本仓库的 `scripts/start-local.ps1`。账号数量与环境数量没有关系：所有日常账号、商品和交易都保存在同一个数据库中。

在仓库根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

该命令启动依赖、API、独立 Worker、建议服务和前端，核验数据库后打开 http://127.0.0.1:5174/market 。项目固定为 `campusloop-local`，数据库卷固定为 `campusloop-local-db`，图片卷固定为 `campusloop-local-media`。普通停止、启动、重建应用镜像不删除这些数据。首次启动需要 Docker Desktop、Python、Node，以及在 `frontend` 执行过 `npm ci`；构建镜像需要能访问依赖源。

脚本会按源码指纹检查 API 镜像；切换分支或修改后端后会重新构建，避免前端更新了而 API 仍在运行旧镜像。启动时打印当前目录、分支和提交。端口被其他程序占用时明确失败，不自动换端口或连接其他环境。这里的页面来自当前检出的分支，不代表远端 main 已包含该分支。

查看状态：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Action Status
```

停止服务，保留全部数据：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -Action Stop
```

不要执行 `docker compose down -v`，也不要删除上述卷来处理登录失败。不要为日常演示临时更换 Compose 项目名、数据库或 `VITE_API_BASE_URL`。验收使用独立数据库和 Redis DB14/15，不在日常账号库上运行破坏性迁移或测试。

2026-10-20 排查发现：原日常账号保存在历史 `campusloop-ops-db`，新启动页面却连接了临时 `campusloop-p2-acceptance` 数据库，因此旧账号返回凭据无效。本轮先完整备份原库和图片，再迁入上述固定日常环境；历史数据保留作恢复用途，不再作为日常启动入口。迁移保留原密码散列，不重置密码。不同签名密钥或 Cookie 名会要求重新登录一次，不会删除账号或改变密码。
