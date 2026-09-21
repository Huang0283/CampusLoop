import { Alert, Avatar, Button, Card, Input, Modal, Space, Spin, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppSidebar, EmptyState, ErrorState, Loading, PageContainer } from '../../components'
import { OfferCard, ReportModal } from '../../components/transaction'
import { mockSessions } from '../../mocks/transaction'
import { OFFER_EXPIRE_HOURS } from '../../constants/offer'
import { useMockDbStore } from '../../stores/mockDb'
import { IS_REALTIME_MOCK, currentUserId, useRealtimeStore } from '../../stores/realtime'
import type { Message, ReportTargetType } from '../../types/transaction'

const { Text } = Typography

/** 稳定的空数组引用：避免 selector 每次返回新数组导致无限重渲染 */
const NO_MESSAGES: Message[] = []

function timeDivider(prev?: Message, curr?: Message): boolean {
  if (!prev || !curr) return true
  return new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function ChatDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sessionId = Number(id)

  const session = mockSessions.find((s) => s.id === sessionId)

  /* --- 报价与商品状态来自可变 mockDb：接受/还价/撤回会真实改变卡片状态 --- */
  const offers = useMockDbStore((s) => s.offers)
  const contextProduct = useMockDbStore((s) =>
    session?.product ? s.products[session.product.id] : undefined
  )

  /* --- 实时链路状态（全部来自 stores/realtime.ts） --- */
  const status = useRealtimeStore((s) => s.status)
  const disconnectReason = useRealtimeStore((s) => s.disconnectReason)
  const nextRetryInMs = useRealtimeStore((s) => s.nextRetryInMs)
  const reconnectAttempt = useRealtimeStore((s) => s.reconnectAttempt)
  const pendingOutbox = useRealtimeStore((s) => s.pendingOutbox)

  /* --- 会话数据 --- */
  const messages = useRealtimeStore((s) => s.messagesBySession[sessionId] ?? NO_MESSAGES)
  const loading = useRealtimeStore((s) => s.loadingSessions[sessionId] ?? false)
  const error = useRealtimeStore((s) => s.sessionErrors[sessionId] ?? null)
  const lastSyncedAt = useRealtimeStore((s) => s.lastSyncedAt[sessionId])

  const [draft, setDraft] = useState('')
  const [counterOfferOpen, setCounterOfferOpen] = useState(false)
  const [counterAmount, setCounterAmount] = useState<number>()
  const [counterTargetId, setCounterTargetId] = useState<number>()
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState<number>()
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType
    id: number
    label: string
  } | null>(null)

  // actions 通过 getState 取用：不需要订阅，避免多余渲染
  useEffect(() => {
    if (!session) return
    const store = useRealtimeStore.getState()
    store.bootstrap()
    void store.openSession(sessionId)
    return () => {
      useRealtimeStore.getState().leaveSession(sessionId)
    }
  }, [session, sessionId])

  const banner = useMemo(() => {
    switch (status) {
      case 'connecting':
        return { type: 'warning' as const, text: '正在连接服务器…' }
      case 'reconnecting':
        return {
          type: 'warning' as const,
          text: `网络不稳定，正在重连…（第 ${reconnectAttempt} 次${nextRetryInMs ? `，约 ${Math.round(nextRetryInMs / 1000)} 秒后重试` : ''}）恢复后将自动补拉历史消息`,
        }
      case 'disconnected':
        if (disconnectReason === 'unauthorized') {
          return { type: 'error' as const, text: '登录状态已失效，请重新登录（不会自动重连）' }
        }
        if (disconnectReason === 'exhausted') {
          return { type: 'error' as const, text: '多次重连失败，请检查网络后刷新页面' }
        }
        return { type: 'error' as const, text: '连接已断开，新消息将以补拉方式同步' }
      default:
        return null
    }
  }, [status, disconnectReason, nextRetryInMs, reconnectAttempt])

  if (!session) return <EmptyState description="会话不存在或已被删除" />

  const handleSend = () => {
    if (!draft.trim()) return
    useRealtimeStore.getState().sendText(sessionId, draft)
    setDraft('')
  }

  const demoPeerMessage = () => {
    useRealtimeStore
      .getState()
      .receivePeerMessage(sessionId, session.peer.id, '好的，那就按这个价格，明天下午图书馆见？')
    message.success('已注入一条对方消息（走完整的去重与分发链路）')
  }

  const demoOfflineMessage = () => {
    useRealtimeStore
      .getState()
      .queueServerOnlyMessage(sessionId, session.peer.id, '（这条消息在服务端生成，未推送给你）')
    message.info('消息已写入服务端但不会推送。点「模拟断线」再等重连，可验证补拉把它取回来')
  }

  const me = currentUserId()

  const renderMessage = (m: Message) => {
    // 用本地已知的用户 id 判断是否为「我发的」；真实模式由登录态提供
    const mine = m.senderId === me

    if (m.kind === 'SYSTEM' || m.kind === 'ORDER_EVENT') {
      return (
        <div key={m.clientMsgId} style={{ textAlign: 'center', margin: '8px 0' }}>
          <Tag>{m.orderEvent?.description ?? m.content}</Tag>
        </div>
      )
    }

    return (
      <div key={m.clientMsgId}>
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>{fmtTime(m.createdAt)}</Text>
        </div>
        {/* 改动①：给消息行加 gap 和顶部对齐，为头像留位置 */}
        <div
          style={{
            display: 'flex',
            justifyContent: mine ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          {/* 改动②：对方消息，头像放左侧 */}
          {!mine && (
            <Avatar
              size={36}
              src={`https://picsum.photos/seed/user-${m.senderId}/100/100`}
              style={{ flexShrink: 0 }}
            />
          )}

          <div style={{ maxWidth: '70%' }}>
            {m.kind === 'OFFER' && m.offer ? (
              (() => {
                // 以 mockDb 中的最新状态渲染：接受/还价/撤回后卡片状态立即变化
                const offer = offers.find((o) => o.id === m.offer!.id) ?? m.offer
                return (
                  <OfferCard
                    offer={offer}
                    onAccept={(ov) => {
                      useMockDbStore.getState().acceptOffer(ov.id)
                      message.success('已接受报价：订单已创建并锁定商品，请确认见面约定')
                    }}
                    onReject={(ov) => useMockDbStore.getState().rejectOffer(ov.id)}
                    onCounter={(ov) => {
                      setCounterTargetId(ov.id)
                      setCounterOfferOpen(true)
                    }}
                    onCancel={(ov) => useMockDbStore.getState().withdrawOffer(ov.id)}
                  />
                )
              })()
            ) : (
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    background: mine ? '#e6f4ff' : '#f5f5f5',
                    borderRadius: 8,
                    padding: '8px 12px',
                    opacity: m.sendStatus === 'SENDING' ? 0.6 : 1,
                  }}
                >
                  {m.content}
                </div>
                {m.sendStatus === 'SENDING' && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <Spin size="small" /> 发送中…
                  </Text>
                )}
                {m.sendStatus === 'FAILED' && (
                  <Button
                    type="link"
                    size="small"
                    danger
                    style={{ padding: 0 }}
                    onClick={() => useRealtimeStore.getState().retryMessage(sessionId, m.clientMsgId)}
                  >
                    发送失败，点击重试
                  </Button>
                )}
              </div>
            )}
            {!mine && (
              <Button
                type="link"
                size="small"
                danger
                style={{ padding: 0, marginTop: 2 }}
                onClick={() =>
                  setReportTarget({
                    type: 'CHAT_MESSAGE',
                    id: m.id,
                    label: `与 ${session.peer.nickname} 的消息`,
                  })
                }
              >
                举报该消息
              </Button>
            )}
          </div>

          {/* 改动③：我方消息，头像放右侧 */}
          {mine && (
            <Avatar
              size={36}
              src={`https://picsum.photos/seed/me/100/100`}
              style={{ flexShrink: 0 }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6f8', marginLeft: 220 }}>
      {/* 左侧导航：与 /market 完全一致 */}
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
      title={session.peer.nickname}
      extra={
        <Space wrap>
          <Button size="small" onClick={() => useRealtimeStore.getState().dropConnection()}>
            模拟断线
          </Button>
          <Button size="small" onClick={demoPeerMessage}>
            模拟对方发消息
          </Button>
          <Button size="small" onClick={demoOfflineMessage}>
            模拟掉线期间来消息
          </Button>
          <Button size="small" onClick={() => navigate('/chat')}>返回列表</Button>
        </Space>
      }
    >
      {banner && (
        <Alert type={banner.type} showIcon message={banner.text} style={{ marginBottom: 12 }} />
      )}

      {pendingOutbox > 0 && (
        <Alert
          type="info"
          showIcon
          message={`有 ${pendingOutbox} 条消息在待发队列中，连接恢复后会自动补发（同一 clientMsgId，不会重复）`}
          style={{ marginBottom: 12 }}
        />
      )}

      {IS_REALTIME_MOCK && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="当前为原型模式：未配置 VITE_WS_URL，链路与消息源由 mock 提供，状态机为真实实现"
        />
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* 上下文卡片：商品 / 求购 */}
        <Card size="small" style={{ width: 260, flexShrink: 0 }} title="交易上下文">
          {session.product && (
            <>
              <Tag color="blue">商品</Tag>
              <Link to={`/product/${session.product.id}`}>
                <Text strong>{session.product.title}</Text>
              </Link>
              <div>
                <Text strong style={{ color: '#c41d7f' }}>¥{session.product.price}</Text>
                <Tag style={{ marginLeft: 8 }}>
                  {(contextProduct ?? session.product).status === 'RESERVED'
                    ? '已预约'
                    : (contextProduct ?? session.product).status === 'SOLD'
                      ? '已售出'
                      : '在售'}
                </Tag>
              </div>
            </>
          )}
          {session.wanted && (
            <>
              <Tag color="purple">求购</Tag>
              <Text strong>{session.wanted.title}</Text>
              <div>
                <Text type="secondary">
                  预算 ¥{session.wanted.budgetMin} - ¥{session.wanted.budgetMax}
                </Text>
              </div>
            </>
          )}
          <div style={{ marginTop: 8 }}>
            <Space wrap>
              <Button
                size="small"
                disabled={!session.product}
                onClick={() => session.product && setOfferOpen(true)}
              >
                发起报价
              </Button>
              <Button
                size="small"
                type="text"
                danger
                onClick={() =>
                  setReportTarget({
                    type: 'USER',
                    id: session.peer.id,
                    label: session.peer.nickname,
                  })
                }
              >
                举报对方
              </Button>
            </Space>
          </div>
          {lastSyncedAt && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                最近同步：{fmtTime(new Date(lastSyncedAt).toISOString())}
              </Text>
            </div>
          )}
        </Card>

        {/* 消息流 */}
        <Card
          size="small"
          style={{ flex: 1, minHeight: 480, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1 } }}
        >
          <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
            {loading ? (
              <Loading tip="正在加载历史消息…" />
            ) : error ? (
              <ErrorState
                message={error}
                onRetry={() => void useRealtimeStore.getState().openSession(sessionId)}
              />
            ) : messages.length === 0 ? (
              <EmptyState description="还没有消息，打个招呼吧" />
            ) : (
              messages.map((m, i) => (
                <div key={m.clientMsgId}>
                  {timeDivider(messages[i - 1], m) && (
                    <div style={{ textAlign: 'center', margin: '12px 0 4px' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        —— {fmtTime(m.createdAt)} ——
                      </Text>
                    </div>
                  )}
                  {renderMessage(m)}
                </div>
              ))
            )}
          </div>

          {/* 输入区 */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="输入消息…（Enter 发送）"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPressEnter={handleSend}
              />
              <Button type="primary" onClick={handleSend}>
                发送
              </Button>
            </Space.Compact>
            {status !== 'connected' && (
              <Text type="warning" style={{ fontSize: 11 }}>
                当前离线：消息会进入待发队列，连接恢复后自动补发
              </Text>
            )}
          </div>
        </Card>
      </div>

      <Modal
        title="还价"
        open={counterOfferOpen}
        onCancel={() => setCounterOfferOpen(false)}
        onOk={() => {
          if (counterTargetId) {
            useMockDbStore.getState().counterOffer(counterTargetId, counterAmount ?? 0)
            message.success(`已还价 ¥${counterAmount ?? 0}：原报价被替代，新报价进入 24 小时有效期`)
          }
          setCounterOfferOpen(false)
        }}
        okText="提交还价"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">提交后原报价将被替代（还价链），双方可继续协商</Text>
          <Input
            type="number"
            prefix="¥"
            placeholder="输入你的还价金额"
            value={counterAmount}
            onChange={(e) => setCounterAmount(Number(e.target.value))}
          />
          {status !== 'connected' && (
            <Text type="warning">
              <Spin size="small" /> 议价走 HTTP，不受实时链路影响；但界面状态会短暂滞后
            </Text>
          )}
        </Space>
      </Modal>

      <Modal
        title={`发起报价 · ${session.product ? session.product.title : ''}`}
        open={offerOpen}
        onCancel={() => setOfferOpen(false)}
        onOk={() => {
          if (session.product && offerAmount) {
            useMockDbStore
              .getState()
              .createOffer(sessionId, session.peer.id, contextProduct ?? session.product, offerAmount)
            message.success(`已报价 ¥${offerAmount}：有效期 ${OFFER_EXPIRE_HOURS} 小时，对方接受后自动创建订单`)
          }
          setOfferOpen(false)
        }}
        okText="提交报价"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            卖家标价 ¥{session.product ? session.product.price : 0}；报价后商品锁定，接受时创建订单
          </Text>
          <Input
            type="number"
            prefix="¥"
            placeholder="输入你的报价金额"
            value={offerAmount}
            onChange={(e) => setOfferAmount(Number(e.target.value))}
          />
        </Space>
      </Modal>
      <ReportModal
        open={reportTarget !== null}
        targetType={reportTarget?.type ?? 'USER'}
        targetId={reportTarget?.id ?? session.peer.id}
        targetLabel={reportTarget?.label}
        onClose={() => setReportTarget(null)}
        onSubmit={(values) => {
          if (!reportTarget) return
          useMockDbStore.getState().submitReport({
            targetType: reportTarget.type,
            targetId: reportTarget.id,
            ...values,
          })
        }}
      />
      </PageContainer>
    </div>
  )
}