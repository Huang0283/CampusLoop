import { Card, Empty, Skeleton, Tabs, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, PageContainer } from '../../components'
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '../../constants/order'
import { CURRENT_USER_ID } from '../../mocks/transaction'
import { useMockDbStore } from '../../stores/mockDb'
import { useAuthStore } from '../../stores/auth'
import type { Order, OrderStatus } from '../../types/transaction'

const { Text } = Typography

const ROLE_TABS = [
  { key: 'buying', label: '我购买的', role: 'buyer' as const },
  { key: 'selling', label: '我出售的', role: 'seller' as const },
  {
    key: 'ongoing',
    label: '进行中',
    match: (s: OrderStatus) => ['PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED'].includes(s),
  },
  {
    key: 'finished',
    label: '已结束',
    match: (s: OrderStatus) => ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(s),
  },
]

/**
 * 个人交易中心（任务 #10）：区分 购买 / 出售 / 进行中 / 已结束。
 * 前两个按角色维度，后两个按状态维度，可交叉（原型按 tab 独立过滤演示）。
 */
export default function MyTransactionsPage() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id ?? CURRENT_USER_ID)
  const orders = useMockDbStore((s) => s.orders)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('success')

  const filterOrders = (key: string) => {
    switch (key) {
      case 'buying':
        return orders.filter((o) => o.buyer.id === userId)
      case 'selling':
        return orders.filter((o) => o.seller.id === userId)
      case 'ongoing':
        return orders.filter((o) => ROLE_TABS[2].match!(o.status))
      case 'finished':
        return orders.filter((o) => ROLE_TABS[3].match!(o.status))
      default:
        return orders
    }
  }

  const renderOrders = (list: Order[]) => {
    if (state === 'loading') return <Skeleton active paragraph={{ rows: 4 }} style={{ padding: 16 }} />
    if (state === 'error') return <ErrorState message="交易记录加载失败" onRetry={() => setState('success')} />
    if (list.length === 0)
      return <Empty description="这里还什么都没有" style={{ padding: 48 }} />
    return list.map((o) => (
      <Card
        key={o.id}
        size="small"
        hoverable
        style={{ marginBottom: 12 }}
        onClick={() => navigate(`/transactions/${o.id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>订单 #{o.id}</Text>
            <Text style={{ marginLeft: 12 }}>{o.product.title}</Text>
          </div>
          <div>
            <Text strong style={{ color: '#c41d7f', marginRight: 16 }}>¥{o.amount}</Text>
            <Tag color={ORDER_STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Tag>
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {o.buyer.id === userId
              ? `卖家：${o.seller.nickname}`
              : `买家：${o.buyer.nickname}`}
            {o.meetup && ` · 约定：${o.meetup.scheduledDate} ${o.meetup.timeSlotStart} ${o.meetup.campusLocation}`}
          </Text>
        </div>
      </Card>
    ))
  }

  return (
    <PageContainer
      title="个人交易中心"
      extra={
        <a onClick={() => setState((s) => (s === 'success' ? 'error' : 'success'))}>
          [原型演示：切换失败状态]
        </a>
      }
    >
      <Card styles={{ body: { padding: '0 24px 24px' } }}>
        <Tabs
          defaultActiveKey="buying"
          items={ROLE_TABS.map((t) => ({
            key: t.key,
            label: t.label,
            children: renderOrders(filterOrders(t.key)),
          }))}
        />
      </Card>
    </PageContainer>
  )
}
