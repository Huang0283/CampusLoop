# 最终协作环境与材料交接（2026-11-24）

软件统一基线：`81bacfc1d8b170baf7413950cc6a180abc7f44ea`。这是本轮交易权限、T1 契约、移动端商品治理和双语修复后的代码版本；后续仅文档提交不改变该受测软件版本。各人的材料分支继续使用原岗位分支，不要把材料 commit 冒充软件 SHA。

“最终环境”指继续使用下列固定入口、同一应用版本和既有数据，不再因报错临时换端口或新开一套库；不表示 T 组缺失证据、真人体验、报告或演示已经验收完成。以后发现阻断问题仍按缺陷修复、新 SHA、受影响复测的流程更新。

## 1. 每组用哪个入口

| 用途 / 组员 | 网页 | API | 数据与账号 |
|---|---|---|---|
| 日常展示、D1/D2 截图/彩排、R1/R2 查功能；U1/U2 查看双账号既有历史 | http://127.0.0.1:5174/market ，后台 `/admin` | http://127.0.0.1:8001 | 原商城与双演示账号在一起，保留原商品、15 笔合成成交及聊天/治理历史 |
| T1 权限验证 | http://127.0.0.1:5185/market ，后台 `/admin` | http://127.0.0.1:18025 | `permission/run2`；A/B/C/D/E/Z、R/S，保留原数据 |
| T2 业务验证；U1/U2 需要新建交易、举报、禁用或异常恢复的正式任务；D2 破坏性彩排 | http://127.0.0.1:5184/market ，后台 `/admin` | http://127.0.0.1:18024 | `business/run2`；使用 T2 接收的角色/对象及 R/S，不拿日常账号库做处罚、复位或故障注入 |
| T3 异机/全新 VM 环境与恢复 | http://127.0.0.1:5186/market ，后台 `/admin` | http://127.0.0.1:18026 | `environment/run2`，由 T3 在目标机器本人准备；此表不是其安装通过证明 |

所有地址的 `127.0.0.1` 都是使用者自己的电脑，不是远程共享网站。GitHub 同步代码和已提交种子，不同步别人运行后新产生的订单、聊天和账号状态。给别人交截图时必须同时写软件 SHA、哪个环境、数据版本/对象 ID、日期和角色。

三套已有环境应用功能相同，隔离的是数据库、账号和媒体；没有新建 5198 或 5194/5197 给组员使用。后两者是维护者临时验证端口，不是最终入口。

## 2. 首次准备（已有依赖可跳过安装）

在单独的干净软件工作目录操作；不要强制切换或清空个人材料分支的未提交文件。需要与材料并行时，在项目 `.codex-tmp/` 下用独立 worktree，原岗位分支不变。

```powershell
git fetch origin
git switch --detach 81bacfc1d8b170baf7413950cc6a180abc7f44ea
git rev-parse HEAD
py -3.12 -m venv .codex-tmp/runner
$python = '.\.codex-tmp\runner\Scripts\python.exe'
& $python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
# 首次安装本机商品翻译模型，需要网络；后续直接 Start，不反复下载。
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-translation.ps1 -Prepare
```

正式文书使用英文，中文/英文界面通过右上角切换。日常和审计 UI 通过同一本机 `18790` 服务翻译公开商品名/简介；它不是另一套交易环境。商品品牌、型号、数字、用户名、邮箱保留原值；用户私聊、举报证据与申诉原文不发送给公共商品翻译服务。

语义搜索首次准备按 `docs/development/catalog-search-local.md`；没有模型时明确记录关键词降级，不能写成语义效果已通过。维护者本机 2026-11-24 核查日常 18789、T2 18792、T1 18793 均就绪；不代表他人电脑自动就绪。

## 3. 日常与最终展示启动

先启动 Docker Desktop，在根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1 -NoBrowser
```

打开 `http://127.0.0.1:5174/market`；管理员同一站点登录后到 `/admin`。脚本按源码指纹重建必要镜像并保留固定卷。不要 `down -v`，不要删卷来处理登录错误。

双账号公开合成演示身份：

| 身份 | 邮箱 | 密码 |
|---|---|---|
| 演示卖家 | `demo.seller@example.invalid` | `CampusDemo@2026` |
| 演示买家 | `demo.buyer@example.invalid` | `CampusDemo@2026` |

这两个账号属于日常商城初始化数据，不是 T1/T2 审计账号。管理员来源及现有默认演示设置看 `docs/development/demo-dataset.md` 和本机原有初始化记录；不要把旧默认密码当作用户改过密码后的保证。T 组 R/S 凭据见下一节，不能拿日常管理员去登录审计库。

## 4. T1/T2 以及用户组写入任务启动

T2 / 用户组正式写入任务使用 `business/run2`。已有环境运行 upgrade 保留原数据；没有环境才 start：

```powershell
$python = '.\.codex-tmp\runner\Scripts\python.exe'
if (Test-Path '.codex-tmp/audit/business/run2/private-config.json') {
  & $python scripts/audit_env.py upgrade --namespace business --run-id run2
} else {
  & $python scripts/audit_env.py start --namespace business --run-id run2
}
& $python scripts/audit_env.py ui --namespace business --run-id run2
```

最后一条是前端长驻进程，保持终端打开；浏览器访问 5184。T1 将上述所有 `business` 换成 `permission`，网页为 5185。T3 用 `environment`，网页为 5186，但其全新 VM 安装由本人执行并交证据。

首次环境只有 R/S 等初始化内容时，还需要 T1 的数据包导入，不能把“API 启动”当作“商品、角色、测试历史已齐”。既有 run2 不重造数据，T2/U2 先核接收到的清单；完整种子命令和 470 件目录前置看 `docs/collaboration/phase-5/testing/campus-catalog.md` 与 T1 数据包 README。

账号实际值只在本人电脑私有文件中读取：

- T2 / U 组写入：`.codex-tmp/audit/business/run2/admins.json`（R/S）、`data-state/t1-business-run2.json`（A/B/C/D/E/Z 映射）。
- T1：`.codex-tmp/audit/permission/run2/admins.json` 和 `data-state/t1-permission-run2.json`。
- 两者分别属于各自的 run2 目录；上面的 `data-state/` 路径相对该目录。
- T2 给 U2 交具体角色、对象 ID、已通过步骤和限制；随机真实密码/令牌不写公开 Issue。不知道密码先查本机私有文件，不重新造管理员绕过流程。

## 5. 启动后必须确认

```powershell
Invoke-RestMethod http://127.0.0.1:8001/ready
Invoke-RestMethod http://127.0.0.1:18024/ready
Invoke-RestMethod http://127.0.0.1:18025/ready
Invoke-RestMethod http://127.0.0.1:18790/health
```

只检查自己使用的环境即可。`/ready` 应为 200 且数据库/Redis 就绪；翻译健康接口支持 `zh`/`en`。再登录本环境对应账号，切语言、刷新、看实际商品图片与操作。`/ready` 只证明基础依赖，不代表语义模型或所有业务都验收通过。

同一用户买不同商品可合并显示联系人历史，但消息、报价、订单仍属于正确商品。封禁后不能新报价/还价/接受旧报价；已有订单的取消/争议处理按当前契约。管理员不作为普通买卖身份，也不能自封禁。

## 6. R / U / D 组如何拿材料

- **T2 → U2 → U1**：交 `user-handoff.md` 的本轮补充、已通过任务、使用 5184 或 5174 的用途、角色/对象/软件 SHA。U 组先尝试接收，再正式记录；未验证任务如实标未验证。
- **T2/T3 → R1/D1**：旧执行记录引用原软件 SHA；维护者本轮回归有单独证据，不改成组员本人执行。不能把 168 条计划写成 168 条通过。
- **R2 → R1/D1**：交可编辑架构/ERD/类图/时序图与源码锚点。当前正式 `docs/submission/technical-report/` 图源/报告工程尚未出现在 main 的已跟踪文件中，须 R1/R2 提交对应 PR；不能说“GitHub 已有完整报告图源”。
- **U2 → R1/D1/D2**：交同版截图索引和文件、角色/视口、使用步骤、手册；图片内原有中文字不会自动翻译，截图应选适合英文说明的页面并写英文图注。不要为了补图假造用户体验。
- **D1/D2**：可以先做版式和图稿，正式第 11 页等结果页必须注明引用哪轮测试与证据。PPT、报告和视频最终一致；15 分钟是整场含讲解和软件演示，录像须讲解者出镜，课程未规定每人出镜几分钟。

## 7. 维护者本轮验证及未完成事项

- 后端全套 319 通过；追加后的封禁/身份锁专项 23 通过（不是可相加的唯一总数）。
- T1 包校验与 18 条完整性检查通过；不等于 T1 C36 / T3 接收已代签。
- 双语路由专项 11 通过；商品展示/混合文本/私密文本专项 6 通过；翻译与缓存单测 6 通过；审计启动脚本单测 7 通过。
- 前端构建通过；本机日常/T1/T2 API/Worker 相关源码哈希一致，健康与模型状态已核。
- 仍待成员：T1 部分权限证据与 C47 定位核对；T2 缺图、过时交接与汇总；T3 本人异机安装、完整性能原始记录、路由状态证据。详见本轮深查文件。

这些结果只覆盖明确列出的测试。原始测试证据和软件 SHA 随本轮资料提交，非作者签收、真人任务、正式报告与最终录像仍由相应成员实际完成。
