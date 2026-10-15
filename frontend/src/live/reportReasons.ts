import type { ReportReason, ReportTargetType } from '../sdk'

export const reportReasonLabels: Record<ReportReason, string> = {
  FAKE_PRODUCT: '虚假商品', DESCRIPTION_MISMATCH: '商品描述不符',
  SPAM: '垃圾信息 / 广告', ABNORMAL_PRICE: '异常价格', HARASSMENT: '骚扰 / 辱骂', VIOLATION: '其他违规',
}

export function reportReasons(target: ReportTargetType, orderRole?: 'buyer' | 'seller') {
  const reasons: ReportReason[] = target === 'PRODUCT' || (target === 'ORDER' && orderRole === 'buyer')
    ? ['FAKE_PRODUCT', 'DESCRIPTION_MISMATCH', 'ABNORMAL_PRICE', 'SPAM', 'HARASSMENT', 'VIOLATION']
    : ['SPAM', 'HARASSMENT', 'VIOLATION']
  return reasons.map((value) => ({ value, label: target === 'ORDER' && value === 'VIOLATION'
    ? orderRole === 'seller' ? '交易违规（恶意下单、爽约等）' : '其他交易违规（爽约等）'
    : reportReasonLabels[value] }))
}
