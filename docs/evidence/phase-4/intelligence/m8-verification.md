# M8 Phase 4 验证记录

> 历史记录：本文件记录 2026-10-14 对 PR #97 的验证，不是 2026-10-18 的最新状态。最新 M8 作者技术复验和交叉评审状态见 [m8-closeout.md](m8-closeout.md) 与 [joint-delivery/acceptance-status.json](joint-delivery/acceptance-status.json)。

## 本次修复与实际结果

2026-10-14，基于 PR #97 的阶段集成提交 `cdf814364eec988e0d197c0a0098a92eb5db4d6e` 验证修复提交 `dd45e484ec043af88f65c69cc672678e9143c3a4`。证据记录中的 `dd45e48` 指此提交。

- Phase 2：14/14 通过，见 [phase2-tests.txt](evidence/m8-acceptance-v2/phase2-tests.txt)。
- Phase 3：31/31 通过，见 [phase3-tests.txt](evidence/m8-acceptance-v2/phase3-tests.txt)。包含真实 HTTP 正常调用、空结果、缺字段、错误 JSON、版本错误、超时和服务关闭验证。
- Phase 4：23/23 通过，见 [phase4-tests.txt](evidence/m8-acceptance-v2/phase4-tests.txt)。覆盖候选回退、异常状态、嵌套未知字段、非字符串置信度及验证器失败处理。
- 后端实际智能服务集成：2/2 通过、零跳过，见 [backend-intelligence-tests.txt](evidence/m8-backend-compat-v1/backend-intelligence-tests.txt)。验证搜索、匹配、价格、信誉、风险、权限及服务关闭降级；测试使用真实 PostgreSQL/Redis 和真实私有 HTTP RPC。
- 三份核心机器证据在两次生成间 SHA-256 一致，也与 PR #97 原始运行记录中的核心输出哈希一致。历史文件在 Windows 检出时可能转换为 CRLF，直接对历史工作区文件求字节哈希会不同；忽略换行后内容相同。本次归档目录禁用 Git 换行转换，保留原始证据字节。规则输出和当前 `NO_GO` 决策保持一致。

环境：Docker Linux / Python 3.12.15，标准库测试；后端依赖按仓库锁定版本。逐套命令、计数、返回码、源码哈希及输出哈希见 [M8 运行记录](evidence/m8-acceptance-v2/run-record.json) 和 [后端兼容性记录](evidence/m8-backend-compat-v1/run-record.json)。

原始 `m8-v1` 为 PR #97 历史评估资产。本次不再引用未随该 PR 提交的 `tests.log`，也不把历史 17 项用例计数当作修复后的计数。

## 复现

从仓库根目录执行，输出目录必须不存在或为空，避免覆盖历史证据：

```powershell
python -m services.m8_phase4.verify --output-dir output/m8-acceptance-review --source-commit (git rev-parse HEAD)
```

Windows 本机的原生 Python 回环连接在本次环境中会超时。该现象在独立原生 socket 探针也出现；Docker Linux 回环测试通过。可用以下已验证方式复现，不需修改防火墙：

```powershell
$reviewRoot = (Get-Location).Path
docker run --rm --network none --mount "type=bind,source=$reviewRoot,target=/workspace" --workdir /workspace python:3.12-slim python -m services.m8_phase4.verify --output-dir output/m8-docker-review --source-commit (git rev-parse HEAD)
```

验证器自动执行三个阶段测试并保存 `.txt` 日志。失败或零用例会写入 `failed-run.json` 并返回失败，不会生成成功记录。仓库现有 CI 验证后端、前端及 Phase 3 私有 RPC；本次 Phase 2/4 扩展回归的原始证据随 PR 提交。现有 CI 实际状态以 PR 页面为准。

## 验收边界

M8 此次代码缺陷和证据缺口已经修复。当前没有合格 L3 成交标签，价格候选仍为 `NO_GO`：不训练、不上线，保留 Phase 3 规则。开发机延迟仅为诊断，不能冒充冻结环境 SLA 或模型准确率。

M5 数据授权、M6 业务事实/公开 DTO 确认、M7 组内汇总互审、M9 部署确认、M10 冻结环境独立复现、M1 最终签署均为 PENDING，接收动作见 [handoff.md](handoff.md)。这份记录不代替成员签字，也不关闭整个 #31。

