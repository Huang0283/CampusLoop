/**
 * 报价（Offer）状态契约 —— 与 M6 共同维护
 */

import type { OfferStatus } from '../types/transaction'

export const OFFER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  COUNTERED: 'COUNTERED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const satisfies Record<string, OfferStatus>

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: '待处理',
  ACCEPTED: '已接受',
  REJECTED: '已拒绝',
  COUNTERED: '已还价',
  EXPIRED: '已过期',
  CANCELLED: '已撤回',
}

export const OFFER_STATUS_COLOR: Record<OfferStatus, string> = {
  PENDING: 'processing',
  ACCEPTED: 'success',
  REJECTED: 'default',
  COUNTERED: 'warning',
  EXPIRED: 'default',
  CANCELLED: 'default',
}

/** 报价默认有效期（小时），需与 M6 确认 */
export const OFFER_EXPIRE_HOURS = 48
