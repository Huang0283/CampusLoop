# MQ5-08 成员贡献索引

核对日期：2026-10-25。只记录可追溯产物，区分原作者、PR 作者、代理收尾，不推测工作时长或 Review。用户说明同时承担 M1/M10；本轮由 Codex 按用户委托执行。身份以职责文档为准：M1 黄麒玮、M10 陈梓弘。

## 按成员登记

### M1

本轮范围看板、需求追踪、提交清单、贡献、手册、打包和发布门禁。个人分支 `task/m1-p5-release`，PR 见 `final-release-record.md`。不把代理产物描述为其他成员独立评审。

### M2

[PR #120](https://github.com/Huang0283/CampusLoop/pull/120)，作者 `Maxuan0514`，目标 `phase5/frontend-release`，本次核对 OPEN。Codex 代理修复 9 个 CI 失败和 WebSocket 配置；证据 `../frontend/m2-pr120-acceptance.md`，成功 CI 回执在本组 evidence 目录。

### M3

[PR #123](https://github.com/Huang0283/CampusLoop/pull/123)，作者 `Hongqing-Chen`；[PR #124](https://github.com/Huang0283/CampusLoop/pull/124)，作者 `ApexForge-cz`，代理同步基线和验收收尾。均合并至前端组分支；交付 `../frontend/m3/market-regression.md`。

### M4

当前候选没有找到对应第五阶段个人 PR 和三项必需文件。仍需 `transaction-regression.md`、`permission-final-audit.md`、`demo-recovery.md`，或接管人明确记录代理产物。不能把旧阶段界面和本组联合测试当作个人完成。

### M5

当前候选未找到对应第五阶段个人 PR；仍缺 `security-review.md`、`moderation-security-report.md`。本组部分权限/治理测试不是成员独立安全审查。

### M6

[PR #121](https://github.com/Huang0283/CampusLoop/pull/121)，作者 `limingyuan0115`，业务加固及并发死锁修复；[PR #125](https://github.com/Huang0283/CampusLoop/pull/125)，作者 `ApexForge-cz`，代理同步与验收收尾。均合并 `phase5/backend-release`；交付 `../backend-platform/verification.md`。

### M7

[PR #126](https://github.com/Huang0283/CampusLoop/pull/126)，作者 `ApexForge-cz`，代理复现和交付审计，合入 `prep/m7-p5-search-reproducibility`。见 `../intelligence/search-release-manifest.md`。保留原始研究数据和代码归属，不把代理提交视作全部原始研究贡献。

### M8

同 [PR #126](https://github.com/Huang0283/CampusLoop/pull/126)。见 `../intelligence/price-release-manifest.md`、`trust-risk-final-spec.md`。复现工作与学习模型 NO_GO 分别记录。

### M9

[PR #122](https://github.com/Huang0283/CampusLoop/pull/122)，作者 `henryzuishuai`，部署恢复，合并 `phase5/backend-release`。见 `../backend-platform/m9-pr122-acceptance.md`；本轮恢复文本差异和补偿详见非功能报告。

### M10

本轮干净安装、后端 173 项/浏览器 49 项、故障探针、并发、恢复及两轮技术彩排。个人分支 `task/m10-p5-final-verification`；技术报告、`verification.md`、原始日志及 SHA 清单同时提交。

## 核对方式

命令：`gh pr list --state all --limit 100 --json number,title,state,mergedAt,headRefName,baseRefName,author,url,mergeCommit`。Issue 前端 #34、后端 #35、智能 #36、管理质量 #37。组分支和 main 合并分别记录；没有事实支持的 Review、课堂汇报和视频不计为完成贡献。
