import { localize, OriginalText } from '../i18n/Localize'
import { useLanguage, t, dateLocale } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Badge, Button, Empty, Input, InputNumber, Popover, Select, Space, Tag, Tooltip, Typography } from 'antd'
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
const contextTitle = (session?: ChatSession) => session?.product?.title || session?.wanted?.title || '历史商品'
function chatTime(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const time = date.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit', hour12: false })
  if (date.toDateString() === today.toDateString()) return `今天 ${time}`
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  return displayDate(value)
}

function SessionPane({ sessions, selected }: { sessions: ReturnType<typeof useRemote<ChatSession[]>>; selected?: number }) {
  useLanguage()
  const [query, setQuery] = useState('')
  const contacts = new Map<number, ChatSession[]>()
  for (const session of sessions.value || []) {
    const group = contacts.get(session.peer.id) || []
    group.push(session); contacts.set(session.peer.id, group)
  }
  const visible = [...contacts.values()].filter((group) => group.some((item) => `${item.peer.nickname} ${contextTitle(item)} ${preview(item)}`.toLowerCase().includes(query.trim().toLowerCase())))
  return localize(<section className="chat-session-pane" aria-label="聊天会话">
    <div className="chat-session-header"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h1>聊天</h1><Button aria-label="刷新会话" type="text" icon={<ReloadOutlined />} onClick={sessions.reload} /></div><Input aria-label="搜索会话" prefix={<SearchOutlined />} placeholder="搜索联系人或会话" value={query} onChange={(event) => setQuery(event.target.value)} allowClear /></div>
    <div className="chat-session-list"><Resource {...sessions}>{visible.length ? visible.map((group) => {
      const latest = [...group].sort((a, b) => Date.parse(b.lastMessage?.createdAt || '1970-01-01') - Date.parse(a.lastMessage?.createdAt || '1970-01-01') || b.id - a.id)[0]
      const session = group.find((item) => item.id === selected) || latest
      const active = group.some((item) => item.id === selected)
      return localize(<Link key={session.peer.id} to={`/chat/${session.id}`} aria-label={`${session.peer.nickname} · ${group.map(contextTitle).join('、')}`} aria-current={active ? 'page' : undefined} className={`chat-session ${active ? 'is-active' : ''}`}>
        <Avatar size={60} src={session.peer.avatar}>{<OriginalText>{session.peer.nickname.slice(0, 1)}</OriginalText>}</Avatar><div className="chat-session-copy"><strong>{<OriginalText>{session.peer.nickname}</OriginalText>}</strong><p>{group.length > 1 && <CatalogText text={`[${contextTitle(latest)}] `} />}<CatalogText text={preview(latest)} /></p></div><div className="chat-session-meta"><span>{latest.lastMessage ? chatTime(latest.lastMessage.createdAt).replace('今天 ', '') : ''}</span><Badge count={group.reduce((total, item) => total + item.unreadCount, 0)} /></div>
      </Link>)
    }) : <Empty description={query ? '没有符合条件的会话' : '还没有会话，从商品页联系卖家开始吧'} />}</Resource></div>
  </section>)
}

function Quote({ offer, refresh }: { offer: Offer; refresh: () => void }) {
  useLanguage()
  const attemptKey = useAttemptKey()
  const navigate = useNavigate()
  const user = useSession((state) => state.user)!
  const mutation = useMutation()
  const [amount, setAmount] = useState<number | null>(offer.amount)
  const [countering, setCountering] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const pending = offer.status === 'PENDING' && new Date(offer.expireAt).getTime() > now
  return localize(<section className="chat-offer" aria-label={`报价 ¥${offer.amount.toFixed(2)}`}>
    <div className="chat-offer-heading"><span className="chat-offer-icon"><DollarOutlined /></span><strong>报价金额 ¥{offer.amount.toFixed(2)}</strong><span className="chat-offer-status">{offer.status === 'PENDING' && !pending ? '已过期' : offerLabels[offer.status]}</span></div>
    <Failure error={mutation.error} retry={refresh} /><div className="chat-offer-actions"><Space wrap>
      {offer.orderId && <Link to={`/transactions/${offer.orderId}`}>查看订单</Link>}
      {pending && (offer.proposerId === user.id ? <Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.cancelOffer({ path: { offerId: offer.id } }); refresh() })}>撤回报价</Button> : <>
        <Button type="primary" loading={mutation.busy} onClick={() => void mutation.run(async () => { const saved = await api.data(api.acceptOffer({ path: { offerId: offer.id }, headers: api.idempotencyHeaders(attemptKey({ offerId: offer.id, action: 'accept' })) })); refresh(); navigate(`/transactions/${saved.order.id}`) })}>接受报价</Button>
        <Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.rejectOffer({ path: { offerId: offer.id } }); refresh() })}>拒绝报价</Button>
        <Button type="text" onClick={() => setCountering(!countering)}>还价</Button>
        {countering && <><InputNumber aria-label="还价金额" min={0.01} precision={2} value={amount} onChange={setAmount} /><Button disabled={!amount} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.counterOffer({ path: { offerId: offer.id }, body: { amount: amount! }, headers: api.idempotencyHeaders(attemptKey({ offerId: offer.id, amount })) }); setCountering(false); refresh() })}>提交还价</Button></>}
      </>)}
    </Space></div>
  </section>)
}

function Conversation({ session, sessions }: { session: ChatSession; sessions: ChatSession[] }) {
  useLanguage()
  const user = useSession((state) => state.user)!
  const navigate = useNavigate()
  const sessionKey = sessions.map((item) => item.id).sort((a, b) => a - b).join(',')
  const offers = useRemote(`offers-${sessionKey}`, async (signal) => {
    const batches = await Promise.all(sessions.map((item) => api.data(api.listSessionOffers({ path: { sessionId: item.id }, signal }))))
    return batches.flat()
  }, 5000, true)
  const chat = useChat(sessions.map((item) => item.id))
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const [attachments, setAttachments] = useState(false)
  const [quoteSessionId, setQuoteSessionId] = useState<number>()
  const quoting = quoteSessionId === session.id
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const streamRef = useRef<HTMLDivElement>(null)
  const followBottom = useRef(true)
  const locateSession = useRef<number | undefined>(undefined)
  useEffect(() => {
    const stream = streamRef.current
    if (stream && followBottom.current) stream.scrollTop = stream.scrollHeight
  }, [chat.messages, chat.pending, offers.value])
  useEffect(() => {
    const stream = streamRef.current
    if (!stream || locateSession.current !== session.id || chat.loading || offers.loading) return
    const entries = stream.querySelectorAll<HTMLElement>(`[data-session-id="${session.id}"]`)
    const latest = entries[entries.length - 1]
    if (latest) stream.scrollTop += latest.getBoundingClientRect().top - stream.getBoundingClientRect().top - 16
    locateSession.current = undefined
  }, [session.id, chat.messages, chat.loading, offers.value, offers.loading])
  const timeline = [
    ...chat.messages.map((message) => ({ key: `message-${message.id}`, sessionId: message.sessionId, time: message.createdAt, message, offer: undefined as Offer | undefined })),
    ...(offers.value || []).map((offer) => ({ key: `offer-${offer.id}`, sessionId: offer.sessionId, time: offer.createdAt, message: undefined, offer })),
  ].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
  const send = () => {
    if (!text.trim()) return
    const content = text; setText(''); followBottom.current = true
    void chat.send(session.id, { clientMsgId: crypto.randomUUID(), kind: 'TEXT', content })
  }
  return localize(<section className="chat-conversation" aria-label="当前聊天">
    <div className="chat-conversation-header"><Space><Link className="chat-back" to="/chat" aria-label="返回聊天列表"><ArrowLeftOutlined /></Link><h1>{<OriginalText>{session.peer.nickname}</OriginalText>}</h1></Space><Space>{chat.connection === 'connected' && <span className="chat-online" role="status">实时连接已建立</span>}<Popover trigger="click" placement="bottomRight" content={<ReportButton targetType="USER" targetId={session.peer.id} label="举报对方" />}><Button type="text" aria-label="会话操作" icon={<EllipsisOutlined />} /></Popover></Space></div>
    <div className="chat-context">{sessions.length > 1 && <div className="chat-context-switch"><span>当前沟通</span><Select aria-label="选择沟通商品或求购" virtual={false} value={session.id} onChange={(id) => { locateSession.current = id; followBottom.current = false; setQuoteSessionId(undefined); setAmount(null); navigate(`/chat/${id}`, { replace: true }) }} options={sessions.map((item) => ({ value: item.id, label: <>{item.type === 'WANTED' ? t('求购：') : ''}<CatalogText text={contextTitle(item)} /></> }))} /><span className="muted">共 {sessions.length} 项，聊天记录已合并</span></div>}{session.product ? <ProductSummary product={session.product} /> : session.wanted ? <><Link to={`/wanted/${session.wanted.id}`}>{<CatalogText text={session.wanted.title} />}</Link><p className="muted">求购会话用于沟通；交易请从具体商品发起。</p></> : <p className="muted">关联商品已不可用，历史消息仍可查看。</p>}</div>
    <div className="chat-connection">{chat.connection !== 'connected' && <Alert type="warning" title="实时连接恢复中，仍可发送消息并获取历史记录。" />}<Failure error={chat.error} /><Failure error={offers.error} retry={offers.reload} /></div>
    <div className="chat-message-stream" ref={streamRef} onScroll={() => { const stream = streamRef.current; if (stream) followBottom.current = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 100 }} aria-label="聊天消息">
      {(chat.loading || chat.hasOlder) && <div style={{ textAlign: 'center' }}><Button type="text" loading={chat.loading} disabled={!chat.hasOlder || !chat.messages.length} onClick={() => { followBottom.current = false; void chat.older() }}>加载更早消息</Button></div>}
      {!chat.loading && !timeline.length && <Empty description="还没有消息，打个招呼吧" />}
      {timeline.map((entry) => {
        const mine = entry.offer ? entry.offer.proposerId === user.id : entry.message?.senderId === user.id
        const author = mine ? user : session.peer
        const context = sessions.find((item) => item.id === entry.sessionId)
        return localize(<div key={entry.key} data-session-id={entry.sessionId}><div className="chat-time">{chatTime(entry.time)}</div><div className={`message-row ${mine ? 'is-mine' : ''}`}><Avatar size={44} src={author.avatar}>{<OriginalText>{author.nickname.slice(0, 1)}</OriginalText>}</Avatar><div className="message-body">
          {sessions.length > 1 && context && <div className="chat-message-context">{<CatalogText text={contextTitle(context)} />}</div>}
          {entry.offer ? <Quote offer={entry.offer} refresh={offers.reload} /> : entry.message && <><div className="message-bubble">{entry.message.kind === 'IMAGE' ? <PrivateImage messageId={entry.message.id} /> : <CatalogText text={entry.message.content || (entry.message.kind === 'OFFER' ? '报价动态' : '系统消息')} />}</div>{!mine && <div className="message-report"><Popover trigger={['hover', 'click']} content={<ReportButton targetType="CHAT_MESSAGE" targetId={entry.message.id} />}><Button type="text" aria-label="消息操作" icon={<EllipsisOutlined />} /></Popover></div>}</>}
        </div></div></div>)
      })}
      {chat.pending.map((item) => localize(<div className="message-row is-mine" key={item.clientMsgId}><Avatar src={user.avatar}>{<OriginalText>{user.nickname.slice(0, 1)}</OriginalText>}</Avatar><div className="message-body">{sessions.length > 1 && <div className="chat-message-context">{<CatalogText text={contextTitle(sessions.find((context) => context.id === item.sessionId))} />}</div>}<div className="message-bubble">{<CatalogText text={item.kind === 'IMAGE' ? '[图片]' : item.content || ''} />}</div><Tag color={item.failed ? 'error' : 'processing'}>{item.failed ? '发送失败' : '发送中'}</Tag>{item.failed && <><Failure error={item.error} /><Button onClick={() => void chat.send(item.sessionId, { clientMsgId: item.clientMsgId, kind: item.kind, content: item.content })}>重试发送</Button></>}</div></div>))}
    </div>
    <div className="chat-composer"><Input.TextArea aria-label="消息内容" placeholder="输入消息…" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} autoSize={{ minRows: 2, maxRows: 4 }} />
      <div className="composer-actions"><Space size={8}><Tooltip title="发送图片"><Button type="text" aria-label="图片" icon={<PaperClipOutlined />} aria-expanded={attachments} onClick={() => setAttachments(!attachments)} /></Tooltip><Popover trigger="click" open={emojiOpen} onOpenChange={setEmojiOpen} content={<div className="chat-emoji-picker">{['😊', '😄', '👍', '🤝', '❤️', '🎉'].map((emoji) => localize(<Button key={emoji} type="text" aria-label={`插入 ${emoji}`} disabled={text.length + emoji.length > 4000} onClick={() => { setText((value) => value + emoji); setEmojiOpen(false) }}>{emoji}</Button>))}</div>}><Button type="text" aria-label="插入表情" icon={<SmileOutlined />} /></Popover>{session.product && <Tooltip title="发起报价"><Button type="text" aria-label="报价" icon={<DollarOutlined />} aria-expanded={quoting} onClick={() => { setQuoteSessionId(quoting ? undefined : session.id); setAmount(null) }} /></Tooltip>}</Space><Button type="primary" aria-label="发送消息" disabled={!text.trim()} onClick={send}>发送</Button></div>
      {attachments && <div className="composer-extra"><ImageQueue purpose="chat" value={images} onChange={setImages} onBusyChange={setUploadBlocked} /><Button disabled={!images.length || uploadBlocked} onClick={() => { for (const content of images) void chat.send(session.id, { clientMsgId: crypto.randomUUID(), kind: 'IMAGE', content }); setImages([]) }}>发送已上传图片</Button></div>}
      {quoting && session.product && <div className="composer-extra"><Failure error={mutation.error} /><Space wrap><InputNumber aria-label="报价金额" min={0.01} max={99999999.99} precision={2} value={amount} onChange={setAmount} placeholder="报价金额" /><Button disabled={!amount || session.product.status !== 'ON_SALE'} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.createOffer({ path: { sessionId: session.id }, body: { amount: amount! }, headers: api.idempotencyHeaders(attemptKey({ sessionId: session.id, amount })) }); setAmount(null); offers.reload() })}>提交报价</Button></Space><Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>接受报价后生成订单，商品锁定为已预订。</Typography.Paragraph></div>}
    </div>
  </section>)
}

function ChatWorkspace({ id }: { id?: number }) {
  useLanguage()
  const user = useSession((state) => state.user)!
  const sessions = useRemote(`sessions-${user.id}`, (signal) => api.data(api.listChatSessions({ signal })), 5000, true)
  const selected = sessions.value?.find((session) => session.id === id)
  return localize(<div className={`chat-workspace ${id ? 'has-session' : ''}`}><SessionPane sessions={sessions} selected={id} />{selected ? <Conversation key={`${user.id}-${selected.peer.id}`} session={selected} sessions={sessions.value!.filter((item) => item.peer.id === selected.peer.id)} /> : <section className="chat-conversation" aria-label="当前聊天"><div className="chat-empty"><Resource {...sessions}>{id ? <Alert type="warning" title="会话不存在或无权访问。" action={<Link to="/chat">返回聊天列表</Link>} /> : <Empty description="选择左侧会话，开始聊天" />}</Resource></div></section>}</div>)
}

export function ChatListPage() {
  useLanguage(); return localize(<ChatWorkspace />) }
export function ChatPage() {
  useLanguage(); const { id } = useParams(); return localize(<ChatWorkspace id={Number(id)} />) }
