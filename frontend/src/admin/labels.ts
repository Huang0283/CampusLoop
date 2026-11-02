import type { OrderStatus, ReportStatus, ReportTargetType } from '../sdk'

export { reportReasonLabels } from '../live/reportReasons'
export { categoryLabels } from '../live/display'

// Same wording as the trade pages (live/TransactionPages.tsx), so students and administrators read the same status.
export const orderStatusLabels: Record<OrderStatus, string> = { PENDING_CONFIRM: '待约定', BOOKED: '已预订', MEETUP_ARRANGED: '见面已确认', COMPLETED: '已完成', CANCELLED: '已取消', DISPUTED: '争议中' }
export const reportStatusLabels: Record<ReportStatus, string> = { PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已处理', REJECTED: '已驳回' }
export const targetTypeLabels: Record<ReportTargetType, string> = { USER: '用户', PRODUCT: '商品', ORDER: '订单', CHAT_MESSAGE: '聊天消息' }

export const auditEventLabels: Record<string, string> = {
  admin_product_moderate: '商品人工处理', admin_report_resolve: '处理举报', admin_report_override: '改判举报',
  admin_user_disabled: '禁用账号', admin_user_active: '恢复账号', admin_user_status_unchanged: '账号状态未变化',
  admin_dashboard_read: '查看仪表盘', admin_orders_read: '查看订单', admin_audit_logs_read: '查看操作日志',
  admin_products_read: '查看商品队列', admin_product_read: '查看商品详情', admin_reports_read: '查看举报队列',
  admin_report_evidence_read: '查看举报证据', admin_users_read: '查看用户列表', admin_trust_read: '查看信用参考',
  admin_risk_clues_read: '查看风险线索', admin_report_replay: '重复提交（未重复执行）', admin_product_replay: '重复提交（未重复执行）',
}

export const resultStatusLabels: Record<string, string> = {
  ON_SALE: '恢复在售', HIDDEN: '已下架', RESOLVED: '已处理', REJECTED: '已驳回', ACTIVE: '正常', DISABLED: '已禁用',
}

/** Order statuses folded for the dashboard: three active steps read as one "in progress" slice. */
export const orderStatusGroups = [
  { key: 'active', label: '进行中', statuses: ['PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED'], color: 'var(--adm-blue)' },
  { key: 'done', label: '已完成', statuses: ['COMPLETED'], color: 'var(--adm-green)' },
  { key: 'cancelled', label: '已取消', statuses: ['CANCELLED'], color: 'var(--adm-gray)' },
  { key: 'disputed', label: '争议中', statuses: ['DISPUTED'], color: 'var(--adm-orange)' },
] as const

/** Reasons that put a report at the top of the queue and paint its row red. */
export const highRiskReasons = new Set(['FAKE_PRODUCT', 'HARASSMENT', 'VIOLATION'])
