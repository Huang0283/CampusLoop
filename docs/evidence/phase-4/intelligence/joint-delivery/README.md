# Phase 4 智能组联合交付：AI4-09 / AI4-10

日期：2026-10-17。当前技术交付通过，原负责人接收待完成。用户已明确由原 M8/M10/M1 分别确认，不代签、不关闭 #31。

| 项目 | 产物 | 当前状态 |
| --- | --- | --- |
| AI4-09 | [联合部署与回滚](deployment-and-rollback.md)、版本清单、双 RPC 子进程与坏返回修复 | 干净 Git 检出完整验证通过；12 部署场景、18 故障探针通过；发布环境接收待 M6/M9 |
| AI4-10 | [独立复核材料](../independent-review.md)、[go/no-go](../go-no-go.md)、原始指标和独立公式重算 | 历史 M10 诊断保留；新提交由作者重算，最终独立执行/签署待 M10/M1 |
| 组内评审/合并 | [PR #107](https://github.com/Huang0283/CampusLoop/pull/107) → phase4/intelligence-models | 原 M8 Review 待完成；之后由小组汇总进入 phase4/integration |

[实际验证](verification.md) · [接收清单](acceptance-checklist.md) · [机器状态](acceptance-status.json) · [版本](version-manifest.json)

当前代码基准 `c775ccc5729bd73c438ec7bd95a1cc0f25dba7ec`，来自 `phase4/integration@6df25176866a6b1df2c1da5dcd28229b965f73ff`，保留 M8 已合并交付并加入 M7 私有候选及客户端修复。文档/归档后续提交不改变本代码基准，M10 正式接收须核对最终 PR/阶段提交。

本地无 PostgreSQL/Redis/Docker/WSL，未使用 SQLite 假装业务数据库。真实数据库、迁移、outbox 和浏览器由仓库现有 CI 在 PostgreSQL/Redis/MinIO 环境验证，最终状态与日志单独记录；本机双 RPC 和私有 SQLite 仅验证内部服务恢复。CI 通过也不等于 M9 发布环境或 M10 独立验收。


GitHub CI 已完成且三项 job 全部 success，head=c775ccc，运行记录见 [ci-status.json](ci-status.json)。真实后端完整日志归档在 evidence/joint-v1/ci-backend-job.txt；通过的 CI 不替代原负责人签署。
