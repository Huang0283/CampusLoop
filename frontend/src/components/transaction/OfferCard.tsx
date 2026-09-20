import { Tag, Typography } from 'antd'
import { Card } from 'antd'
import {
  OFFER_STATUS_LABEL,
  OFFER_STATUS_COLOR,
  OFFER_EXPIRE_HOURS,
} from '../../constants/offer'
import type { Offer } from '../../types/transaction'
import { CURRENT_USER_ID } from '../../mocks/transaction'
import { useAuthStore } from '../../stores/auth'
import { Button, Space } from 'antd'

const { Text } = Typography

interface OfferCardProps {
  offer: Offer
  /** 操作回调（原型阶段为空实现，接接口后由页面注入） */
  onAccept?: (offer: Offer) => void
  onReject?: (offer: Offer) => void
  onCounter?: (offer: Offer) => void
  onCancel?: (offer: Offer) => void
}

function isExpired(offer: Offer): boolean {
  return new Date(offer.expireAt).getTime() < Date.now()
}

function remainingText(offer: Offer): string {
  const ms = new Date(offer.expireAt).getTime() - Date.now()
  if (ms <= 0) return '已过期'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h < 1) return `剩 ${m} 分钟`
  return `剩 ${h} 小时`
}

/**
 * 结构化报价卡片：出价 / 还价 / 接受 / 拒绝 / 撤回 / 过期 六态。
 * 只有卖家视角且 PENDING 状态才展示操作按钮（与 M6 核对权限规则）。
 */
export default function OfferCard({ offer, onAccept, onReject, onCounter, onCancel }: OfferCardProps) {
  const expired = isExpired(offer)
  const status: Offer['status'] = expired && offer.status === 'PENDING' ? 'EXPIRED' : offer.status
  const userId = useAuthStore((s) => s.user?.id ?? CURRENT_USER_ID)
  const isMyOffer = offer.buyerId === userId
  const canOperate = offer.status === 'PENDING' && !expired && !isMyOffer

  const diff = offer.amount - offer.originalPrice
  const diffText =
    diff === 0 ? '按原价' : diff < 0 ? `比原价低 ¥${-diff}` : `高于原价 ¥${diff}`

  return (
    <Card
      size="small"
      style={{ maxWidth: 340, margin: '4px 0' }}
      styles={{ body: { padding: 12 } }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="purple">报价</Tag>
          <Tag color={OFFER_STATUS_COLOR[status]}>{OFFER_STATUS_LABEL[status]}</Tag>
          {offer.status === 'PENDING' && !expired && (
            <Text type={remainingText(offer).startsWith('剩') && remainingText(offer).includes('分钟') ? 'danger' : 'secondary'}>
              {remainingText(offer)}
            </Text>
          )}
        </Space>

        <div>
          <Text strong style={{ fontSize: 20, color: '#c41d7f' }}>
            ¥{offer.amount}
          </Text>
          <Text delete type="secondary" style={{ marginLeft: 8 }}>
            原价 ¥{offer.originalPrice}
          </Text>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>{diffText}</Text>

        {status === 'COUNTERED' && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            该报价已被还价替代，请查看最新报价
          </Text>
        )}
        {status === 'EXPIRED' && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            报价已过期（有效期 {OFFER_EXPIRE_HOURS} 小时），如仍有意向请重新出价
          </Text>
        )}

        {canOperate && (
          <Space style={{ marginTop: 4 }}>
            <Button type="primary" size="small" onClick={() => onAccept?.(offer)}>
              接受
            </Button>
            <Button size="small" onClick={() => onCounter?.(offer)}>
              还价
            </Button>
            <Button size="small" danger onClick={() => onReject?.(offer)}>
              拒绝
            </Button>
          </Space>
        )}
        {isMyOffer && offer.status === 'PENDING' && !expired && (
          <Button size="small" type="text" onClick={() => onCancel?.(offer)}>
            撤回报价
          </Button>
        )}
      </Space>
    </Card>
  )
}
