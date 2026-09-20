# 03 · 双账号完整交易泳道图（M4 ↔ M10 演示脚本基线 v0.1）

> 用途：第三次汇报「双账号基础交易闭环」演示脚本 + M10 端到端测试场景来源。
> 账号：买家 B（buyer@test.edu）｜ 卖家 S（seller@test.edu）｜ 管理员 A（admin@test.edu）

```mermaid
sequenceDiagram
    actor B as 买家B
    participant FE as 前端(React)
    actor S as 卖家S
    participant BE as 后端(FastAPI/M6)

    B->>FE: 1. 搜索并打开商品详情
    B->>FE: 2. 点击「聊一聊」
    FE->>BE: 创建/获取会话
    B->>FE: 3. 发起报价 ¥420
    FE->>BE: POST /offers (Idempotency-Key)
    BE->>S: WS推送 OFFER_RECEIVED
    S->>FE: 4. 查看报价卡片，选择「还价」¥450
    FE->>BE: POST /offers/{id}/counter
    BE->>B: WS推送 OFFER_UPDATE(已还价)
    B->>FE: 5. 接受还价 ¥450
    FE->>BE: POST /offers/{id}/accept
    BE->>BE: 创建订单 PENDING_CONFIRM + 锁定商品
    BE->>S: WS推送 ORDER_STATUS_CHANGED

    Note over B,S: === 见面约定（双方确认同一版本） ===
    B->>FE: 6. 填写见面约定 周一16:00 图书馆门前
    FE->>BE: POST /orders/{id}/meetup (version=1)
    S->>FE: 7. 确认约定 v1
    BE->>B: WS推送 约定已确认(1/2)
    B->>FE: 8. 确认约定 v1
    FE->>BE: POST /orders/{id}/confirm-meetup
    BE->>BE: 订单 → BOOKED
    B-->>FE: 顶部提示「已预约：周一 16:00 图书馆门前」

    Note over B,S: === 线下面交 ===
    B->>FE: 9a. 面交后点「确认完成」
    S->>FE: 9b. 面交后点「确认完成」
    BE->>BE: 双方确认同一预约版本 → COMPLETED，商品转已售
    BE->>B,S: WS推送 REVIEW_REQUEST

    Note over B,S: === 互评 ===
    B->>FE: 10. 评价：总体5 描述准确5 沟通5 守时5
    S->>FE: 11. 评价：总体4 描述准确4 沟通5 守时4
    BE->>BE: 聚合评分（仅已完成订单计入信誉）
```

## 异常分支（M10 并发 / 断线测试场景）

| # | 场景 | 预期结果 |
|---|---|---|
| E1 | 买家B与买家B2同时接受同一报价 | B 成功；B2 收到 409，前端刷新并提示「商品已被锁定」 |
| E2 | 报价 48h 未处理 | Offer → EXPIRED，卡片置灰，操作按钮消失 |
| E3 | 聊天中断网 30s 再恢复 | 顶部黄条→恢复后增量补拉，消息不丢不重 |
| E4 | 发送消息时断网 | 气泡显示失败标记，恢复后点击重试，同一 clientMsgId 幂等 |
| E5 | 卖家在买家确认后修改约定 | version+1，双方确认清零，双方看到橙色「约定已修改」提示 |
| E6 | 买家单方点完成、卖家不点 | 订单停在 BOOKED/MEETUP_ARRANGED，按钮显示「等待对方确认」 |
| E7 | 非参与者直接访问订单 URL | 跳转 /403 |
| E8 | 买家对已完成订单重复提交评价 | 第二次请求被拒，前端提示「已评价过」 |
| E9 | 任一方举报订单且管理员受理 | 订单 → DISPUTED，取消按钮禁用并提示等待管理员 |
| E10 | 管理员 A 处理举报（裁决完成/取消） | 双方收到 REPORT_RESULT 通知，订单状态同步 |
