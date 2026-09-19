import { Badge, Button, Card, List, Skeleton, Tabs, Tag, Typography, message } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, PageContainer } from '../../components'
import { NOTIFICATION_TABS, NOTIFICATION_TYPE_LABEL } from '../../constants/notification'
import { useMockDbStore } from '../../stores/mockDb'
import type { AppNotification, NotificationType } from '../../types/transaction'

const { Text } = Typography

const TYPE_COLOR: Record<NotificationType, string> = {
  MESSAGE: 'blue',
  OFFER_RECEIVED: 'purple',
  OFFER_ACCEPTED: 'green',
  OFFER_REJECTED: 'default',
  MATCH_FOUND: 'geekblue',
  ORDER_STATUS_CHANGED: 'orange',
  MEETUP_REMINDER: 'cyan',
  REVIEW_REQUEST: 'gold',
  REPORT_RESULT: 'red',
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

function NotificationItem({ n, onRead }: { n: AppNotification; onRead: (id: number) => void }) {
  const navigate = useNavigate()
  return (
    <List.Item
      style={{
        cursor: 'pointer',
        background: n.read ? 'transparent' : '#f0f7ff',
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 4,
      }}
      onClick={() => {
        onRead(n.id)
        if (n.link) navigate(n.link)
      }}
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!n.read && <Badge status="processing" />}
            <Text strong={!n.read}>{n.title}</Text>
            <Tag color={TYPE_COLOR[n.type]}>{NOTIFICATION_TYPE_LABEL[n.type]}</Tag>
          </span>
          <Text type="secondary" style={{ fontSize: 12 }}>{fmtTime(n.createdAt)}</Text>
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>{n.content}</Text>
      </div>
    </List.Item>
  )
}

export default function NotificationPage() {
  /** 通知来自可变 mockDb：订单/报价动作产生的通知会实时出现在这里 */
  const items = useMockDbStore((s) => s.notifications)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('success')
  const [tab, setTab] = useState('all')

  const markRead = (id: number) => useMockDbStore.getState().markNotificationRead(id)

  const markAllRead = () => {
    useMockDbStore.getState().markAllNotificationsRead()
    message.success('已全部标记为已读')
  }

  const activeTab = NOTIFICATION_TABS.find((t) => t.key === tab)!
  const filtered = items.filter(
    (n) => !activeTab.types || (activeTab.types as string[]).includes(n.type)
  )
  const unread = items.filter((n) => !n.read).length

  const renderList = () => {
    if (state === 'loading')
      return <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 16 }} />
    if (state === 'error')
      return <ErrorState message="通知加载失败" onRetry={() => setState('success')} />
    if (filtered.length === 0) return <EmptyState description="暂无通知" />
    return <List dataSource={filtered} renderItem={(n) => <NotificationItem n={n} onRead={markRead} />} />
  }

  return (
    <PageContainer
      title={`通知中心${unread > 0 ? `（${unread} 条未读）` : ''}`}
      extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button size="small" onClick={markAllRead}>全部已读</Button>
          <Button size="small" onClick={() => setState((s) => (s === 'success' ? 'error' : 'success'))}>
            [演示失败态]
          </Button>
        </div>
      }
    >
      <Card styles={{ body: { padding: '0 24px 24px' } }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={NOTIFICATION_TABS.map((t) => ({
            key: t.key,
            label: t.label,
            children: renderList(),
          }))}
        />
      </Card>
    </PageContainer>
  )
}
