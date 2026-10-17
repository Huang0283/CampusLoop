# AI4-09 M7/M8 联合部署、降级与回滚

日期：2026-10-17；代码版本见 [version-manifest.json](version-manifest.json)。本文件补齐组内联合操作；M8 原 [部署说明](../deployment-and-rollback.md) 保留。

## 1. 部署决策与真实调用路径

两个模型候选均保持 NO_GO。正式业务调用仍是 `backend/app/services/intelligence.py → M7 baseline RPC/local rank` 与 `backend/app/api/routes/intelligence.py → M8 baseline RPC/manual fallback`。`backend/scripts/serve.py` 在同一 API 进程环境启动两个私有回环 RPC 和匹配 worker；不向浏览器暴露服务 token。

M7 `services/m7_semantic` 是私有 CLI/实验实现，不是已部署的语义 HTTP 路由。M8 `services/m8_phase4/router.py` 是带审批门禁的候选路由，目前公开 API 调用的是基线 RPC，没有未经批准的新模型接入。不能把测试中的候选开关打开解释为页面已启用模型。

## 2. 两种依赖环境

- 服务/轻量验证：Python 3.12 + `scripts/m7_phase2/requirements.txt` 六依赖锁；M8 服务无额外模型依赖。
- 完整候选复现：单独 venv 安装 `services/m7_semantic/requirements.windows-cpu.lock.txt`（CPU PyTorch 源按 M7 runbook）；模型固定 revision 和逐文件 SHA256，放源码外。该 profile 与六依赖 profile 中部分版本不同，不合并修改锁文件。

本次完整联合验证使用既有候选 CPU 锁环境，环境清单见原始 evidence。校验 P2 原 lock 字节不等于声称同时安装两份互相不同的锁。Linux 发布环境需按实际平台再次安装/验收。

## 3. 从实际 Git 提交验收

检出 PR 最终任务提交（技术执行基准为 c775ccc），确认 `git status --porcelain` 为空。所有输出用源码外新空目录；模型/venv/SQLite/凭据不入 Git。

```text
python -m services.intelligence_phase4.verify --output-dir ../phase4-joint-run --model-dir <pinned-local-model>
```

无模型的轻量服务检查可省略 `--model-dir`，该模式只执行候选单测并明确 `semanticInferenceReproduced=false`，不得声称重新完成模型评估。完整验收检查 run-record 四步退出码、codeCommit、workingTreeDirty=false，以及各子记录状态，不只看外层进程退出码。

独立双服务部署回滚检查：

```text
python -m services.intelligence_phase4.smoke --output-dir ../phase4-rpc-smoke
```

实际启动两个 CLI 子进程，使用临时随机环境 token，检查 M7 正常/无认证/模型关闭/分页持久文件重启/停服务回退，M8 三能力正常、候选关闭/No-Go 保持规则，以及三能力停服务安全降级，共 12 场景。SQLite 仅是私有分页库，不是 PostgreSQL 业务数据。

## 4. M6/M9 发布部署核对

原运行/Compose 文件归 M9，业务状态/迁移归 M6/M9，本次没有改这些共享文件。按既有流程在专用项目环境使用根 `.env.example` 和初始化脚本产生本机密钥，不复制测试 token；检查 PostgreSQL/Redis/MinIO 独立卷与健康状态后执行既有迁移/种子/启动步骤。

| 配置/入口 | 核对方式 |
| --- | --- |
| `BASELINE_SERVICES_ENABLED=true` | 由 serve.py 启动基线 RPC；M7/M8 地址必须是同一容器/进程网络内 127.0.0.1 根地址，默认 8787/8788；禁止把浏览器或跨容器地址当 loopback |
| `BASELINE_RPC_TOKEN` | 至少 32 字符，只注入服务/后端；不可入页面、Git 或日志；服务和调用方须相同 |
| `/health`、`/ready` | 检查实际 API/依赖状态；不以内部服务能监听代替整个发布环境就绪 |
| `/search`、`/wanted/{id}/matches` | 用合法业务账号与真实商品/求购验证结果、algorithm/schema 版本、硬筛选和本人权限，保留请求/结果 ID |
| 价格/信誉/管理员风险 | 按 M8 契约验证正常与不可用，价格可手动填、风险仅人工线索，不执行业务处罚 |
| worker/outbox/落库 | 按 backend/tests/test_matching_jobs.py 的重复事件、关闭求购、通知去重等场景核对 PostgreSQL 事实，不用私有 SQLite 替代 |

## 5. 故障和低置信/空结果矩阵

| 情形 | M7 | M8 |
| --- | --- | --- |
| 候选关闭 / 门禁 No-Go | 正式路径保留关键词/规则；semantic 明确 MODEL_DISABLED | 路由保留 PHASE3_RULE_BASELINE；DATA_OR_APPROVAL_GATE_NO_GO/CANDIDATE_DISABLED |
| 超时 / 断连 / 503/504 | 明确 SERVICE_TIMEOUT/SERVICE_UNAVAILABLE，本地同硬约束基线；旧输入/求购过期仍拒绝 | 明确不可用：价格手动填、信誉事实/不可用、风险转人工队列，无自动处罚 |
| 坏 JSON/空结构/错版本/不安全数值 | 本次新增客户端校验后 INVALID_SERVICE_RESPONSE → 本地基线；异常身份/版本商品不外泄 | 既有 validator 拒绝空字段、版本/数值/危险动作并安全降级 |
| 低置信 | 没有获批的置信阈值，不擅自新增阈值或概率；候选全部停用 | 私有路由低置信/无结果/错误/错特征版本恢复规则，现有 Phase 4 单测覆盖；故障注入 fixture 不当作训练模型 |
| 无符合条件结果 | 返回空结果/暂无匹配，不放宽硬约束，不伪装“智能成功” | 无数据则不足/不可用并保留手动路径，不伪造回归精度 |
| 401/403/409/422 | 拒绝仍传递，不能降级绕过权限、求购失效或时效 | 输入拒绝不伪装成成功建议 |

重算时保留模型/算法/字典/事实版本，关键词/规则/RRF 分数都不是成交概率；切勿把单机诊断延迟写成发布 SLA。

## 6. 回滚操作与验收

1. 确认两个候选仍未接入公开服务；M8 私有 route 的 candidate_enabled=false 应立即选择 Phase 3 规则，M7 私有实验进程停止即可，不能仅移除权重却保留“模型已生效”页面标记。
2. 若内部 RPC 故障，先保留故障日志；允许的传输/坏返回按矩阵回退。临时关闭全部 advisories 时，将既有 `BASELINE_SERVICES_ENABLED=false` 注入 API 并按 M9 既有流程重启：M7 本地基线、M8 不可用/手动路径；这与“只关闭模型候选”是不同操作。
3. 回退至经批准的上一服务代码镜像/提交，不运行数据库 downgrade 或删除业务卷；复查 API、真实事实、本人权限、worker/outbox 去重与不可用提示。镜像 digest/发布提交由 M9 记录，不能用本机 c775 技术基准代填部署事实。
4. 恢复服务前核对 token、端口、依赖、源文件版本；在新空证据目录重新运行联合检查并由 M6/M9 接收。

独立 M7 `--database` 文件跨服务重启保留分页已实测；serve.py 的私有分页库位于其临时目录，整个 API 进程重启不承诺旧分页可续。业务 PostgreSQL 结果和 outbox 的持久化由 M6/M9 现有链路负责。
