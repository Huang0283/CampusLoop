/**
 * 订单状态机（前端侧契约）
 *
 * ⚠ 状态迁移只能由后端动作接口驱动（接受报价、确认见面、确认完成…），
 * 前端禁止自行修改订单状态
 * 此处枚举必须与 M6 的后端状态机一致，变更需双方确认。
 */

import type { OrderStatus } from '../types/transaction'

export const ORDER_STATUS = {
  PENDING_CONFIRM: 'PENDING_CONFIRM',
  BOOKED: 'BOOKED',
  MEETUP_ARRANGED: 'MEETUP_ARRANGED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const satisfies Record<string, OrderStatus>

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_CONFIRM: '待确认',
  BOOKED: '已预约',
  MEETUP_ARRANGED: '见面已安排',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  DISPUTED: '有争议',
}

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING_CONFIRM: 'gold',
  BOOKED: 'blue',
  MEETUP_ARRANGED: 'geekblue',
  COMPLETED: 'green',
  CANCELLED: 'default',
  DISPUTED: 'red',
}

/** 用户角色（订单内视角） */
export type OrderRole = 'buyer' | 'seller'

/** 操作 key 集合（各状态下动作的并集，供 access/permissions.ts 求值与 <Can> 使用） */
export type OrderActionKey =
  | 'viewMeetup'
  | 'confirmMeetup'
  | 'confirmComplete'
  | 'cancel'
  | 'writeReview'
  | 'viewReview'
  | 'report'

/**
 * 操作矩阵：不同订单状态下，买方 / 卖方可以执行的动作。
 *
 * - `enabled`：按钮可见且可用
 * - `disabled`：按钮可见但禁用，tooltip 说明原因（用于提示而非隐藏）
 * - `hidden`：不展示
 *
 * 该矩阵是《01-transaction-state-machine.md》的操作矩阵文档的代码化版本，
 * 与文档一起维护，供与 M6 / M10 核对。
 */
export interface OrderAction {
  key: OrderActionKey
  label: string
  danger?: boolean
  visibility: 'enabled' | 'disabled' | 'hidden'
}

export const ORDER_ACTION_MATRIX: Record<OrderStatus, Record<OrderRole, OrderAction[]>> = {
  PENDING_CONFIRM: {
    buyer: [
      { key: 'viewMeetup', label: '查看/填写见面约定', visibility: 'enabled' },
      { key: 'confirmMeetup', label: '确认见面约定', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'enabled', danger: true },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
    seller: [
      { key: 'viewMeetup', label: '查看/填写见面约定', visibility: 'enabled' },
      { key: 'confirmMeetup', label: '确认见面约定', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'enabled', danger: true },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
  },
  BOOKED: {
    buyer: [
      { key: 'viewMeetup', label: '查看见面约定', visibility: 'enabled' },
      { key: 'confirmComplete', label: '确认完成', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'enabled', danger: true },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
    seller: [
      { key: 'viewMeetup', label: '查看见面约定', visibility: 'enabled' },
      { key: 'confirmComplete', label: '确认完成', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'enabled', danger: true },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
  },
  MEETUP_ARRANGED: {
    buyer: [
      { key: 'viewMeetup', label: '查看见面约定', visibility: 'enabled' },
      { key: 'confirmComplete', label: '确认完成', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'enabled', danger: true },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
    seller: [
      { key: 'viewMeetup', label: '查看见面约定', visibility: 'enabled' },
      { key: 'confirmComplete', label: '确认完成', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'enabled', danger: true },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
  },
  COMPLETED: {
    buyer: [
      { key: 'viewReview', label: '查看评价', visibility: 'enabled' },
      { key: 'writeReview', label: '评价对方', visibility: 'enabled' },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
    seller: [
      { key: 'viewReview', label: '查看评价', visibility: 'enabled' },
      { key: 'writeReview', label: '评价对方', visibility: 'enabled' },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
  },
  CANCELLED: {
    buyer: [{ key: 'report', label: '举报', visibility: 'enabled' }],
    seller: [{ key: 'report', label: '举报', visibility: 'enabled' }],
  },
  DISPUTED: {
    buyer: [
      { key: 'viewMeetup', label: '查看见面约定', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'disabled' },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
    seller: [
      { key: 'viewMeetup', label: '查看见面约定', visibility: 'enabled' },
      { key: 'cancel', label: '取消订单', visibility: 'disabled' },
      { key: 'report', label: '举报', visibility: 'enabled' },
    ],
  },
}
