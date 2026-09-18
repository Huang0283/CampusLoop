import type { ReportReason } from '../types/transaction'

/** 举报原因枚举 —— 与 M6（举报接口）/ M9（枚举字典）核对 */
export const REPORT_REASONS: ReportReason[] = [
  'FAKE_PRODUCT',
  'DESCRIPTION_MISMATCH',
  'SPAM',
  'ABNORMAL_PRICE',
  'HARASSMENT',
  'VIOLATION',
]

export const REPORT_TARGET_LABELS: Record<string, string> = {
  USER: '用户',
  PRODUCT: '商品',
  ORDER: '交易',
  CHAT_MESSAGE: '聊天消息',
}
