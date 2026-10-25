# Phase 5 管理与质量交付实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 Issue #37 中可由 M1/M10 执行的发布管理、独立技术复验和提交打包，并用门禁阻止未满足条件的正式发布。

**Architecture:** M1/M10 使用独立个人分支提交各自证据；合并三组候选只发生在明确标识的审计分支，不改 main 或组员分支。运行测试的代码提交固定，所有真实写入进入新的 Compose 项目、数据库和 Redis DB15。

**Tech Stack:** Git/GitHub CLI、Docker Compose、Python 3.12、Node/npm、Playwright。

**Spec:** `docs/issues/management-quality-phase-5-release-delivery.md`（GitHub Issue #37 同文）。

## 全局约束

- 保留原有批准界面，通过 SDK 和真实会话验收；不恢复 Mock 或伪造业务结果。
- 日常网站只由 `scripts/start-local.ps1` 管理，独立验收不能操作日常数据库或卷。
- 不新增业务功能、不代签真实成员的 Review、课堂汇报或模型上线结论。
- M7/M8 候选保持 NO_GO；规则基线和降级与未获上线批准的模型分别记录。
- 不合并 main，不把本次审计分支当作已完成最终阶段合并或不可变发布标签。

## Task 1：锁定候选与交付范围（MQ5-01/02）

**Files:** `release-board.md`、`final-requirements-traceability.md`，位于 `docs/evidence/phase-5/management-quality/`。

- [ ] 从 `main@1b3385a` 创建并推送 `phase5/integration`、`phase5/release-candidate`。
- [ ] 在独立审计分支依次合并后端 `ccba7ba`、M2/前端 `444f8be`、智能 `89aca5b`，保存完整父提交和来源 PR。
- [ ] 按既有需求基线逐项登记完整/部分/未完成、测试路径、文档路径；模型不足不改写为完成。
- [ ] 发布看板每个缺口标明 Owner、验证人、影响、修复/接收动作与内部截止日期；与未提供的课程日期区分。
- [ ] 复核 PR 和 Git 事实，禁止把本地候选、未合并 PR 和 main 状态混为一谈。

## Task 2：新环境部署与功能回归（MQ5-03/04）

**Files:** M10 的 `clean-install-report.md`、`final-regression-report.md`、原始 stdout/JUnit/环境清单。

- [ ] 以候选 Git SHA 打标签构建新的后端镜像，新目录 `npm ci`；记录依赖和镜像 ID，不复用运行中的源码挂载。
- [ ] 新建 `campusloop-mq5-audit` Compose 项目：空数据库、独立 MinIO、Redis DB15、独立 API/Worker/前端端口，密钥仅写 ignored 文件。
- [ ] 从空库升级、种子两遍幂等、API/Worker/双 RPC 健康；记录实际服务拓扑。
- [ ] 执行 `python -m pytest --junitxml=...`、M7/M8 单测和契约检查；保存原始失败并修复后仅按必要范围复验。
- [ ] 执行前端 SDK 漂移、lint/build/audit 和完整 Playwright；覆盖双账号、对象权限、状态机、WebSocket、治理和刷新持久化。
- [ ] 停止独立智能服务后重跑基础交易与搜索/规则降级，恢复后再确认健康；不停止日常服务。

## Task 3：性能、安全、恢复和两轮演示（MQ5-05/07）

**Files:** `non-functional-test-report.md`、`final-rehearsal-report.md`、管理员手册和演示脚本。

- [ ] 在独立环境执行 `backend/scripts/api_bench.py`：并发 10、每端点 100 请求、p95 阈值 2000 ms，记录数据量、机器和时间。
- [ ] 核对匿名、普通用户、非参与者和管理员边界，HttpOnly/CSRF/私密媒体及 WebSocket 鉴权均有原始测试依据。
- [ ] 暂停审计 Worker，使用 `db_backup.sh`、`verify_restore.py`、`db_restore.sh` 验证 26 表内容/约束/索引，损坏备份须在写入前拒绝。
- [ ] 验证 MinIO 公共对象可读、私密对象匿名拒绝，并声明 PostgreSQL dump 不包含对象字节。
- [ ] 分别在智能在线和关闭条件执行两轮带计时的真实主流程；自动化彩排与尚未发生的课堂人工彩排分开描述。

## Task 4：文档、贡献、提交包与门禁（MQ5-06/08/09）

**Files:** `submission-manifest.md`、`member-contributions.md`、`final-release-record.md`、`deliverables.md`、`verification.md`、`handoff.md`；发布校验/打包工具及其测试。

- [ ] 汇总实际存在的五阶段材料、用户/管理员手册、部署、安全、数据和依赖许可说明；不补造真实汇报或视频。
- [ ] 用 GitHub PR/Issue/Review 事实生成十人贡献索引；M1=黄麒玮、M10=陈梓弘，其他身份未证实则仅用成员编号。
- [ ] 为打包/发布门禁先写负例：缺失来源文件、被修改证据、未通过 CI、未合并候选、未填人工材料或签收均应拒绝正式发布。
- [ ] 实现可重复的源文件白名单包与 SHA256 清单；排除密钥、环境文件、备份、模型缓存、node_modules、.git、运行数据和日常账号。
- [ ] 实际生成候选提交包，解压至新目录核对文件和哈希；包名明确候选，不创建虚假的 final tag。
- [ ] 在独立个人分支分别提交 M1 与 M10 产物，创建回到 `phase5/release-candidate` 的 PR；Issue #37 记录完成范围和真实阻塞，不提前关闭。

## 验证与完成条件

技术结果必须绑定同一个审计源码 SHA 和明确命令；每个数字可回到原始文件。最终发布门禁只有在上游组汇总、main 阶段 PR、实际课程材料和签收齐全时才允许 PASS。未满足时仍完成工具、证据和可复验候选，并逐项说明需要用户提供的现实材料，不把 BLOCKED 写成完成。
