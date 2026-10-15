# 前三阶段运行检查（2026-10-14）

## 范围与结果

检查对象是当日最新 `origin/main`：`829ffbfc7f5c310917b2ff7c9627fe98b117824a`。本轮从该版本独立检出，运行前三阶段累计功能，结果通过。没有发现本轮覆盖范围内的业务阻断问题。第四阶段代码尚未进入 main；M8 修复另做后端兼容性检查。

本轮为累计运行回归，不代表重新逐一签署全部历史 Issue 或生产部署验收。

## 实际验证

- 后端格式和 lint 通过；专用空库执行迁移、回滚到 base、重新迁移和两次种子幂等检查均通过。
- 后端 pytest **37 项通过，零跳过**。测试使用真实 PostgreSQL、Redis 与 MinIO。19 条第三方依赖弃用警告不属于测试失败，后续依赖升级需复验。
- Phase 2：M7 81 项、M8 14 项、联合契约 21 项通过；Phase 3：M7 31 项、main 上原 M8 17 项通过。M8 修复分支另外执行扩展后的 31 项，不能混淆版本与计数。
- 实际启动 API、两个私有智能服务和匹配 worker。`/health`、`/ready`、`/products`、`/wanted`、`/search?query=book`、`/docs`、`/openapi.json` 全部返回 HTTP 200。
- 前端 lint、构建、SDK 重生成及内容漂移检查均通过。Windows Git 会提示 LF/CRLF 转换，实际 `git diff --exit-code` 无内容差异。
- Phase 1 交易原型 8 场景通过，仅为 Mock 验证，不算真实前后端证据。
- **真实浏览器 5/5 通过**：双账户发布/图片/聊天/失败重试/断网恢复/报价/见面/交易完成/评价/举报/通知；求购约束与真实定价规则；游客浏览/故障恢复/刷新恢复身份/退出/固定导航；移动导航与空态恢复；跨标签页切换身份后的旧请求隔离。
- M8 修复对后端的真实 RPC 兼容性检查 **2/2 通过、零跳过**，见 [独立记录](evidence/m8-backend-compat-v1/run-record.json)。

## 可追溯记录

- [后端、迁移、智能模块与 HTTP 运行记录](evidence/phase123-ops-v2/run-record.json)。同目录包含每项命令的原始 `.txt` 日志。
- [前端检查记录](evidence/phase123-ops-v2/frontend/run-record.json)。
- [真实浏览器记录](evidence/phase123-ops-v2/browser/run-record.json) 和 [日志](evidence/phase123-ops-v2/browser/browser-tests.txt)。
- [首次环境失败记录](evidence/phase123-ops-v1/run-record.json)：只读源码挂载使 Ruff 无法写缓存，首个检查退出。将 `RUFF_CACHE_DIR` 指向容器 `/tmp/ruff-ops` 后完成 v2 全部检查。保留失败记录，不把环境失败误报为业务回归，也不覆盖原日志。

日志记录的是测试环境，不包含真实用户数据。检查使用新的 `campusloop-ops-*` 容器、专用 `campusloop_ops` 数据库和 Redis DB15；没有回滚或清空原演示数据库。

## 复验入口和运行地址

复验脚本为 `scripts/maintenance/verify_phase123.py`、`verify_frontend.mjs`、`verify_live.mjs`、`verify_m8_backend.py`。运行前三阶段时 `--repo-root` 指向 main 检出；验证 M8 修复时指向修复检出。后端脚本只允许专用测试数据库与 Redis，不允许拿原演示库做迁移回滚。

后端在有仓库锁定依赖、专用 PostgreSQL/Redis/MinIO、完成对象存储桶初始化的 Linux 容器中执行：

```sh
RUFF_CACHE_DIR=/tmp/ruff-ops python /review/scripts/maintenance/verify_phase123.py --repo-root /srv/campusloop --output-dir /evidence/new-backend-run --source-commit <main-commit>
```

这里 `/review` 是本修复分支脚本挂载、`/srv/campusloop` 是 main 源码挂载、`/evidence` 是新的可写证据目录。容器需配置 `APP_ENV=test`、专用 `DATABASE_URL`/`REDIS_URL`、测试签名密钥和 RPC token、MinIO 连接/桶及可写缓存路径。具体安全数据库条件见脚本；勿与正在运行的验收 API 并行做迁移回滚。

前端在 main 检出的 `frontend` 完成 `npm ci` 后执行，输出目录父目录需已存在：

```powershell
node scripts/maintenance/verify_frontend.mjs <main-checkout> <new-output-dir> <main-commit>
$env:CAMPUSLOOP_UI_URL='http://localhost:5184'
node scripts/maintenance/verify_live.mjs <main-checkout> <new-browser-output-dir> <main-commit>
```

上述命令从包含维护脚本的修复分支根目录执行。浏览器验证之前需启动真实 API 与 Vite，并使用隔离测试环境；它会注册合成账户、发布测试商品和交易，不应直接指向生产站点。

本轮专用验收环境继续运行，便于手动检查：

- 市场：<http://localhost:5184/market>
- 登录：<http://localhost:5184/login>
- 聊天：<http://localhost:5184/chat>
- 通知：<http://localhost:5184/notifications>
- API 文档：<http://localhost:8014/docs>

浏览器图片由本地 `9014` 端口代理到隔离对象存储。上述端口是本轮验收环境，不改变仓库默认端口。原生 Windows Python 回环异常另见 [M8 验证记录](m8-verification.md)；真实浏览器、curl 与 Docker 内私有 RPC 在本轮测试中正常。
