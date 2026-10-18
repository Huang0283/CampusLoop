# Phase 4 智能组联合交付：AI4-09 / AI4-10

日期：2026-10-18。当前技术交付和 M8 作者技术复验通过；正式同组交叉评审及 M6/M9/M10/M1 接收待完成。不代签、不关闭 #31。

| 项目 | 产物 | 当前状态 |
| --- | --- | --- |
| AI4-09 | [联合部署与回滚](deployment-and-rollback.md)、版本清单、双 RPC 子进程与坏返回修复 | 干净 Git 检出完整验证通过；12 部署场景、18 故障探针通过；发布环境接收待 M6/M9 |
| AI4-10 | [独立复核材料](../independent-review.md)、[go/no-go](../go-no-go.md)、原始指标和独立公式重算 | 历史 M10 诊断保留；新提交由作者重算，最终独立执行/签署待 M10/M1 |
| 组内评审/合并 | [PR #107](https://github.com/Huang0283/CampusLoop/pull/107)、[PR #109](https://github.com/Huang0283/CampusLoop/pull/109)、[PR #110](https://github.com/Huang0283/CampusLoop/pull/110) → phase4/intelligence-models | 已合并；M8 已完成作者技术复验并记录 NO_GO，正式同组交叉评审待完成，之后由小组汇总进入 phase4/integration |

[实际验证](verification.md) · [M8 收尾](../m8-closeout.md) · [接收清单](acceptance-checklist.md) · [机器状态](acceptance-status.json) · [版本](version-manifest.json)

本次 M8 技术复验使用代码提交 `f1b9b7519b51d896c09d36e391632d9460da1940`；PR #110 合并时组分支文档尖端为 `fd5cc86e0d6cdabe94a18d5af7af228127939f5c`。历史联合 CI/部署证据使用 `phase4/integration@6df25176866a6b1df2c1da5dcd28229b965f73ff` 与代码基准 `c775ccc5729bd73c438ec7bd95a1cc0f25dba7ec`，不应被理解为本次复验提交。M10 正式接收须核对最终 PR/阶段提交。

本地无 PostgreSQL/Redis/Docker/WSL，未使用 SQLite 假装业务数据库。真实数据库、迁移、outbox 和浏览器由仓库现有 CI 在 PostgreSQL/Redis/MinIO 环境验证，最终状态与日志单独记录；本机双 RPC 和私有 SQLite 仅验证内部服务恢复。CI 通过也不等于 M9 发布环境或 M10 独立验收。


历史 GitHub CI 已完成且三项 job 全部 success，head=c775ccc，运行记录见 [ci-status.json](ci-status.json)。真实后端完整日志归档在 evidence/joint-v1/ci-backend-job.txt；通过的 CI 不替代原负责人签署，也不替代当前提交的正式交叉评审。
