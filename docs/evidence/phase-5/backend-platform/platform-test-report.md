> 2026-10-25 ?????PR #122 ?????????????????? [M9 ????](m9-pr122-acceptance.md)???????????????????????????????????????

# BP5-09 平台测试报告（platform-test-report）

> 证据文件：`docs/evidence/phase-5/backend-platform/platform-test-report.md`
> 维护人：M9 ｜ 对应任务：BP5-09 约定并发/性能、服务重启、存储/磁盘和日志轮转测试
> 原则：只记录真实执行过的验证；每项结果必须含环境、数据量、命令、原始输出与限制。

口径声明：并发/性能项沿用 phase-3 约定——`test_query_budget.py`（1 vs 20
条序列化查询数 ≤15）是 N+1 回归预算；本报告的并发读基线用于发现并发下
的异常劣化/报错，**不是吞吐量或大规模压测证明**。

## 一、并发/性能基线（api_bench.py，BP5-09 新增）

环境：待填（机器/分支/提交号）｜ 数据量：待填（users/products 行数）

```bash
python backend/scripts/api_bench.py --url http://localhost:8001/health \
    --concurrency 10 --requests 100
# 可另测一个公开业务只读端点（如有）：--url http://localhost:8001/... 保持 10×100 口径
```

- 原始输出（待粘贴 JSON：total/ok/failed/p50/p95/p99/max/statusCodes）：

```
（待粘贴）
```

- 结论：待填（无错误且 p95 ≤ 阈值 / 异常及定位）
- 限制：单机 Docker Desktop、本机回环网络，数字仅作回归基线，不可外推。

## 二、服务重启恢复（worker / api）

步骤（逐条记录时间与观察）：

```bash
# 1) 基线：当前任务队列状态
curl -s http://localhost:8002/healthz | python -m json.tool
# 2) 重启 worker（模拟崩溃恢复；restart 保留容器，kill+up 更接近崩溃，可各做一次）
docker compose restart worker
# 3) 观察心跳恢复与容器 healthy（应在一分钟内回到 status=ok）
docker compose ps worker && curl -s http://localhost:8002/healthz | python -m json.tool
# 4) 重启 api（业务主链路恢复）
docker compose restart api && curl -fsS http://localhost:8001/health
# 5) 重启期间触发一次求购编辑：任务应保持待处理并在 worker 回来后完成（队列不丢）
```

- 原始输出（待粘贴：重启前后两次 /healthz 关键字段、compose ps）
- 断言：workerId 变化（重启后新实例）、runs 计数续接不回退、
  DB/Redis 可达、无任务丢失（ai_task_runs 不缺记录）。
- 结论：待填

## 三、存储/磁盘

```bash
docker system df                      # 镜像/容器/卷总占用
docker system df -v | head -40        # 明细（前 40 行即可）
df -h .                               # 宿主磁盘水位
docker compose exec db du -sh /var/lib/postgresql/data 2>/dev/null
docker compose exec minio du -sh /data 2>/dev/null
```

- 原始输出（待粘贴）｜ 结论：待填（占用合理 / 告警水位说明）

## 四、日志轮转（compose 配置核验 + 实测）

配置：`docker-compose.yml` 全部长驻服务注入 `json-file`，`max-size=10m`、
`max-file=3`（单容器上限约 30MB）。

```bash
# 1) 配置核验：每个容器应显示 map[max-file:3 max-size:10m]
docker inspect --format '{{.Name}} {{.HostConfig.LogConfig.Config}}' $(docker compose ps -q)
# 2) 压测产生日志（约 2000 次请求）后观察单容器日志目录不超限
for i in $(seq 1 2000); do curl -so /dev/null http://localhost:8001/health; done
docker compose exec api sh -c 'du -sh /proc/1/fd/1 2>/dev/null' || true
docker system df -v | grep campusloop | head -10
```

- 原始输出（待粘贴：inspect 的 LogConfig 行 + 日志体积证据）
- 结论：待填（轮转生效 / 未生效及处理）

## 五、汇总

| 测试项 | 状态 | 证据位置 |
|---|---|---|
| 并发/性能基线 | 待执行 | 本报告第一节 |
| worker/api 重启恢复 | 待执行 | 本报告第二节 |
| 存储/磁盘 | 待执行 | 本报告第三节 |
| 日志轮转 | 待执行（配置已就绪） | 本报告第四节 |

遗留/限制登记：待填（Owner / 影响 / 截止时间）。
