# 前端构建与资源测量记录

更新日期：2026-10-23
工作分支：task/m2-p5-frontend-release（PR #120）
界面基线：1b3385a
依赖修复：ad28a23
页面按需加载：ae2edd0
最近业务修复：c5562c0

## 已验证的构建检查

- 独立检出后 npm ci 成功。
- npm run sdk:check 通过，生成目录经 Git 换行归一化比较无内容差异。
- npm run lint、TypeScript 检查及生产构建通过。
- 生产预览使用 http://localhost:5173，API 使用 http://localhost:8001。
- 构建仍提示主入口超过 500 kB；未调整警告阈值。

## 构建与启动

在 frontend 目录执行 npm ci、npm run lint、npm run build。
构建前设置 VITE_API_BASE_URL；该变量会写入构建产物，修改后需要重新构建。
生产预览命令：npm run preview -- --host localhost --port 5173 --strictPort。

Windows 上执行 npm ci 前，应先停止同一检出目录运行的 Vite 服务，
避免 Rolldown 原生模块被占用导致 EPERM。

## API 与 WebSocket

`VITE_API_BASE_URL` 是包含协议的 API 基础地址；`VITE_WS_URL` 是可选的完整
`ws://` 或 `wss://` 聊天端点，包含 `/ws` 或网关配置的路径。
聊天实际通过 SDK 的 `webSocketUrl` 读取该配置。留空时，从 API 地址将
http/https 转为 ws/wss，再追加 `/ws`，仍使用真实接口，不会启用 Mock。
例如 API 为 `https://api.example.invalid`，未设置 WS 时连接
`wss://api.example.invalid/ws`；设置 `VITE_WS_URL=wss://chat.example.invalid/socket`
时则连接这个独立网关。最终部署网关仍须支持应用的 AUTH 帧和 Origin 校验。

两项都是 Vite 构建变量，修改生产地址后必须重新构建；不能只改 preview 进程环境。
前端变量不得存放密钥。验证：`m2-websocket-config.spec.ts` 和聊天界面实际 socket URL 断言。

日常网站从仓库根目录运行 `scripts/start-local.ps1`，固定前端
`http://127.0.0.1:5174`、API `http://127.0.0.1:8001`，保留原有数据卷。
本文较早的 5173 地址是历史验收环境，不作为新的日常启动配置。

CI 的前端指向 `http://localhost:8000`。M2 契约测试按 fetch/xhr 请求类型和
接口路径匹配，不再把 8001 写死；未预期接口会失败，不会泄漏到真实后端。
`npm run test:live` 的全套检查使用开发服务器；其中 `m2-async-state.spec.ts`
需要源码模块。生产预览执行 `npm run test:live -- --grep-invert "shared async component"`，
并单独保留开发服务器下该源码组件的通过记录；不得跳过真实交易或其他失败项。

## 新版实际加载 JS 测量

脚本：frontend/scripts/measure-initial-js.mjs。
结果：[initial-js.txt](verification-output/initial-js.txt)。

| 场景 | 优化前字节 | 优化后字节 | 减少比例 | 优化后 JS 文件数 |
| --- | ---: | ---: | ---: | ---: |
| 游客 /market | 1465007 | 1187146 | 19.0% | 12 |
| 游客 /login | 1465007 | 950782 | 35.1% | 6 |

优化前备份目录：
C:\Users\ASUS\AppData\Local\Temp\campusloop-aligned-before-20261023-163559

测量使用全新游客浏览器上下文、固定空商品列表接口和页面就绪检查。
统计 Resource Timing 中实际加载的 JS 解压后正文大小，并对文件去重。
脚本遇到页面运行异常、非预期 API 请求或不完整资源数据会失败。

这些数值不是 gzip 传输量，也不是实际用户加载耗时。
两次构建间还包含后续键盘修复，因此不作为仅含分包变更的严格单变量实验。
测量后的主入口为 906130 字节；首页总量还包含页面及共享模块。

## 验证边界与后续工作

真实交易、治理以及 Chrome/Edge 界面、键盘检查已分批执行，
具体范围见 browser-responsive-report.md、accessibility-review.md 和 shell-defects.md。
这些分批结果不等同于最终候选的一次完整回归。

已完成六个页面的模拟会话请求与控制台采样，详见 request-console-review.md。
仍需完成最终发布环境确认，
以及正式分支对齐后的交叉评审和 M10 复验。

## 2026-10-24 检查环境补充

源码专用异步组件检查已在开发服务器 localhost:5173 上通过，
证据见 verification-output/async-state-source.txt。
该用例需要开发源码模块，应使用开发服务器执行。

当前本机后端未允许 localhost:5174 的跨域会话恢复请求。
切换前端端口时，应同步核对后端允许的 Origin。
本次使用 localhost:5173，未放宽跨域策略。
