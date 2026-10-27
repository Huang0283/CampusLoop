# 阶段 5 前端交付清单

> 2026-10-27：PR #120、#123/#124、#134 已合入前端发布分支；当前候选 57 项浏览器测试通过。详见 [统一候选复核](../management-quality/integration-review-20261027.md)。以下旧日期状态保留为历史。

更新日期：2026-10-24
本地代码基线：7d16270
汇总负责人：M2

以下文件已在本地准备分支形成，正式接收结论仍待记录。
本清单按 Issue #34 的任务编号组织。

## M2 交付物

| 任务 | 文件与代码 | 当前状态 | 接收人及动作 |
| --- | --- | --- | --- |
| FE5-01 | shell-defects.md；公共外壳、会话和错误边界相关回归 | 本地记录和分批检查已形成 | M3/M4 Review，M10 按缺陷复验 |
| FE5-02 | accessibility-review.md；上传、菜单、弹窗、评分和颜色修复；专项测试 | 已记录问题完成本地修复验证；最终主流程复验待完成 | M3/M4 核对受影响页面，M10 验收 |
| FE5-03 | frontend-build-guide.md、dependency-audit.md、request-console-review.md；路由按需加载、测量脚本和通知共享查询 | 本地实现及证据已形成；最终环境与干净候选验证待完成 | M6 确认 SDK/契约，M4/M9 确认连接规则，M10 复验 |
| FE5-09 | final-page-matrix.md、frontend-user-guide.md | 已按当前界面整理，待业务 Owner 和候选核对 | M3/M4 核对路径、按钮、字段和限制 |

## 共同交付物

| 任务 | 文件 | 接收状态 |
| --- | --- | --- |
| FE5-08 | browser-responsive-report.md；screenshots/；verification-output/ | 已有分批 Chrome/Edge 和移动宽度证据；最终候选冒烟待完成 |
| FE5-10 | verification.md、deliverables.md、handoff.md | 已形成交接记录；统一候选、缺陷关闭和正式接收待完成 |

## 主要本地提交

| 提交 | 内容 |
| --- | --- |
| ecdd097 | 新版界面的上传与账号菜单键盘修复 |
| ad28a23 | 初次依赖漏洞修复 |
| ae2edd0 | 新版页面按需加载 |
| d5ad7a2 | 浏览器配置与会话恢复回归 |
| b0da1f6 | Chrome/Edge 界面验证证据 |
| c5562c0 | 交易确认和管理员抽屉焦点修复 |
| 2a9c779 | 键盘及外壳记录 |
| dbc8247 | 新版资源测量与依赖记录 |
| 084f025 | 通知共享轮询及已读同步 |
| d887afb | 新版页面矩阵和用户手册 |
| 7d0a4e1 | 评分名称、文字颜色、无障碍工具及 zod 修复 |
| 7d16270 | 短文字与图片覆盖层补修和复核证据 |

本次交接文档提交号通过 Git 历史定位，不作为新的业务代码基线。

## M3 与 M4 待接收文件

M2 当前尚未收到以下最终交付与成员验收结论，
不能以现有公共回归代替对应成员交付：

- M3：market-regression.md、ai-ui-final-audit.md。
- M4：transaction-regression.md、permission-final-audit.md、demo-recovery.md。

2026-10-26 更新：M4 三份文档已形成，登记见下方“M4 交付登记”。
M3 两份文档已随 PR #123 入库（提交 `8c305b2`），文件本身不再缺少，
缺的是 M2 的接收结论，因此上两行不再表示“文档未交付”。

涉及 M3/M4 页面及共享样式的准备修复，
应由对应 Owner 在正式任务 PR 中确认。

## 发布与接收

小组分支和个人分支已经存在；
正式基线同步、准备提交迁移、任务 PR 和小组汇总 PR 仍待完成。
具体阻塞、Owner 和下一动作见 handoff.md。
最终接收人为 M1/M10 和课程提交人，接收结论尚未给出。

## M4 交付登记（2026-10-26）

分支 `task/m4-p5-transaction-fixes`（基线 `8e42674`），改动尚未提交，等待 M4 统一发 PR。

| 任务 | 文件 | 状态 | 接收动作 |
| --- | --- | --- | --- |
| FE5-06 | [transaction-regression.md](m4/transaction-regression.md)；举报闭环代码、通知页交互、`test:m4` | 作者执行完成 | M2/M3 交叉评审；M5/M6 对签治理接口；M10 复验 |
| FE5-07 | [permission-final-audit.md](m4/permission-final-audit.md)、[demo-recovery.md](m4/demo-recovery.md) | 作者执行完成 | M2/M3 评审；M10 复验失败恢复步骤 |
| FE5-08 | [browser-responsive-report.md](browser-responsive-report.md) 的 M4 追加段、`screenshots/m4/` | 移动与桌面检查完成 | M2 汇总；M10 在最终候选复验 |
| FE5-10 | 本文件、[verification.md](verification.md) 的 M4 追加段 | 已登记 | M2 汇总；M10 核对发布构建与验证提交一致 |

后端改动涉及 `governance.py`、`transactions.py`、`Report` 模型与迁移 `0011`，需 M5/M6 确认并由 M1 在阶段汇总时核对迁移。M4 的三份文档已形成，M2 可在 PR 合并后更新“待接收”状态。
