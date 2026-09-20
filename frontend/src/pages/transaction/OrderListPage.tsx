import { Card, Empty, Skeleton, Space, Tabs, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, PageContainer } from '../../components'
import { useMockDbStore } from '../../stores/mockDb'
import { useAuthStore } from '../../stores/auth'
import { resolveOrderRole } from '../../access/permissions'
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '../../constants/order'
import type { Order, OrderStatus } from '../../types/transaction'

const { Text } = Typography

const TAB_FILTERS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  {
    key: 'active',
    label: '进行中',
    match: (s) => ['PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED'].includes(s),
  },
  { key: 'completed', label: '已完成', match: (s) => s === 'COMPLETED' },
  {
    key: 'cancelled',
    label: '已取消/争议',
    match: (s) => s === 'CANCELLED' || s === 'DISPUTED',
  },
]

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

export default function OrderListPage() {
  const navigate = useNavigate()
  /** 订单来自可变 mockDb：订单页的确认/取消动作会实时反映到列表状态 */
  const orders = useMockDbStore((s) => s.orders)
  /** 视角（我购买的 / 我出售的）由当前登录身份推导，不再写死 */
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('success')

  const renderList = (list: Order[]) => {
    if (state === 'loading')
      return <Skeleton active paragraph={{ rows: 5 }} style={{ padding: 16 }} />
    if (state === 'error')
      return <ErrorState message="订单加载失败" onRetry={() => setState('success')} />
    if (list.length === 0) return <Empty description="暂无订单" style={{ padding: 48 }} />
    return list.map((o) => {
      const role = resolveOrderRole(user?.id, o)
      const roleLabel = role === 'buyer' ? '我购买的' : role === 'seller' ? '我出售的' : '非参与方'
      const peer =
        role === 'buyer' ? o.seller.nickname : role === 'seller' ? o.buyer.nickname : '—'

      return (
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
              <Text strong style={{ color: '#c41d7f', marginRight: 16 }}>
                ¥{o.amount}
              </Text>
              <Tag color={ORDER_STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Tag>
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {roleLabel} · 对方：{peer} · 更新于 {fmtTime(o.updatedAt)}
            </Text>
          </div>
        </Card>
      )
    })
  }

  return (
    <PageContainer
      title="我的订单"
      extra={
        <Space>
          <a onClick={() => useMockDbStore.getState().resetDemo()}>[重置演示数据]</a>
          <a onClick={() => setState((s) => (s === 'success' ? 'error' : 'success'))}>
            [原型演示：切换失败状态]
          </a>
        </Space>
      }
    >
      <Card styles={{ body: { padding: '0 24px 24px' } }}>
        <Tabs
          defaultActiveKey="all"
          items={TAB_FILTERS.map((t) => ({
            key: t.key,
            label: `${t.label}（${orders.filter((o) => t.match(o.status)).length}）`,
            children: renderList(orders.filter((o) => t.match(o.status))),
          }))}
        />
      </Card>
    </PageContainer>
  )
}
