# M7 Phase 3 搜索与匹配候选

版本 m7-baseline-rpc-v1。关键词/规则真实计算，内部分页快照保存在 SQLite；该文件不是生产任务事实库。第三阶段集中实现已由 `backend/app/services/intelligence.py` 提供 PostgreSQL 权威快照，`matching_jobs.py` 提供同库事务 outbox、条件写入、重试和通知去重。搜索只公开可见商品；匹配只供求购本人查看。通知政策和非作者验收尚待确认，不能仅凭技术测试关闭 Issue。

## 安装与复现

从仓库根目录使用 Python 3.12，安装 `scripts/m7_phase2/requirements.txt` 中六个锁定依赖。镜像缺少 rpds-py 指定版本时改用官方 PyPI；不要自行换锁定版本。

```text
python -m pip install -r scripts/m7_phase2/requirements.txt
python -m services.m7_baseline.verify --output-dir ../m7-p3-new-run
```

输出目录必须为空。该命令执行 Phase 2 回归、23 项 Phase 3 测试、38 条固定历史查询、两次评估字节比对和 all/dev/test_candidate 指标独立重算，保存提交号、环境、源文件哈希和完整日志。技术 PASS 不代表 M10 验收或模型 GO。

## 运行内部服务

PowerShell 中生成仅本次终端有效的随机凭据，启动只监听本机的服务：

```powershell
$env:M7_SERVICE_TOKEN = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
python -m services.m7_baseline --database ../m7-baseline.sqlite --port 8787
```

内部入口为 `POST /v1/rank` 和 `POST /v1/page`。必须带 `Authorization: Bearer <凭据>` 与 `Content-Type: application/json`；不得把服务凭据或可信 context 下放给浏览器。版本化输入 schema 为 `schemas/m7-phase3/rpc.schema.json`，处理后的商品/请求校验沿用 Phase 2 schema，通过本地 registry 解析，不下载远程 schema。

请求包含 schemaVersion、products、request、dictionary 和可选 options。request 是 Phase 2 processed request；prices 使用整数分。options 支持 mode=keyword/semantic、sort=relevance/newest/price_asc/price_desc。page 另支持 size=1..100、snapshotVersion 和 scanPosition；后续页传上一页 nextScanPosition，null 表示结束。当前不支持公共接口的任意 page 跳页。`semantic` 明确降级为 MODEL_DISABLED，不调用模型。

生成一个仅用于连通测试的合成请求（独立目录，不改冻结资产）：

```powershell
$payload = python -m services.m7_baseline.example_request
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/v1/rank -ContentType 'application/json; charset=utf-8' -Headers @{ Authorization = "Bearer $env:M7_SERVICE_TOKEN" } -Body ([Text.Encoding]::UTF8.GetBytes($payload))
```

返回内部 productId、productVersion、规则分数、逐项事实解释与版本元数据；不虚构 PublicProduct、卖家昵称、图片或业务通知。M6 需在对外返回前重读授权商品并映射公共 DTO。

## 后端调用与降级

可信后端可调用 `client.call_baseline(url, payload, token, timeout=...)`。503/504、连接失败、读取超时或连接中断时，对同一份新鲜且已授权输入执行本地关键词/规则算法，并返回 SERVICE_UNAVAILABLE/SERVICE_TIMEOUT；401/403/409/422 原样拒绝，不通过降级放宽条件。该适配器仅处理无状态 rank，不能在服务失联后继续旧分页快照。

RPC 首请求要求 asOf 距当前时间不超过 60 秒；后续快照页不超过 300 秒且求购仍有效。网络读取超时为候选配置，服务端连接读取 3 秒、请求体上限 8 MiB、候选上限 5000。没有实现可强制中断计算的总截止时间、生产并发控制或 M9 压测，不能把这些数值当作获批 SLA。

## 持久任务边界

`BaselineStore.submit(event_id, InputVersion, products, request, dictionary)` 同步计算并在一个 SQLite 事务中保存事件、结果和当前指针。同 event_id 不同输入冲突；同逻辑任务重试复用结果；任何已有修订号倒退均 SUPERSEDED；同修订组改变 asOf 或事实冲突。历史任务保留，read_task 显示 superseded。

以上描述的是准备分支中的 SQLite 隔离验证工具，不是生产异步队列。2026-10-09 的集中接入将实际事件、任务领取/崩溃回滚恢复、版本复核、到期清理、通知事务和唯一键放在 backend/app/services/matching_jobs.py 的 PostgreSQL 实现中；SQLite 只保留RPC快照/历史测试用途。生产通知政策未获确认所以默认关闭；测试显式开启验证去重，不能将默认不发送当作去重证据。

## 评估限制

历史 asOf 固定为 2026-09-26；现场 RPC 不接受该历史时间。72 个合成商品、38 条请求、228 对原草稿标签；用户确认 228/228 对人工复核全部正确，逐条记录待归档，原评估运行的历史计数保留。正式封存标签版本尚未发布。每查询仅评估同 catalog 的完整六商品池，绝非线上全库召回。U 整查询剔除，过期求购单独记错误。参数未按 test_candidate 调优，三个 split 分开报告。详见 `docs/evidence/phase-3/intelligence/`。

当前复核确认与辅助表检查见 [人工复核状态](../../docs/evidence/phase-2/intelligence/human-review-status.md)。前次状态修订仅更新文档和交付包，不改变服务算法、评估输入或历史指标输出。

2026-10-08 后续修订新增 `review_archive` 检查/归档工具，以及 `evaluate`、`verify` 的 `--review-archive` 参数。未提供归档时继续使用原草稿并显示结构化记录待归档；提供有效归档后，读取新 labelVersion，报告实际记录数和 `HUMAN_REVIEWED_UNSEALED`。后者仍属诊断，不能解释为已封存或模型获批；原始数据、排序算法与历史日志保留。详见 [复核归档手册](../../docs/evidence/phase-3/intelligence/review-archive-runbook.md)。
