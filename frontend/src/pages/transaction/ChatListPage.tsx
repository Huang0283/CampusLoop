import { Avatar, Badge, Card, List, Skeleton, Tabs, Tag, Typography } from 'antd'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, PageContainer } from '../../components'
import { mockSessions } from '../../mocks/transaction'
import type { ChatSession } from '../../types/transaction'

const { Text } = Typography

type ListState = 'loading' | 'success' | 'error'

/** 状态切换仅用于原型演示五态覆盖，接入接口后由请求状态驱动 */
const STATE_CYCLE: ListState[] = ['success', 'loading', 'error', 'success']

function fmtTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function SessionItem({ session }: { session: ChatSession }) {
  const navigate = useNavigate()
  const context = session.product
    ? { title: session.product.title, tag: <Tag color="blue">商品</Tag> }
    : { title: session.wanted?.title ?? '', tag: <Tag color="purple">求购</Tag> }

  return (
    <List.Item
      style={{ cursor: 'pointer', padding: '12px 16px' }}
      onClick={() => navigate(`/chat/${session.id}`)}
    >
      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        <Badge count={session.unreadCount} size="small">
          <Avatar size={44}>{session.peer.nickname.slice(0, 1)}</Avatar>
        </Badge>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Space_>
              <Text strong>{session.peer.nickname}</Text>
              {context.tag}
            </Space_>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {fmtTime(session.lastMessage?.createdAt)}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <Text type="secondary" ellipsis style={{ maxWidth: '70%' }}>
              {session.lastMessage?.kind === 'OFFER'
                ? `[报价] ¥${session.lastMessage.offer?.amount}`
                : session.lastMessage?.content}
            </Text>
            <Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: '30%' }}>
              {context.title}
            </Text>
          </div>
        </div>
      </div>
    </List.Item>
  )
}

/** 小工具：横向排列（避免引入额外 Space 命名冲突） */
function Space_({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{children}</div>
}

export default function ChatListPage() {
  const [state, setState] = useState<ListState>('success')
  // 演示：点击 tab 切换模拟加载/失败状态
  const [demoIdx, setDemoIdx] = useState(0)

  const renderList = (sessions: ChatSession[]) => {
    if (state === 'loading') return <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 16 }} />
    if (state === 'error')
      return <ErrorState message="会话列表加载失败" onRetry={() => setState('success')} />
    if (sessions.length === 0) return <EmptyState description="暂无会话，去市场挑一件心仪的商品吧" />
    return (
      <List
        dataSource={sessions}
        renderItem={(s) => <SessionItem session={s} />}
        split
      />
    )
  }

  return (
    <PageContainer
      title="消息"
      extra={
        <a
          onClick={() => {
            const next = (demoIdx + 1) % STATE_CYCLE.length
            setDemoIdx(next)
            setState(STATE_CYCLE[next])
          }}
        >
          [原型演示：切换 加载/失败 状态]
        </a>
      }
    >
      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="all"
          items={[
            { key: 'all', label: '全部', children: renderList(mockSessions) },
            {
              key: 'unread',
              label: '未读',
              children: renderList(mockSessions.filter((s) => s.unreadCount > 0)),
            },
          ]}
        />
      </Card>
    </PageContainer>
  )
}
