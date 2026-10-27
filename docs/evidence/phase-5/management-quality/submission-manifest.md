# MQ5-06 候选提交清单

源码 `50108a3a50ca18e0da3f4db709da3f8bea2ee24c`，质量材料来自 M1/M10 本轮个人 PR。包标记 CANDIDATE_NOT_FINAL；`source/` 为固定 Git 提交字节，`quality/` 为另行标明的质量补充，不把未合并文档说成该源码已有文件。包名、SHA、文件数见 `package-receipt.json`。

## 已存在且纳入的材料

- 源码/配置：frontend、backend、services、scripts、openapi、Dockerfile、docker-compose.yml、.env.example、frontend/package-lock.json、backend/requirements.txt；精确文件见包内 MANIFEST.json。
- 需求/计划：docs/management/m1/project-scope.md、requirements-traceability.md、team-responsibilities.md、ten-week-plan.md 及 docs/issues 各阶段任务。ten-week-plan 是历史路径，实际课程周次以最新版正文/Issue 为准，不因文件名推定当前为十周。
- 接口：openapi/ 和 docs/api/openapi-sdk-stage-closure.md，SDK 源码随前端保留。
- 数据库：backend/alembic/、backend/scripts/，及 docs/evidence/phase-5/backend-platform/migration-release-report.md。
- 部署：docs/development/local-startup.md、scripts/start-local.ps1、后端 migration-release-report.md、worker-recovery-report.md、final-api-documentation.md。
- 智能：docs/evidence/phase-5/intelligence/ 的复现、数据、清单和限制；保留 NO_GO，不捆绑外部权重或声称两模型获批。
- 前端/后端：docs/evidence/phase-5/frontend/、backend-platform/ 当前已经提交的组员材料；M4/M5 缺项在发布看板单列。
- 质量补充：本组需求追踪、看板、干净安装/回归/非功能报告、原始证据及 SHA、两轮技术彩排/脚本、用户管理员手册、许可说明、贡献和发布门禁。
- 历史阶段证据：docs/evidence/phase-1/ 至 phase-4/。已有报告源文件 docs/reports/ 随源码保留，但不能视作完整五次实际课堂汇报。
- 项目说明书：根 `CampusLoop_Project_Proposal_Submission.docx` 随固定源码纳入；本轮没有改写原说明书或用户本地报告。

## 必须补齐、未计作完成

完整五次真实汇报材料、演示视频和课程截止日期；M4/M5 必需个人材料；模型评估和范围决定；团队许可/数据使用确认；实际交叉评审和 M1/M10 本人签收；最终各组汇总、main 收口、最终 CI、不可变 tag 和最终版本新目录复现。Owner 和内部复核日期见 release-board.md/handoff.md。

## 排除和复核

排除 .git、.codex-tmp、.env（保留 .env.example）、私钥/常见密钥、数据库备份、运行数据库、缓存、node_modules、dist、output 和模型权重。故意排除 output 下用户私人报告，原文件不删除。包内 MANIFEST 列出排除路径、每个纳入文件 SHA 和大小；压缩后逐文件读回并在新目录解压核对。常见模式扫描不等于全历史秘密审计或人工隐私审核。

正式提交人应先读 handoff.md，再核对 release-status.json。包生成后的新目录安装、前端构建和后端联网构建/173 项复验见 package-reproduction.md。回执随 ZIP 另存以避免自引用校验。当前门禁 BLOCKED 的候选不能改名 final 后当作正式发布包。
