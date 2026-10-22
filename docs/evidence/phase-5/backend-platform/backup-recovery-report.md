# BP5-08 备份与恢复报告（backup-recovery-report）

> 证据文件：`docs/evidence/phase-5/backend-platform/backup-recovery-report.md`
> 维护人：M9 ｜ 对应任务：BP5-08 执行备份/恢复，核对用户、商品、订单事件、消息和智能结果
> 原则：只记录真实执行过的验证；未执行项标注"待执行"，不编造结果。

## 一、方案与工具（本阶段新增，M9 维护）

| 工具 | 作用 |
|---|---|
| `backend/scripts/db_backup.sh` | `pg_dump -Fc` 自定义格式全库逻辑备份（含观测表），生成 `<文件>.sha256` 校验和 |
| `backend/scripts/db_restore.sh` | dump 完整性自检（`pg_restore --list`）→ 断连 → DROP/CREATE → `pg_restore --no-owner` → 校验 `alembic_version` → 行数比对 |
| `backend/scripts/verify_restore.py` | 关键表行数快照（JSON）+ `--baseline` 逐表比对；覆盖 26 张表：users / products / order_events / chat_messages / ai_task_runs / matching_results 等 |

备份为逻辑全库、在线执行（不中断服务）；恢复演练会重建 `campusloop`
库，属发布验收专用操作，**演练前后都不得动演示数据之外的真实环境**。

## 二、执行步骤（一次完整演练）

```bash
mkdir -p backups
# 1) 备份前行数基线
python backend/scripts/verify_restore.py > backups/baseline-$(date +%Y%m%d-%H%M%S).json
# 2) 备份
bash backend/scripts/db_backup.sh
# 3) 恢复演练（脚本内含 0-4 步：自检/重建/恢复/版本与行数核对）
bash backend/scripts/db_restore.sh backups/campusloop-<时间戳>.dump
# 4) 恢复后比对
python backend/scripts/verify_restore.py --baseline backups/baseline-<时间戳>.json
# 5) 重建应用连接池
docker compose restart api worker
```

## 三、执行结果（待实测后填写）

- 执行日期：待填 ｜ 分支/提交号：待填
- 备份文件与校验和：

```
（待粘贴：db_backup.sh 输出——文件路径、sha256、大小）
```

- 行数比对（基线 vs 恢复后，可从 verify_restore.py 两次 JSON 摘录核心行）：

| 表 | 备份前 | 恢复后 | 一致 |
|---|---|---|---|
| users | 待填 | 待填 | 待填 |
| products | 待填 | 待填 | 待填 |
| wanted_posts | 待填 | 待填 | 待填 |
| order_events | 待填 | 待填 | 待填 |
| chat_messages | 待填 | 待填 | 待填 |
| ai_task_runs | 待填 | 待填 | 待填 |
| matching_results | 待填 | 待填 | 待填 |

- `alembic_version`（恢复后应与发布头一致，如 `0009`）：待填
- 状态链抽样（建议查询，结果粘贴）：

```sql
-- 订单事件链：任取 2 个订单，确认事件按 created_at 有序且含起始事件
SELECT order_id, event_type, created_at FROM order_events
 WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT 2)
 ORDER BY order_id, created_at;
-- 智能结果与任务记录对应：最近一次 matching_results 能否在 ai_task_runs 找到同 result_version
SELECT mr.wanted_id, mr.facts->'metadata'->>'degraded' AS degraded,
       mr.result_version, r.task_id, r.outcome
  FROM matching_results mr
  LEFT JOIN ai_task_runs r ON r.result_version = mr.result_version
 ORDER BY mr.updated_at DESC LIMIT 3;
```

（待粘贴查询输出）

- 结论：待填（恢复后关键数量、约束与状态链一致 / 不一致及原因）
- 恢复耗时（`db_restore.sh` 墙钟，粗记 RTO 参考）：待填

## 四、已知限制（如实声明）

- 逻辑备份（`pg_dump -Fc`）不含 Docker 卷中 MinIO 对象文件——对象存储
  需另用 `mc mirror`/`aws s3 sync` 方案，本阶段未纳入（已与 M1 确认范围
  或登记遗留项：待填）；
- `pgvector` 向量列随全库逻辑备份/恢复保留，无需特殊处理；
- 恢复期间 API 短暂不可用（连接被重置），符合演练预期，不属于缺陷。
