/**
 * 权限求值层（按钮级）
 *
 * 与路由级守卫（RequireAuth / RequireRole）互补：
 * - 路由级：回答"这个页面能不能看"
 * - 本层：回答"这个按钮 / 这个动作，当前用户能不能点"
 *
 * 两类权限：
 * 1. 资源型（订单）：由「当前用户与订单的参与关系」+「订单状态操作矩阵」共同决定。
 *    不用前端硬编码 if，全部走 ORDER_ACTION_MATRIX 求值，与后端状态机共用一份契约。
 * 2. 全局型（角色静态授权）：如管理员裁决争议。student/admin 权限清单与 M5 对齐。
 *
 * 使用方式：
 * - 声明式：<Can order={order} action="cancel"><Button/></Can>（见 components/Can.tsx）
 * - 编程式：const can = useCan(); can.order(order, 'cancel')
 */

import { ORDER_ACTION_MATRIX, type OrderActionKey, type OrderRole } from '../constants/order'
import type { CurrentUser, UserRole } from '../types/user'
import type { Offer, Order } from '../types/transaction'

export type { OrderActionKey }

/* ---------- 参与关系推导 ---------- */

/** 当前用户在一笔订单中的视角：买方 / 卖方 / 无关 */
export type OrderParty = OrderRole | 'other'

export function resolveOrderRole(userId: number | undefined, order: Order): OrderParty {
  if (userId === order.buyer.id) return 'buyer'
  if (userId === order.seller.id) return 'seller'
  return 'other'
}

/** 当前用户对一个报价的视角（报价操作：买家可撤回，卖家可接受/还价/拒绝） */
export function resolveOfferRole(
  userId: number | undefined,
  offer: Offer
): 'buyer' | 'seller' | 'other' {
  if (userId === offer.buyerId) return 'buyer'
  if (userId === offer.sellerId) return 'seller'
  return 'other'
}

/* ---------- 订单动作求值 ---------- */

export interface PermissionDecision {
  visibility: 'enabled' | 'disabled' | 'hidden'
  /** disabled / hidden 时的原因（tooltip 或提示条用） */
  reason?: string
}

const DISPUTED_REASON = '争议处理中，等待管理员裁决'

/**
 * 求值"当前用户能否对某订单执行某动作"。
 * 规则链：参与关系 → 状态矩阵可见性。
 * @example evaluateOrderAction(user, order, 'cancel')
 */
export function evaluateOrderAction(
  user: CurrentUser | null,
  order: Order,
  action: OrderActionKey
): PermissionDecision {
  const role = resolveOrderRole(user?.id, order)
  if (role === 'other') {
    return { visibility: 'hidden', reason: '你不是该订单的参与方' }
  }
  const def = ORDER_ACTION_MATRIX[order.status][role].find((a) => a.key === action)
  if (!def) return { visibility: 'hidden', reason: '当前状态下无此操作' }
  return {
    visibility: def.visibility,
    reason: def.visibility === 'disabled' ? DISPUTED_REASON : undefined,
  }
}

/**
 * 求值"当前用户能否确认当前版本见面约定"。
 * 规则链：参与关系 → 订单状态（矩阵的 confirmMeetup）→ 自己一方是否已确认。
 */
export function evaluateMeetupConfirm(
  user: CurrentUser | null,
  order: Order
): PermissionDecision {
  const base = evaluateOrderAction(user, order, 'confirmMeetup')
  if (base.visibility !== 'enabled') return base
  const role = resolveOrderRole(user?.id, order)
  const meetup = order.meetup
  if (!meetup) return { visibility: 'hidden', reason: '尚未生成约定' }
  const mineConfirmed = role === 'buyer' ? meetup.buyerConfirmed : meetup.sellerConfirmed
  if (mineConfirmed) {
    return { visibility: 'hidden', reason: '你已确认当前版本，等待对方确认' }
  }
  return { visibility: 'enabled' }
}

/* ---------- 全局角色静态授权（与 M5 对齐） ---------- */

export type GlobalPermission =
  | 'dispute:handle' // 处理交易争议
  | 'report:moderate' // 处理举报
  | 'admin:panel' // 管理后台

export const ROLE_GRANTS: Record<UserRole, readonly GlobalPermission[]> = {
  student: [],
  admin: ['dispute:handle', 'report:moderate', 'admin:panel'],
}

export function hasGlobalPermission(
  user: CurrentUser | null,
  permission: GlobalPermission
): boolean {
  if (!user) return false
  return ROLE_GRANTS[user.role].includes(permission)
}
