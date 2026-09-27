# M5 Phase 1 作者自检记录

> Owner：M5（胡可铭）｜日期：2026-09-27｜性质：文档自检原始证据，不是 M10 独立验收

## 1. 验证环境与版本

- 环境：Windows、PowerShell、Git 2.53.0.windows.2、Python 3.12。
- 基线：`e1fe4810740b1ab53f2f8d14bd2fd178829f6b37`，任务分支 `task/m5-p1-auth-boundary`。
- 验证对象：BP1-01/02/03 三份 Markdown、BP1-11 场景清单及 `m5/` 下三份个人证据。
- 内容提交号：提交后运行 `git log -1 --format=%H -- docs/evidence/phase-1/backend-platform/auth-domain.md` 获取；证据更新提交通过 `git log -1 --format=%H -- docs/evidence/phase-1/backend-platform/m5/verification.md` 获取。

## 2. 复核步骤

在仓库根目录运行：

```powershell
git branch --show-current
git diff --check origin/phase1/backend-platform...HEAD
git diff --name-only origin/phase1/backend-platform...HEAD
git log -1 --format=%H -- docs/evidence/phase-1/backend-platform/auth-domain.md
```

预期：位于 M5 任务分支；无空白错误；只新增本次七份文档，没有源码、密钥、依赖或其他成员文件变更。打开相对 Markdown 链接应指向已有文件。

逐项走查：

1. BP1-01 的每个操作都有允许者、拒绝边界、前置与结果。
2. BP1-02 覆盖公开/本人/审核/禁止返回；凭据签发例外不扩大到用户资料。
3. BP1-03 有注册、登录、刷新、退出、禁用/恢复、资料修改六张流程图；能沿分支找到失败结果。
4. HR-01～HR-18 均含触发、保护、设计 Owner 和测试 Owner，跨组状态不冒充已确认。
5. handoff 记录输入提交、未确认项、Owner、接收动作和下一检查时间。
6. 任何“完成/通过”只指作者的文档检查，不指真实接口、并发、安全、浏览器或数据库测试。

## 3. 本次执行结果

2026-09-27 在上述环境完成作者内容走查与 Python 标准库结构检查：

| 检查 | 实际结果 | 证据含义 |
|---|---|---|
| 本次文件范围 | 7 份 Markdown | 三份个人交付、一个共同场景输入、三份 M5 原始证据 |
| 相对链接 | 24 个，全部指向已有文件 | 仅校验本地目标存在；不声称验证所有外部网站 |
| 代码围栏 | 7 份文件均成对闭合 | Markdown 结构检查 |
| Mermaid 图数量 | 6 张 | 与六项认证流程逐一对应；未执行渲染器 |
| 风险编号 | HR-01～HR-18 连续、无重复 | 18 个候选场景都有触发、保护和责任列 |
| 占位标记扫描 | 未发现未解决的占位标记 | 真实未确认项集中在交接表，保留 Owner 与检查时间 |
| 语义自检 | 已按第 2 节六项逐条走查 | 修正刷新唯一约束、管理员证据范围和预签名撤销边界；未经跨组签字 |

结构检查实际输出：`Files=7; relative_links=24; mermaid_flows=6; risk_scenarios=18`，`Document structure checks: PASS`。检查使用 `pathlib` 读取 UTF-8 文件、正则提取相对链接/围栏/场景编号，再验证目标路径和数量；不读取真实用户数据，不执行仓库业务代码。

## 4. 未执行与交接边界

本次没有应用代码变更，因此未运行前端构建或后端接口测试。没有执行真实注册/登录、数据库事务、并发刷新、权限攻击或故障注入；Mermaid 的流程语义已人工检查，尚未验证 GitHub 页面渲染。M6/M9 的 Review、M10 独立验收、M1 范围确认和合并均以之后的真实记录为准。
