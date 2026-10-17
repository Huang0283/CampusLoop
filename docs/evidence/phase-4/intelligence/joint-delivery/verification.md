# 联合技术验证记录

执行日期：2026-10-17；执行角色 M7 作者技术验证。干净 Git 提交 c775ccc5729bd73c438ec7bd95a1cc0f25dba7ec，workingTreeDirty=false。
环境 Windows AMD64 / Python 3.12.14，复用既有候选 CPU 锁环境和已哈希核验的模型。原环境清单、版本与逐条日志保留，没有声称新安装或 M10 本人执行。

```text
python -m services.intelligence_phase4.verify --output-dir <new-external-dir> --model-dir <pinned-model-dir>
```

| 检查 | 实际结果 | 证据（相对 evidence/joint-v1） |
| --- | --- | --- |
| 坏响应 RED / GREEN | 原客户端 7 测试 failures=14/errors=15；修复后 7 通过；新增坏返回/版本/实体/权限边界均是真 HTTP | red-green.json、m7-bad-response-*.txt |
| M7 基线完整验证 | PASS；38 项 M7 单测，Phase 2 回归、两次固定评估字节一致、三 split 重算、资产未变 | technical/m7-baseline/run-record.json |
| M8 三阶段验证 | Phase 2 14、Phase 3 31、Phase 4 23 项均 PASS，双次输出一致，NO_GO 保留 | technical/m8/run-record.json |
| 联合真实双服务部署 | 12/12 PASS，含持久文件重启续页、停服务回退及两候选关闭 | technical/deployment/smoke.json |
| M7 完整候选复现 | PASS；33 候选单测、基线/Phase 2/M8 回归、两次真实 BGE 编码/排序、重建、三 split 重算、真实更新/重复/旧事件/删除 tombstone | technical/m7-semantic/run-record.json |
| 独立公式实现重算 | 三 split PASS，容差 1e-12；执行者仍为作者 | formula-recalculation.json |
| 原 M10 故障探针重放 | 18/18 PASS，故障服务日志中的 Windows 断连堆栈原样保留；非 M10 新签署 | quality-probes.json、quality-probe-provenance.json、quality-probes.stdout.txt |

不同验证器重复运行了一些相同套件，不把各行测试数相加宣传唯一总数。完整候选原始结果仍为 DIAGNOSTIC_ONLY / NO_GO，不把 L0 数据或未封存标签变成正式效果。

现有 GitHub CI 对同一代码基准执行后端迁移/真实 PostgreSQL、Redis、MinIO、业务测试及浏览器检查；状态与日志记录在 ci-status.json，以实际 completed/conclusion 为准。运行中不写成成功；CI 也不是发布环境或 M10 本人签署。

本次未修改 OpenAPI、SDK、数据库模型/迁移、Compose 或 M6 编排。原库数据/划分/标签/权重均保持；新增生产行为只有 M7 客户端对坏响应的安全恢复。RED/GREEN 是实际公共 HTTP 观察；沿用用户此前批准的 unittest 替代流程。


GitHub CI 已完成且三项 job 全部 success，head=c775ccc，运行记录见 [ci-status.json](ci-status.json)。真实后端完整日志归档在 evidence/joint-v1/ci-backend-job.txt；通过的 CI 不替代原负责人签署。

该轮 CI 的完整后端套件为 **37 passed、无 skipped**，包含 test_live_intelligence.py 和 test_matching_jobs.py；健康冒烟 5 passed；真实浏览器 5 passed。warning 原样保留，不改写为“零告警”。

原 M10 故障探针可在原负责人检出固定脚本后重放，使用已安装六依赖/候选锁的 Python，不用缺少 jsonschema 的裸运行时：

```text
git worktree add --detach ../m10-quality-checker 1cc5cbf7633017ea69560cc2f43e0e308658b1da
python docs/evidence/phase-4/intelligence/joint-delivery/replay_quality_probes.py --checkout . --checker ../m10-quality-checker/scripts/quality_phase4/probe_rpc_degradation.py --output ../phase4-quality-probes.json
```

需确保仓库已抓取该 M10 提交、输出文件父目录存在；helper 核验脚本源字节并显式绑定目标 checkout，输出 executionRole 为作者重放，不自动变成 M10 接收。原负责人真正执行后另留本人记录。
