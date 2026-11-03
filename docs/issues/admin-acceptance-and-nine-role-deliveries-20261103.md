# [协作总览] 四组九岗位任务与交付导航

本轮变更 `C20261103-ADMIN`，沿用总协作 Issue #129 与九人协作计划。详细任务按组分别维护；每个岗位的文件内容、作用、接收人和验收步骤只到对应分组Issue查，不再把九人任务堆在这里。九人自行认领姓名和复核人，R1/T2/U2/D2分别做四组联络。

| 小组 / 各自岗位 | 详细任务 Issue | 本地说明 |
|---|---|---|
| 文书组 R1 / R2 | [#144](https://github.com/Huang0283/CampusLoop/issues/144) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-literature.md) |
| 测试组 T1 / T2 / T3 | [#145](https://github.com/Huang0283/CampusLoop/issues/145) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-testing.md) |
| 用户体验组 U1 / U2 | [#146](https://github.com/Huang0283/CampusLoop/issues/146) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-ux.md) |
| 演示组 D1 / D2 | [#147](https://github.com/Huang0283/CampusLoop/issues/147) | [完整分组说明](https://github.com/Huang0283/CampusLoop/blob/main/docs/issues/group-issue-presentation.md) |


## 当前版本与交接顺序

- 软件验收基线：`main@5fdeb0a8501d4503cf8504f364a4cb945361d7ff`，含交易中心布局及电脑搜索排除手提包修复。后续材料commit单独记录；若代码变化，由M10发新软件SHA和受影响范围。这不是最终冻结或测试通过声明。
- 当前前五阶段已收口：个人 `work/*` PR → 对应 `team/*` → 非作者Review → 组汇总PR → `main`。不向已关闭的阶段分支交材料。
- M10先发SHA、专用测试UI/API、审计数据库/Redis DB14/15与媒体范围、初始化状态；组员不要把本机localhost当作共享环境，不在日常账号库做禁用、下架、造数、复位或故障注入。
- T1先交基础数据给T2/T3，接收人独立导入后即可开始；T1继续测权限，T2测业务并提供合法前置，T3测环境/异常。PR #142已入team/testing但未代表入main，其中原36条权限测试尚未执行。
- 当前计划48+84+36=168条，非168条通过。五类结果（通过/失败/阻塞/未执行/不适用）和计划核对；T2只交已通过用户任务给U2/U1。缺陷由M10修复，原执行人复测后更新状态。
- T2/U2/M10将真实结果与证据交R1/R2；R1/T2/U2交稳定材料给D1/D2，M10确认冻结范围后再做两轮真人彩排和最终出镜视频。
- 正式英文报告（正文40–60页）与学生手册（8–12页）使用LaTeX/Overleaf完整工程ZIP及同版PDF；管理员/部署材料另交。内部记录继续Markdown/CSV，PPT仍为可编辑PPTX，不要求Beamer。

## 管理员教学演示凭据

仅限**已初始化种子的专用测试环境**。管理员 `admin.demo@example.com` / `Demo@12345`；学生 `chen.demo@example.com`、`lin.demo@example.com` / `Demo@12345`。从专用测试UI的 `/login` 登录，管理员进入 `/admin`。使用前核对M10提供的环境与实际可登录状态；旧库密码改过不保证此默认密码仍有效，不重置日常账户。R/S是测试别名，第二管理员S须M10合法准备，不能编造。

后台本轮要核对举报提交→处理/驳回→举报人回看；用户禁用/恢复→学生端权限/市场变化；商品下架/恢复→市场/搜索变化。举报处理本身不自动封号或下架。具体用例、日志和凭据使用说明见测试组Issue。

## 统一交接消息

```text
岗位/真实姓名/复核人：
交付人 → 接收人：
软件完整SHA / 材料PR或commit / 数据版本：
已交文件链接、里面是什么、接收人用来做什么：
接收人第一步、预期结果：
通过/失败/阻塞/未执行/不适用，缺陷链接及负责人：
预计回复日期：
```

接收人实际尝试后回复接收/部分接收/退回补充及结果。群消息“做完了”、代码合并或GitHub推送不代替接收、独立测试、学校提交、签名或真实Review。
