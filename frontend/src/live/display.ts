import type { Product } from '../sdk'

export const conditionLabels: Record<string, string> = { NEW: '全新', LIKE_NEW: '九成新', GOOD: '八成新', FAIR: '七成新', ANY: '不限成色' }
export const categoryLabels: Record<string, string> = { BOOKS: '图书教材', DIGITAL: '数码电子', DAILY: '生活用品', SPORTS: '运动户外', clothing: '服饰鞋包', other: '其他' }
export const productStatusLabels: Record<Product['status'], string> = { ON_SALE: '在售', HIDDEN: '已下架', RESERVED: '已预订', SOLD: '已售出' }
export const wantedStatusLabels: Record<string, string> = { OPEN: '求购中', MATCHED: '已匹配', CLOSED: '已关闭', EXPIRED: '已过期' }
export function displayDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未提供'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
