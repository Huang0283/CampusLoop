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
import { cloneElement, type ReactElement, type ReactNode } from 'react'
import type { Order } from '../types/transaction'
import { evaluateOrderAction, type OrderActionKey } from '../access/permissions'
import { useAuthStore } from '../stores/auth'

interface DisableableProps {
  disabled?: boolean
}

interface CanProps {
  action: OrderActionKey
  order: Order
  /** 只接受单个元素（Button 等），disabled 会注入到它身上 */
  children: ReactElement<DisableableProps>
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
