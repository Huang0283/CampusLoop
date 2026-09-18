# M4 · 按钮级权限（Can / useCan）

> 任务 16 相关：路由级 `<RequireAuth>` / `<RequireRole>` 只回答"页面能不能看"，
> 本文档描述页面内**按钮 / 动作**能不能点的求值体系。对应代码：`src/access/permissions.ts`、`src/components/Can.tsx`。

## 1. 分层

| 层 | 位置 | 职责 |
|---|---|---|
| 身份基座 | `stores/auth.ts`（Zustand） | 当前用户 `id / nickname / role`，持久化到 localStorage（键与路由守卫一致，守卫零改动） |
| 求值层 | `access/permissions.ts` | 纯函数：参与关系推导 + 状态矩阵求值 + 角色静态授权，无任何 UI / 请求 |
| 声明层 | `components/Can.tsx` | `<Can order action>` 组件与 `useCan()` hook，把求值结果映射为 渲染 / 禁用 / 隐藏 |

## 2. 两类权限

### 2.1 资源型（订单动作）

求值链：**参与关系 → 状态矩阵**

```
resolveOrderRole(user.id, order)   →  'buyer' | 'seller' | 'other'
evaluateOrderAction(user, order, 'cancel')
  → { visibility: 'enabled' | 'disabled' | 'hidden', reason? }
```

- `other`（非买卖双方）→ 所有动作 hidden，页面显示"仅可查看公开信息"告警
- 状态矩阵沿用 `ORDER_ACTION_MATRIX`（`constants/order.ts`），**与后端状态机共用一份契约**
- 争议中（DISPUTED）的取消 → disabled + tooltip "争议处理中，等待管理员裁决"

### 2.2 全局型（角色静态授权）

```
ROLE_GRANTS: student → []
             admin   → ['dispute:handle', 'report:moderate', 'admin:panel']
```

## 3. 使用方式

```tsx
// 声明式（按钮首选，权限规则集中可审计）
<Can order={order} action="cancel" fallback={<span>-</span>}>
  <Button danger>取消订单</Button>
</Can>

// 编程式（列表过滤、条件逻辑）
const can = useCan()
can.order(order, 'confirmComplete')   // 订单动作
can.meetupConfirm(order)              // 见面约定确认（含"我方已确认"判断）
can.orderRole(order)                   // 我在订单中的视角
can.offerRole(offer)                   // 我对报价的视角
can.has('dispute:handle')              // 管理员权限
```

## 4. 原型演示约定

- 订单详情页右上角"切换为卖家/买家视角"= 调 `switchUser()` **改全局登录身份**（写 localStorage），
  之后订单操作、见面确认、报价卡片（OfferCard）、个人交易中心、聊天 senderId 全部随之变化 ——
  演示的是**真实求值链路**，不是页面局部动画。
- `PrototypeLoginPage` 进入原型 = `login({ id: 1, ... })` 写入同一身份体系。

## 5. 与后端的边界（联调时对齐）

1. **前端权限只管展示**：按钮隐藏 ≠ 接口安全。M6 每个动作接口必须做服务端参与关系校验（403）。
2. `iConfirmedComplete / peerConfirmedComplete` 是"相对视角"字段，真实接口建议返回
   `myConfirmed` / `peerConfirmed` 或由前端按 user.id 推导，避免双端理解不一致。
3. 管理员权限清单（`ROLE_GRANTS`）需与 M5 的鉴权方案对齐；若后端返回权限列表，替换为运行时数据。
