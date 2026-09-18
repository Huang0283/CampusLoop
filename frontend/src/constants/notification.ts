/**
 * 站内通知类型契约 —— 与 M6 / M7 核对
 */

import type { NotificationType } from '../types/transaction'

export const NOTIFICATION_TYPE = {
  MESSAGE: 'MESSAGE',
  OFFER_RECEIVED: 'OFFER_RECEIVED',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  OFFER_REJECTED: 'OFFER_REJECTED',
  MATCH_FOUND: 'MATCH_FOUND',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  MEETUP_REMINDER: 'MEETUP_REMINDER',
  REVIEW_REQUEST: 'REVIEW_REQUEST',
  REPORT_RESULT: 'REPORT_RESULT',
} as const satisfies Record<string, NotificationType>

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  MESSAGE: '新消息',
  OFFER_RECEIVED: '收到报价',
  OFFER_ACCEPTED: '报价被接受',
  OFFER_REJECTED: '报价被拒绝',
  MATCH_FOUND: '求购匹配',
  ORDER_STATUS_CHANGED: '订单变化',
  MEETUP_REMINDER: '见面提醒',
  REVIEW_REQUEST: '评价邀请',
  REPORT_RESULT: '举报处理结果',
}

/** 通知 tab 分组：全部 / 消息 / 交易 / 智能匹配 / 治理 */
export const NOTIFICATION_TABS: { key: string; label: string; types?: string[] }[] = [
  { key: 'all', label: '全部' },
  { key: 'message', label: '消息', types: ['MESSAGE'] },
  {
    key: 'trade',
    label: '交易',
    types: [
      'OFFER_RECEIVED',
      'OFFER_ACCEPTED',
      'OFFER_REJECTED',
      'ORDER_STATUS_CHANGED',
      'MEETUP_REMINDER',
      'REVIEW_REQUEST',
    ],
  },
  { key: 'match', label: '智能匹配', types: ['MATCH_FOUND'] },
  { key: 'governance', label: '治理', types: ['REPORT_RESULT'] },
]
