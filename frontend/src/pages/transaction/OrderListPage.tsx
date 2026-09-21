import { Card, Empty, Skeleton, Space, Tabs, Tag, Typography } from 'antd'
import type { TabsProps } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar, ErrorState, PageContainer } from '../../components'
import { useMockDbStore } from '../../stores/mockDb'
import { useAuthStore } from '../../stores/auth'
import { resolveOrderRole } from '../../access/permissions'
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '../../constants/order'
import type { Order, OrderStatus } from '../../types/transaction'

const { Text } = Typography

const PROCESSING_STATUS: OrderStatus[] = [
  'PENDING_CONFIRM',
  'BOOKED',
  'MEETUP_ARRANGED',
  'DISPUTED',
]
const FINISHED_STATUS: OrderStatus[] = ['COMPLETED', 'CANCELLED']

type TabKey = 'all' | 'buy' | 'sell' | 'processing' | 'finished'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

function filterOrders(key: TabKey, orders: Order[], userId: number | undefined) {
  switch (key) {
    case 'buy':
      return orders.filter((order) => order.buyer.id === userId)
    case 'sell':
      return orders.filter((order) => order.seller.id === userId)
    case 'processing':
      return orders.filter((order) => PROCESSING_STATUS.includes(order.status))
    case 'finished':
      return orders.filter((order) => FINISHED_STATUS.includes(order.status))
    default:
      return orders
  }
}

function OrderCard({ order, userId, onClick }: { order: Order; userId?: number; onClick: () => void }) {
  const role = resolveOrderRole(userId, order)
  const roleLabel = role === 'buyer' ? '我购买的' : role === 'seller' ? '我出售的' : '非参与方'
  const peer = role === 'buyer' ? order.seller.nickname : role === 'seller' ? order.buyer.nickname : '—'

  return (
    <Card hoverable size="small" style={{ marginBottom: 12 }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <img
          src={`https://picsum.photos/seed/p${order.productId}/240/180`}
          alt={order.product.title}
          style={{ width: 120, height: 90, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text strong>订单 #{order.id}</Text>
            <Text ellipsis>{order.product.title}</Text>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
            {roleLabel} · 对方：{peer} · 更新于 {fmtTime(order.updatedAt)}
          </Text>
          <Text strong style={{ display: 'block', marginTop: 8, color: '#2f6bff', fontSize: 18 }}>
            ¥{order.amount}
          </Text>
        </div>
        <Tag color={ORDER_STATUS_COLOR[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Tag>
      </div>
    </Card>
  )
}

export default function OrderListPage() {
  const navigate = useNavigate()
  const orders = useMockDbStore((state) => state.orders)
  const user = useAuthStore((state) => state.user)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('success')

  const relatedOrders = orders.filter((order) => order.buyer.id === user?.id || order.seller.id === user?.id)
  const visibleOrders = filterOrders(activeTab, orders, user?.id)
  const tabLabel = (key: TabKey, label: string) => `${label}（${filterOrders(key, orders, user?.id).length}）`
  const tabItems: TabsProps['items'] = [
    { key: 'all', label: tabLabel('all', '全部') },
    { key: 'buy', label: tabLabel('buy', '购买') },
    { key: 'sell', label: tabLabel('sell', '出售') },
    { key: 'processing', label: tabLabel('processing', '进行中') },
    { key: 'finished', label: tabLabel('finished', '已结束') },
  ]

  const renderList = () => {
    if (state === 'loading') return <Skeleton active paragraph={{ rows: 5 }} style={{ padding: 16 }} />
    if (state === 'error') return <ErrorState message="订单加载失败" onRetry={() => setState('success')} />
    if (visibleOrders.length === 0) return <Empty description="暂无相关订单" style={{ padding: 48 }} />
    return visibleOrders.map((order) => (
      <OrderCard
        key={order.id}
        order={order}
        userId={user?.id}
        onClick={() => navigate(`/transactions/${order.id}`)}
      />
    ))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', marginLeft: 220 }}>
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 220,
          background: '#ffffff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          zIndex: 120,
        }}
      >
        <AppSidebar />
      </aside>
      <PageContainer
        title="我的订单"
        extra={
          <Space>
            <Text type="secondary">当前身份：{user?.nickname ?? '未登录'} · 与我相关 {relatedOrders.length} 笔</Text>
            <a onClick={() => useMockDbStore.getState().resetDemo()}>重置演示数据</a>
            <a onClick={() => setState((current) => (current === 'error' ? 'success' : 'error'))}>切换失败状态</a>
          </Space>
        }
      >
        <Card styles={{ body: { padding: '0 24px 24px' } }}>
          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabKey)} items={tabItems} />
          {renderList()}
        </Card>
      </PageContainer>
    </div>
  )
}
