# CampusLoop

AI 增强型校园二手交易系统 / An AI-Enhanced Campus Second-Hand Marketplace

CampusLoop 将商品与求购、搜索、聊天议价、面交预约、双方完成确认、评价、举报和管理审核连接起来。智能能力包括搜索/匹配及价格、信誉和风险辅助；候选模型是否可用，以对应验收证据与准入结果为准。系统不处理真实付款、物流或真实校园 SSO，不以风险分数自动处罚用户。

## 启动网站

在仓库根目录运行，首次运行前安装 Docker Desktop、Python、Node，并在 `frontend` 执行 `npm ci`：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

- 市场：http://127.0.0.1:5174/market
- 求购：http://127.0.0.1:5174/wanted
- 聊天：http://127.0.0.1:5174/chat
- 交易：http://127.0.0.1:5174/transactions
- 通知：http://127.0.0.1:5174/notifications
- 本人举报：http://127.0.0.1:5174/report
- 管理后台：http://127.0.0.1:5174/admin （需管理员权限）
- API 文档：http://127.0.0.1:8001/docs

启动脚本打印当前目录、分支和提交；页面展示的是当前检出版本。日常数据库和图片使用固定持久卷，不要删除卷来处理登录问题。完整依赖、停止/状态命令与账号数据说明见[本机启动说明](docs/development/local-startup.md)。写入验收使用独立审计数据库、测试媒体卷与 Redis DB14/15。

## 虚拟账号与完整演示

正常运行 `scripts/start-local.ps1` 后，两个虚拟买卖账号及其商品、15 笔已完成交易、聊天、举报、警告和申诉记录会新增到原商城 http://127.0.0.1:5174 ，原有账号和商品保留，管理员在原后台查看。公开登录信息和查看步骤见[演示数据说明](docs/development/demo-dataset.md)。组员拉取该版本并启动后，可在自己本地商城生成同一套场景。

## 当前协作

搜索/求购匹配补充了[校园全分类复测说明](docs/collaboration/phase-5/testing/campus-catalog.md)：原 70 件基础样例加 400 件不同校园商品，10 类各新增 40 件。已有 T1/T2 环境使用 `python scripts/audit_env.py upgrade --namespace business --run-id run2`（T1 换 `permission`）保留账号、端口与数据并升级；新批次的 `setup_data.py --admin-search --campus-catalog` 可一次导入。维护者修复需要同步升级日常、T1、T2，历史验收仍按原 SHA 追溯。

### T2 测试环境与启动入口

日常演示和破坏性测试分开运行，源码可以是同一个版本，账号与数据库不共用：

| 用途 | 网页 / API | 账号 |
|---|---|---|
| 日常、课堂演示 | `5174` / `8001` | 两个演示买卖账号，见上方演示说明 |
| T2 业务验收 | `5184` / `18024` | A 卖家、B 买家、C 竞争买家等测试用户；R/S 两位管理员 |

T2 本轮用 `business/run2`，保留旧 `run1` 的数据和执行证据。先打开 Docker Desktop，在**自己的电脑、干净的完整源码目录**运行；本轮固定的完整软件 SHA 和定向复测任务见 [T2 Issue #161](https://github.com/Huang0283/CampusLoop/issues/161)。首次安装及终端一：

```powershell
py -3.12 -m venv .codex-tmp/runner
$python = '.\.codex-tmp\runner\Scripts\python.exe'
& $python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
# 仅在本机已有 run1 时停止旧容器；先在原网页终端按 Ctrl+C。
if (Test-Path '.codex-tmp/audit/business/run1/connection.json') {
    & $python scripts/audit_env.py stop --namespace business --run-id run1
}
& $python scripts/audit_env.py start --namespace business --run-id run2
```

终端二进入**同一个源码目录**，保持网页进程运行：

```powershell
& .\.codex-tmp\runner\Scripts\python.exe scripts/audit_env.py ui --namespace business --run-id run2
```

打开 `http://127.0.0.1:5184/login`。管理员凭据在本机 `.codex-tmp/audit/business/run2/admins.json`；实际版本、地址以同目录 `connection.json` 为准。A/B/C 等用户需要导入已合入仓库的 T1 数据包，不能用日常演示密码登录；完整导入命令、账号文件位置和重启方法见[测试环境交接说明](docs/development/testing-audit-handoff.md)。各人的 `127.0.0.1` 和数据库互相独立，密码与令牌不要上传 Issue。

临时检出、验证日志、缓存和本机备份统一放项目内的 `.codex-tmp/`，不在桌面另建一批项目文件夹；正式说明维护在本 README 和已有 `docs/` 目录。

### 任务与交接

- [九人协作总任务书](docs/management/nine-member-collaboration-plan.md)：成员自选岗位、交付文件、边界及验收要求。
- [升级、测试、真人体验与材料同步工作流](docs/workflows/version-acceptance.md)：每轮通知、T01–T15 功能目录、U01–U08 用户任务、修复复测及材料同步。
- [四组任务与 Git 操作入口](docs/management/README.md)：各组独立任务书、长期分支、岗位分支与 PR 操作。
- [GitHub 协作 Issue #129](https://github.com/Huang0283/CampusLoop/issues/129)：认领、版本通知、每日反馈与交接；[仓库正文](docs/issues/nine-member-collaboration.md)。

`main` 为稳定主干；材料岗位分支经组内 Review 进入 `team/*`，组汇总 PR 进入版本通知指定的目标。分支预览、PR 合并和实际验收通过分别记录，不能互相替代。

## 开发与契约

前端使用 React、TypeScript、Vite 和 Ant Design；后端使用 FastAPI、SQLAlchemy 和 Alembic；数据与运行依赖包含 PostgreSQL/pgvector、Redis、MinIO 和独立智能 Worker。

- [前端开发与检查](frontend/README.md)
- [后端开发与检查](backend/README.md)
- [唯一 HTTP 契约](openapi/campusloop.v1.yaml) 与 [SDK 各阶段交接要求](docs/api/openapi-sdk-stage-closure.md)
- [界面保持与恢复规范](docs/development/interface-restoration.md)
- [项目目录清理记录（2026-11-01）](docs/development/project-cleanup-20261101.md)：旧工作副本、临时材料和未使用示例的清理范围、备份与验证。
- 智能服务：[M7 关键词基线](services/m7_baseline/README.md)、[M7 语义服务](services/m7_semantic/README.md)、[M8 规则基线](services/m8_baseline/README.md)、[M8 价格候选与降级](services/m8_phase4/README.md)

生产路由通过真实 SDK/会话层访问接口。早期原型仍用于对照批准界面，不能用 Mock、写死身份或兜底商品替代生产接口。

## 阶段任务与历史材料

- [五阶段 Issue 与交接规范](docs/issues/README.md)：五个开发阶段，每阶段一周。
- [前端设计与原型索引](docs/frontend/README.md)：早期设计基线，不作为当前运行说明。
- [阶段验收证据](docs/evidence/)：按阶段保留交付、验证与交接；日期、候选状态和当时结论按原记录读取。
- [历史项目更新报告](docs/reports/README.md)
- 项目计划书：[可编辑 DOCX](CampusLoop_Project_Proposal_Submission.docx)、[提交 PDF](output/pdf/CampusLoop_Project_Proposal_Submission.pdf)

当前操作遵循上方启动与协作入口；旧文档不会因历史验收保留而成为另一套现行工作流。被替代的说明从当前树移除，必要时从 Git 历史查阅。
