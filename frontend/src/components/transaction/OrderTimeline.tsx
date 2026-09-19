import { Steps, Typography } from 'antd'
import type { OrderEventBrief } from '../../types/transaction'
import { ORDER_STATUS_LABEL } from '../../constants/order'

const { Text } = Typography

interface OrderTimelineProps {
  events: OrderEventBrief[]
}

const STEP_ORDER = ['PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED', 'COMPLETED'] as const

/**
 * 订单时间线：上半部分为状态进度条（四主态），
 * 下方为不可变事件流（含约定版本变化等明细）。
 */
export default function OrderTimeline({ events }: OrderTimelineProps) {
  const reached = new Set(events.map((e) => e.toStatus))
  const currentIdx = STEP_ORDER.reduce(
    (acc, s, i) => (reached.has(s) && i > acc ? i : acc),
    0
  )

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('zh-CN', { hour12: false })

  return (
    <div>
      <Steps
        size="small"
        current={currentIdx}
        items={STEP_ORDER.map((s) => ({ title: ORDER_STATUS_LABEL[s] }))}
      />
      <div style={{ marginTop: 16 }}>
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: '6px 0',
              borderBottom: '1px dashed #f0f0f0',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
              {fmt(e.createdAt)}
            </Text>
            <Text style={{ fontSize: 13 }}>{e.description}</Text>
          </div>
        ))}
      </div>
    </div>
  )
}
