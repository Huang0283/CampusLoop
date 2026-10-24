# 前端构建与资源测量记录

更新日期：2026-10-23
工作分支：prep/m2-p5-main-alignment
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

当前 live 聊天的 useChat.ts 从 apiBaseUrl 派生 WebSocket 地址：
将 http/https 转为 ws/wss，再追加 /ws。
该链路没有读取 VITE_WS_URL，不能据此宣称支持独立 WebSocket 地址配置。

本地 API 为 http://localhost:8001，对应聊天连接 ws://localhost:8001/ws。
独立 WebSocket 域名部署支持及最终发布地址，仍需与接口、部署负责人确认。
前端构建变量不得存放密钥。

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
