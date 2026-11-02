import type { Product } from '../sdk'

export const conditionLabels: Record<string, string> = { NEW: '全新', LIKE_NEW: '九成新', GOOD: '八成新', FAIR: '七成新', POOR: '较旧', ANY: '不限成色' }
export const categoryLabels: Record<string, string> = { BOOKS: '图书教材', STATIONERY: '文具文创', DIGITAL: '数码电子', DAILY: '生活用品', FURNITURE: '家具家电', BEDDING: '寝具床品', TRANSPORT: '交通代步', SPORTS: '运动户外', clothing: '服饰鞋包', other: '其他' }
export const productStatusLabels: Record<Product['status'], string> = { ON_SALE: '在售', HIDDEN: '已下架', RESERVED: '已预订', SOLD: '已售出' }
export const wantedStatusLabels: Record<string, string> = { OPEN: '求购中', MATCHED: '已匹配', CLOSED: '已关闭', EXPIRED: '已过期' }
export const accountStatusLabels: Record<string, string> = { ACTIVE: '正常', DISABLED: '已禁用' }
export const roleLabels: Record<string, string> = { USER: '普通用户', ADMIN: '管理员' }
export const reportStatusLabels: Record<string, string> = { PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已处理', REJECTED: '已驳回' }
export const targetTypeLabels: Record<string, string> = { USER: '用户', PRODUCT: '商品', WANTED: '求购', ORDER: '订单', TRANSACTION: '交易', MESSAGE: '消息', CHAT_MESSAGE: '聊天消息' }
const systemLabels: Record<string, string> = {
  ...accountStatusLabels, ...roleLabels, ...reportStatusLabels, ...targetTypeLabels,
  INSUFFICIENT_DATA: '数据不足，暂不能完整判断', AVAILABLE: '可用', UNAVAILABLE: '暂不可用', LOW_CONFIDENCE: '参考依据有限',
  CLUES_FOUND: '发现需要人工复核的线索', NO_RULE_CLUES: '暂未发现规则线索', NEW_USER_NEUTRAL: '暂无有效交易评价，使用中性参考',
  NONE: '暂无处理建议', MANUAL_REVIEW: '建议人工复核',
  failedPaymentCount24h: '近24小时支付失败次数（平台暂未接入支付）',
  sameDeviceAccountCount7d: '近7天同设备账号数（平台暂未采集设备信息）',
  listingCount1h: '近1小时发布商品数', distinctCounterpartyCount24h: '近24小时不同交易联系人数', reportCount7d: '近7天被举报次数',
  REPEATED_PAYMENT_FAILURES: '多次支付失败', BURST_LISTING_ACTIVITY: '短时间内大量发布商品', COUNTERPARTY_BURST: '短时间内联系多人',
  SHARED_DEVICE_CLUSTER: '同设备关联多个账号', RECENT_REPORT_CLUSTER: '近期收到多次举报',
  SERVICE_DISABLED: '检索服务未启用，使用本地规则', MODEL_DISABLED: '语义模型未启用，使用关键词搜索',
  SERVICE_UNAVAILABLE: '服务暂不可用，使用备用结果', SERVICE_TIMEOUT: '服务响应超时，使用备用结果',
  INVALID_SERVICE_RESPONSE: '服务返回异常，使用备用结果', NO_ELIGIBLE_L3_LABELS: '缺少已核验的成交样本，当前结果仅供参考',
  TEXT_MATCH: '名称或简介相关', BUDGET_MATCH: '符合预算', CATEGORY_MATCH: '符合分类', CONDITION_MATCH: '符合成色要求',
  LOCATION_MATCH: '符合交易地点', MODEL_MATCH: '符合型号', BUDGET_OK: '预算符合',
  'm8-risk-clue-rule-v1': '风险线索规则（第1版）', 'm8-price-rule-v1': '价格参考规则（第1版）', 'm8-trust-rule-v1': '信用参考规则（第1版）',
  'New message': '收到新消息', 'Offer accepted': '报价已接受', 'Offer rejected': '报价已拒绝',
  'Offer accepted; order created': '报价已接受，订单已创建', 'Meeting proposal changed; confirmations reset': '见面约定已修改，双方需重新确认',
  'Meeting version confirmed': '已确认当前见面约定', 'Completion confirmed': '已确认完成交易', 'Order cancelled': '订单已取消',
  'Review this completed transaction': '交易已完成，请评价本次交易',
  MESSAGE: '新消息', OFFER_RECEIVED: '收到新报价', OFFER_ACCEPTED: '报价已接受', OFFER_REJECTED: '报价已拒绝',
  ORDER_STATUS_CHANGED: '订单状态已更新', REVIEW_REQUEST: '请评价本次交易', MATCH_FOUND: '发现匹配商品',
}

// Translate service-owned identifiers. User-authored names, email and prose are
// rendered directly by their own fields and never passed through this function.
export function systemText(value?: string, fallback = '暂未提供') {
  if (!value) return fallback
  return systemLabels[value] || (/[\u3400-\u9fff]/u.test(value) && !/[a-zA-Z_]{3,}/u.test(value) ? value : fallback)
}

export function riskClueText(clue: Record<string, unknown>) {
  const title = systemText(String(clue.code || ''), '需要人工复核的线索')
  const field = systemText(String(clue.field || ''), '相关指标')
  const observed = typeof clue.observed === 'number' ? clue.observed : '未知'
  const threshold = typeof clue.threshold === 'number' ? clue.threshold : '未知'
  return `${title}：${field}为${observed}，人工复核参考线为${threshold}。`
}
export function displayDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未提供'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
