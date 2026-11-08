# M4 举报闭环收尾（FE5-06 / FE5-07）

## 背景

Phase 5 复核发现举报主链路可提交、可查看、可处理，但举报人侧缺少结果闭环：处理完成后没有 `REPORT_RESULT` 通知，`/reports/mine` 不返回处理时间与处理说明，列表无分页；同时商品详情允许卖家举报自己，求购详情没有举报入口。

## 变更

### 后端

- `reports` 新增 `resolution_note`（迁移 `0011`），管理员处理时写入 `Resolution.note`。
- `GET /reports/mine` 返回 `handledAt`、`resolutionNote`；仍不返回 `handledBy` 与证据键。
- `GET /reports/mine` 支持 `page`、`pageSize`（1–100，默认 20），按 id 倒序分页。
- `POST /admin/reports/{id}/resolve|override` 成功后向举报人创建 `REPORT_RESULT` 通知，标题为“举报已处理/举报已驳回”，内容为“处理说明：…”，链接 `/report`。
- `POST /reports` 对 `targetType=USER` 且目标为自己的请求返回 400 `SELF_REPORT_FORBIDDEN`。
- `notify()` 增加可选 `content`，原有调用行为不变。

### 前端

- `/report`：展示“处理于”与“处理说明”，增加刷新和上一页/下一页；商品/订单目标可点击回到详情，用户与聊天消息保持文本。
- 商品详情：卖家本人不再看到“举报商品/举报卖家”。
- 求购详情：非发布者的登录学生看到“举报发布者”（`targetType=USER`）。

### 契约

- `Report` 增加 `handledAt`、`resolutionNote`（均可空，标记为 required 以固定字段）。
- `GET /reports/mine` 增加 `Page`、`PageSize` 参数，响应描述改为不包含证据键与内部审计字段。
- SDK 已重新生成（`npm run sdk:generate`），仅 `types.gen.ts` 有实质差异。

## 验证

环境：Windows，Node.js 24.21.0，Docker Compose（API 8001、PostgreSQL、Redis、MinIO、baseline、worker），Vite 5173。

后端（在 `campusloop_test` 库，迁移到 `0011`）：

```bash
python -m pytest tests/test_governance_api.py tests/test_transaction_api.py -q
ruff check app tests
```

- 两个文件共 21 个测试函数全部通过（退出码 0），包含新增的 `resolution_note`、自举报拒绝、分页边界。
- `ruff check` 输出 `All checks passed`。

前端：

```bash
npm run lint
npm run build
npm run test:m4
npm run test:transaction
```

- lint 通过；build 成功（5.56 秒）。
- `test:m4` 19 项通过（新增“处理说明与结果通知”与“客户端展示/禁止自举报”两组断言）。
- `test:transaction` 8 项通过。

浏览器（真实后端）：

- 举报提交流程：`chen.demo@example.com` 举报商品 #2031，原因“商品描述不符”，提交成功并出现在“我的举报”。
- 管理员处理：`POST /admin/reports/11010/resolve` 返回 200。
- 刷新 `/report`：显示“处理于 2026/10/26 15:24:41”“处理说明：已核实商品信息，卖家已修正描述。”“已处理”。
- 通知页：出现“举报已处理 / 处理说明：已核实商品信息，卖家已修正描述。”。
- 核验后已删除该测试举报与对应通知，保留管理员审计记录。
- `journey.spec.ts` 6 项、`interface-restoration.spec.ts` 10 项、`m2-phase4.spec.ts` 6 项、`m2-notification-sync.spec.ts` 1 项通过（共 23 项）。

## 环境说明

- 原 API 容器为 2026-10-13 旧镜像，缺少 `/admin/reports`；已用当前代码重建并迁移到 `0011`。
- 价格基线测试最初失败是因为 `baseline` 服务未启动，启动后通过；与本改动无关。
- 注册限流仍为每 IP 10 次/小时，浏览器测试按 spec 分批执行并清空 Redis `auth:*`。

## 未完成与风险

- `governance.py`、`transactions.py`、`Report` 模型属 M5/M6 后端治理范围，本次改动需 M5/M6 对签；`0011` 迁移需 M1 在阶段汇总时确认。
- 历史举报的 `resolution_note` 为空，页面不显示处理说明；不回填审计内容，避免把内部审计复制给举报人。
- `CHAT_MESSAGE` 与 `USER` 目标仍不可点击跳转，因为前端没有按消息 id 或用户 id 的安全回跳路由。
- 本文件是 M4 作者执行记录，不代替 M10 独立验收与 M2/M3 交叉评审。
