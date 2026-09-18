/**
 * 按钮级权限组件
 *
 * 声明式地表达"当前用户能否对该订单执行某动作"，求值逻辑全部在
 * access/permissions.ts（参与关系 + 状态矩阵），本组件只负责渲染策略：
 * - enabled  → 原样渲染
 * - disabled → 渲染子元素并注入 disabled + Tooltip 说明原因
 * - hidden   → 渲染 fallback（默认不渲染）
 *
 * @example
 * <Can order={order} action="cancel" fallback={<span>-</span>}>
 *   <Button danger>取消订单</Button>
 * </Can>
 */

import { Tooltip } from 'antd'
import { cloneElement, useMemo, type ReactElement, type ReactNode } from 'react'
import type { Order } from '../types/transaction'
import {
  evaluateMeetupConfirm,
  evaluateOrderAction,
  hasGlobalPermission,
  resolveOfferRole,
  resolveOrderRole,
  type GlobalPermission,
  type OrderActionKey,
} from '../access/permissions'
import { useAuthStore } from '../stores/auth'

interface CanProps {
  action: OrderActionKey
  order: Order
  /** 只接受单个元素（Button 等），disabled 会注入到它身上 */
  children: ReactElement<any>
  /** visibility = hidden 时渲染的替代内容 */
  fallback?: ReactNode
}

export function Can({ action, order, children, fallback = null }: CanProps) {
  const user = useAuthStore((s) => s.user)
  const decision = evaluateOrderAction(user, order, action)

  if (decision.visibility === 'hidden') return <>{fallback}</>

  if (decision.visibility === 'disabled') {
    return (
      <Tooltip title={decision.reason}>
        {cloneElement(children, { disabled: true })}
      </Tooltip>
    )
  }

  return children
}

/**
 * 编程式权限判断。适用于按钮以外的场景（列表过滤、条件逻辑等）；
 * 纯按钮展示仍推荐 <Can>，权限规则集中可审计。
 */
export function useCan() {
  const user = useAuthStore((s) => s.user)

  return useMemo(
    () => ({
      /** 订单动作求值 */
      order: (order: Order, action: OrderActionKey) =>
        evaluateOrderAction(user, order, action),
      /** 见面约定确认求值 */
      meetupConfirm: (order: Order) => evaluateMeetupConfirm(user, order),
      /** 全局角色权限（管理员等） */
      has: (permission: GlobalPermission) => hasGlobalPermission(user, permission),
      /** 当前用户在订单中的视角 */
      orderRole: (order: Order) => resolveOrderRole(user?.id, order),
      /** 当前用户对报价的视角 */
      offerRole: (offer: Parameters<typeof resolveOfferRole>[1]) =>
        resolveOfferRole(user?.id, offer),
    }),
    [user]
  )
}
