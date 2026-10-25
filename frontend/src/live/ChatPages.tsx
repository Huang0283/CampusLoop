import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Badge, Button, Empty, Input, InputNumber, Popover, Space, Tag, Tooltip, Typography } from 'antd'
import { ArrowLeftOutlined, DollarOutlined, EllipsisOutlined, PaperClipOutlined, ReloadOutlined, SearchOutlined, SmileOutlined } from '@ant-design/icons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../sdk'
import type { ChatSession, Offer } from '../sdk'
import { Failure, Resource, useMutation, useRemote } from './common'
import { ProductSummary } from './Presentation'
import { displayDate } from './display'
import { ImageQueue } from './ImageQueue'
import { ReportButton } from './ReportButton'
import { useSession } from './session'
import { useChat } from './useChat'
import { PrivateImage } from './PrivateImage'
import { useAttemptKey } from './idempotency'

const offerLabels = { PENDING: '等待回应', ACCEPTED: '已接受', REJECTED: '已拒绝', COUNTERED: '已有还价', EXPIRED: '已过期', CANCELLED: '已撤回' }
const preview = (session: ChatSession) => session.lastMessage?.kind === 'IMAGE' ? '[图片]' : session.lastMessage?.content || '还没有消息'
function chatTime(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (date.toDateString() === today.toDateString()) return `今天 ${time}`
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  return displayDate(value)
}

function SessionPane({ sessions, selected }: { sessions: ReturnType<typeof useRemote<ChatSession[]>>; selected?: number }) {
  const [query, setQuery] = useState('')
  const visible = sessions.value?.filter((item) => `${item.peer.nickname} ${item.product?.title || item.wanted?.title || ''} ${preview(item)}`.toLowerCase().includes(query.toLowerCase())) || []
  return <section className="chat-session-pane" aria-label="聊天会话">
    <div className="chat-session-header"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h1>聊天</h1><Button aria-label="刷新会话" type="text" icon={<ReloadOutlined />} onClick={sessions.reload} /></div><Input aria-label="搜索会话" prefix={<SearchOutlined />} placeholder="搜索联系人或会话" value={query} onChange={(event) => setQuery(event.target.value)} allowClear /></div>
    <div className="chat-session-list"><Resource {...sessions}>{visible.length ? visible.map((session) => <Link key={session.id} to={`/chat/${session.id}`} aria-label={`${session.peer.nickname} · ${session.product?.title || session.wanted?.title || '聊天'}`} aria-current={selected === session.id ? 'page' : undefined} className={`chat-session ${selected === session.id ? 'is-active' : ''}`}>
      <Avatar size={60} src={session.peer.avatar}>{session.peer.nickname.slice(0, 1)}</Avatar><div className="chat-session-copy"><strong>{session.peer.nickname}</strong><p>{preview(session)}</p></div><div className="chat-session-meta"><span>{session.lastMessage ? chatTime(session.lastMessage.createdAt).replace('今天 ', '') : ''}</span><Badge count={session.unreadCount} /></div>
    </Link>) : <Empty description={query ? '没有符合条件的会话' : '还没有会话，从商品页联系卖家开始吧'} />}</Resource></div>
  </section>
}

function Quote({ offer, refresh }: { offer: Offer; refresh: () => void }) {
  const attemptKey = useAttemptKey()
  const navigate = useNavigate()
  const user = useSession((state) => state.user)!
  const mutation = useMutation()
  const [amount, setAmount] = useState<number | null>(offer.amount)
  const [countering, setCountering] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const pending = offer.status === 'PENDING' && new Date(offer.expireAt).getTime() > now
  return <section className="chat-offer" aria-label={`报价 ¥${offer.amount.toFixed(2)}`}>
    <div className="chat-offer-heading"><span className="chat-offer-icon"><DollarOutlined /></span><strong>报价金额 ¥{offer.amount.toFixed(2)}</strong><span className="chat-offer-status">{offer.status === 'PENDING' && !pending ? '已过期' : offerLabels[offer.status]}</span></div>
    <Failure error={mutation.error} retry={refresh} /><div className="chat-offer-actions"><Space wrap>
      {offer.orderId && <Link to={`/transactions/${offer.orderId}`}>查看订单</Link>}
      {pending && (offer.proposerId === user.id ? <Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.cancelOffer({ path: { offerId: offer.id } }); refresh() })}>撤回报价</Button> : <>
        <Button type="primary" loading={mutation.busy} onClick={() => void mutation.run(async () => { const saved = await api.data(api.acceptOffer({ path: { offerId: offer.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) })); refresh(); navigate(`/transactions/${saved.order.id}`) })}>接受报价</Button>
        <Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.rejectOffer({ path: { offerId: offer.id } }); refresh() })}>拒绝报价</Button>
        <Button type="text" onClick={() => setCountering(!countering)}>还价</Button>
        {countering && <><InputNumber aria-label="还价金额" min={0.01} precision={2} value={amount} onChange={setAmount} /><Button disabled={!amount} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.counterOffer({ path: { offerId: offer.id }, body: { amount: amount! }, headers: api.idempotencyHeaders(attemptKey({ offerId: offer.id, amount })) }); setCountering(false); refresh() })}>提交还价</Button></>}
      </>)}
    </Space></div>
  </section>
}

function Conversation({ session }: { session: ChatSession }) {
  const user = useSession((state) => state.user)!
  const offers = useRemote(`offers-${session.id}`, (signal) => api.data(api.listSessionOffers({ path: { sessionId: session.id }, signal })), 5000)
  const chat = useChat(session.id)
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const [attachments, setAttachments] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const streamRef = useRef<HTMLDivElement>(null)
  const followBottom = useRef(true)
  useEffect(() => {
    const stream = streamRef.current
    if (stream && followBottom.current) stream.scrollTop = stream.scrollHeight
  }, [chat.messages, chat.pending, offers.value])
  const timeline = [
    ...chat.messages.map((message) => ({ key: `message-${message.id}`, time: message.createdAt, message, offer: undefined as Offer | undefined })),
    ...(offers.value || []).map((offer) => ({ key: `offer-${offer.id}`, time: offer.createdAt, message: undefined, offer })),
  ].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
  const send = () => {
    if (!text.trim()) return
    const content = text; setText(''); followBottom.current = true
    void chat.send({ clientMsgId: crypto.randomUUID(), kind: 'TEXT', content })
  }
  return <section className="chat-conversation" aria-label="当前聊天">
    <div className="chat-conversation-header"><Space><Link className="chat-back" to="/chat" aria-label="返回聊天列表"><ArrowLeftOutlined /></Link><h1>{session.peer.nickname}</h1></Space><Space>{chat.connection === 'connected' && <span className="chat-online" role="status">实时连接已建立</span>}<Popover trigger="click" placement="bottomRight" content={<ReportButton targetType="USER" targetId={session.peer.id} label="举报对方" />}><Button type="text" aria-label="会话操作" icon={<EllipsisOutlined />} /></Popover></Space></div>
    <div className="chat-context">{session.product ? <ProductSummary product={session.product} /> : <><Link to={`/wanted/${session.wanted?.id}`}>{session.wanted?.title}</Link><p className="muted">求购会话用于沟通；交易请从具体商品发起。</p></>}</div>
    <div className="chat-connection">{chat.connection !== 'connected' && <Alert type="warning" title="实时连接恢复中，可通过 HTTP 发送与补拉消息。" />}<Failure error={chat.error} /><Failure error={offers.error} retry={offers.reload} /></div>
    <div className="chat-message-stream" ref={streamRef} onScroll={() => { const stream = streamRef.current; if (stream) followBottom.current = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 100 }} aria-label="聊天消息">
      {(chat.loading || (chat.hasOlder && chat.messages.length >= 100)) && <div style={{ textAlign: 'center' }}><Button type="text" loading={chat.loading} disabled={!chat.hasOlder || !chat.messages.length} onClick={() => { followBottom.current = false; void chat.older() }}>加载更早消息</Button></div>}
      {!chat.loading && !timeline.length && <Empty description="还没有消息，打个招呼吧" />}
      {timeline.map((entry) => {
        const mine = entry.offer ? entry.offer.proposerId === user.id : entry.message?.senderId === user.id
        const author = mine ? user : session.peer
        return <div key={entry.key}><div className="chat-time">{chatTime(entry.time)}</div><div className={`message-row ${mine ? 'is-mine' : ''}`}><Avatar size={44} src={author.avatar}>{author.nickname.slice(0, 1)}</Avatar><div className="message-body">
          {entry.offer ? <Quote offer={entry.offer} refresh={offers.reload} /> : entry.message && <><div className="message-bubble">{entry.message.kind === 'IMAGE' ? <PrivateImage messageId={entry.message.id} /> : entry.message.content || (entry.message.kind === 'OFFER' ? '报价动态' : '系统消息')}</div>{!mine && <div className="message-report"><Popover trigger={['hover', 'click']} content={<ReportButton targetType="CHAT_MESSAGE" targetId={entry.message.id} />}><Button type="text" aria-label="消息操作" icon={<EllipsisOutlined />} /></Popover></div>}</>}
        </div></div></div>
      })}
      {chat.pending.map((item) => <div className="message-row is-mine" key={item.clientMsgId}><Avatar src={user.avatar}>{user.nickname.slice(0, 1)}</Avatar><div className="message-body"><div className="message-bubble">{item.kind === 'IMAGE' ? '[图片]' : item.content}</div><Tag color={item.failed ? 'error' : 'processing'}>{item.failed ? '发送失败' : '发送中'}</Tag>{item.failed && <><Failure error={item.error} /><Button onClick={() => void chat.send({ clientMsgId: item.clientMsgId, kind: item.kind, content: item.content })}>重试发送</Button></>}</div></div>)}
    </div>
    <div className="chat-composer"><Input.TextArea aria-label="消息内容" placeholder="输入消息…" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} autoSize={{ minRows: 2, maxRows: 4 }} />
      <div className="composer-actions"><Space size={8}><Tooltip title="发送图片"><Button type="text" aria-label="图片" icon={<PaperClipOutlined />} aria-expanded={attachments} onClick={() => setAttachments(!attachments)} /></Tooltip><Popover trigger="click" open={emojiOpen} onOpenChange={setEmojiOpen} content={<div className="chat-emoji-picker">{['😊', '😄', '👍', '🤝', '❤️', '🎉'].map((emoji) => <Button key={emoji} type="text" aria-label={`插入 ${emoji}`} disabled={text.length + emoji.length > 4000} onClick={() => { setText((value) => value + emoji); setEmojiOpen(false) }}>{emoji}</Button>)}</div>}><Button type="text" aria-label="插入表情" icon={<SmileOutlined />} /></Popover>{session.product && <Tooltip title="发起报价"><Button type="text" aria-label="报价" icon={<DollarOutlined />} aria-expanded={quoting} onClick={() => setQuoting(!quoting)} /></Tooltip>}</Space><Button type="primary" aria-label="发送消息" disabled={!text.trim()} onClick={send}>发送</Button></div>
      {attachments && <div className="composer-extra"><ImageQueue purpose="chat" value={images} onChange={setImages} onBusyChange={setUploadBlocked} /><Button disabled={!images.length || uploadBlocked} onClick={() => { for (const content of images) void chat.send({ clientMsgId: crypto.randomUUID(), kind: 'IMAGE', content }); setImages([]) }}>发送已上传图片</Button></div>}
      {quoting && session.product && <div className="composer-extra"><Failure error={mutation.error} /><Space wrap><InputNumber aria-label="报价金额" min={0.01} max={99999999.99} precision={2} value={amount} onChange={setAmount} placeholder="报价金额" /><Button disabled={!amount || session.product.status !== 'ON_SALE'} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.createOffer({ path: { sessionId: session.id }, body: { amount: amount! }, headers: api.idempotencyHeaders(attemptKey({ sessionId: session.id, amount })) }); setAmount(null); offers.reload() })}>提交报价</Button></Space><Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>接受报价后生成订单，商品锁定为已预订。</Typography.Paragraph></div>}
    </div>
  </section>
}

function ChatWorkspace({ id }: { id?: number }) {
  const user = useSession((state) => state.user)!
  const sessions = useRemote(`sessions-${user.id}`, (signal) => api.data(api.listChatSessions({ signal })), 5000, true)
  const selected = sessions.value?.find((session) => session.id === id)
  return <div className={`chat-workspace ${id ? 'has-session' : ''}`}><SessionPane sessions={sessions} selected={id} />{selected ? <Conversation key={`${user.id}-${id}`} session={selected} /> : <section className="chat-conversation" aria-label="当前聊天"><div className="chat-empty"><Resource {...sessions}>{id ? <Alert type="warning" title="会话不存在或无权访问。" action={<Link to="/chat">返回聊天列表</Link>} /> : <Empty description="选择左侧会话，开始聊天" />}</Resource></div></section>}</div>
}

export function ChatListPage() { return <ChatWorkspace /> }
export function ChatPage() { const { id } = useParams(); return <ChatWorkspace id={Number(id)} /> }
