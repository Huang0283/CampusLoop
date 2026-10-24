# BP5-07 迁移发布报告（migration-release-report）

> 证据文件：`docs/evidence/phase-5/backend-platform/migration-release-report.md`
> 维护人：M9 ｜ 对应任务：BP5-07 从空库运行迁移，测试升级/回滚路径并校验迁移头
> 原则：只记录真实执行过的验证；未执行项标注"待执行"，不编造结果。

## 一、发布迁移链（0001 → 0009，单头）

| 迁移 | 内容（对应文件 docstring/任务） |
|---|---|
| `0001_initial_schema` | 初始 schema：全部 phase-2 表 |
| `0002_auth_sessions` | 认证会话族/令牌 lineage |
| `0003_mvp_business` | MVP 业务：商品/求购/报价/订单/消息/评价/通知等 |
| `0004_audit_context` | 审计上下文 |
| `0005_sequence_alignment` | 自增序列对齐（种子抬高序列后的碰撞修复） |
| `0006_matching_outbox` | 匹配 outbox/current/dedup（M6 任务队列） |
| `0007_matching_revision` | 匹配事实修订（revision/HttpOnly 会话摘要） |
| `0008_browser_sessions` | 浏览器会话 |
| `0009_ai_worker_runtime` | AI 观测表 `ai_task_runs` / `worker_heartbeats`（BP4-08） |

**单头约束**：`alembic heads` 必须恰好 1 个头（当前为 `0009`）；
`alembic current` 必须等于该头。任何新增迁移必须从 `0009` 线性延伸，
禁止分叉。

## 二、验证脚本与口径

脚本：`backend/scripts/verify_migrations.sh`（BP5-07 新增，M9 维护）。

流程（全部在**专用临时库** `campusloop_p5_migcheck` 上执行，与
phase-3 "回滚只进专用库" 约定一致，不触碰开发/演示/用户数据）：

```
0/5 重建临时库 → 1/5 空库 alembic upgrade head → 2/5 唯一头校验
（heads 数量=1 且 current==head）→ 3/5 alembic downgrade base（current 为空）
→ 4/5 复升 head（current==head）→ 5/5 结论；退出时自动删除临时库
```

任一步失败即非 0 退出并打印 `[FAIL]` 行。

## 三、执行结果（待实测后填写）

- 执行日期：待填
- 机器/系统：待填（与 BP2-09/BP4 同机）
- 检出的分支与提交号：待填（`git rev-parse --branch --short HEAD`）
- 脚本完整输出（`bash backend/scripts/verify_migrations.sh 2>&1 | tee migration-verify.log` 后粘贴）：

```
（待粘贴：含 5 个步骤标记与最终"迁移验证全部通过"行）
```

- 结论：待填（通过 / 不通过及原因）

## 四、失败恢复步骤（预置，供发布日使用）

| 情形 | 恢复动作 |
|---|---|
| 部署时 `upgrade head` 中途失败 | 1) `docker compose logs api` 定位失败的迁移号；2) 在临时环境 `alembic downgrade <上一稳定头>` 回到稳定点；3) 修复迁移文件后从该头重升。**禁止对演示/用户库做 downgrade base** |
| 出现多个迁移头 | 由 M9 在专用库重放定位分叉迁移，改为线性链（以新头为唯一 `down_revision`），重跑本报告脚本后才能发布 |
| 临时库残留 | 脚本 `trap cleanup` 自动删除；异常中断后手动：`docker compose exec db psql -U campusloop -d postgres -c "DROP DATABASE IF EXISTS campusloop_p5_migcheck;"` |
| 恢复演练中 api 报连接错误 | 预期行为（恢复期间连接被重置）；`db_restore.sh` 结束后 `docker compose restart api worker` 重建连接池 |

## 五、与 CI 的关系

CI 已含"空库 upgrade + downgrade base + 复升"步骤（每次 PR 执行）；
本脚本把同一口径固化为**发布前人工可复核**的证据（含唯一头校验与
可粘贴输出），两者结论独立记录。
