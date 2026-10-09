import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Descriptions, Form, Input, InputNumber, List, Pagination, Popconfirm, Rate, Select, Space, Tag, Timeline, Typography } from 'antd'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { MeetupWriteRequest, Offer, OrderStatus, ReviewWriteRequest } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { ImageQueue } from './ImageQueue'
import { ReportButton } from './ReportButton'
import { useSession } from './session'
import { useChat } from './useChat'
import { PrivateImage } from './PrivateImage'
import { useAttemptKey } from './idempotency'

const orderLabels: Record<OrderStatus, string> = { PENDING_CONFIRM: '待约定', BOOKED: '已预订', MEETUP_ARRANGED: '见面已确认', COMPLETED: '已完成', CANCELLED: '已取消', DISPUTED: '争议中' }
const offerLabels = { PENDING: '等待回应', ACCEPTED: '已接受', REJECTED: '已拒绝', COUNTERED: '已有还价', EXPIRED: '已过期', CANCELLED: '已撤回' }

export function ChatListPage() {
  const remote = useRemote('sessions', (signal) => api.data(api.listChatSessions({ signal })), 5000)
  return <Page title="聊天列表" extra={<Button onClick={remote.reload}>刷新</Button>}><Resource {...remote}>
    {remote.value?.length ? <List dataSource={remote.value} renderItem={(session) => <List.Item><List.Item.Meta title={<Link to={`/chat/${session.id}`}>{session.peer.nickname} · {session.product?.title || session.wanted?.title}</Link>} description={session.lastMessage?.kind === 'IMAGE' ? '[图片]' : session.lastMessage?.content || '暂无消息'} /><Badge count={session.unreadCount} /></List.Item>} /> : <NoItems />}
  </Resource></Page>
}

function Quote({ offer, refresh }: { offer: Offer; refresh: () => void }) {
  const attemptKey = useAttemptKey()
  const user = useSession((state) => state.user)!
  const mutation = useMutation()
  const [amount, setAmount] = useState<number | null>(offer.amount)
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const pending = offer.status === 'PENDING' && new Date(offer.expireAt).getTime() > now
  return <Card size="small" style={{ marginBottom: 12 }} title={`报价 ¥${offer.amount.toFixed(2)}`} extra={<Tag>{offerLabels[offer.status]}</Tag>}>
    <Failure error={mutation.error} retry={refresh} /><Space wrap>
      {offer.orderId && <Link to={`/transactions/${offer.orderId}`}>查看订单</Link>}
      {pending && (offer.proposerId === user.id ? <Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.cancelOffer({ path: { offerId: offer.id } }); refresh() })}>撤回报价</Button> : <>
        <Button type="primary" loading={mutation.busy} onClick={() => void mutation.run(async () => { const saved = await api.data(api.acceptOffer({ path: { offerId: offer.id }, headers: api.idempotencyHeaders(crypto.randomUUID()) })); refresh(); navigate(`/transactions/${saved.order.id}`) })}>接受报价</Button>
        <Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.rejectOffer({ path: { offerId: offer.id } }); refresh() })}>拒绝</Button>
        <InputNumber aria-label="还价金额" min={0.01} precision={2} value={amount} onChange={setAmount} />
        <Button disabled={!amount} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.counterOffer({ path: { offerId: offer.id }, body: { amount: amount! }, headers: api.idempotencyHeaders(attemptKey({ offerId: offer.id, amount })) }); refresh() })}>还价</Button>
      </>)}
    </Space>
  </Card>
}

export function ChatPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const user = useSession((state) => state.user)!
  const remote = useRemote(`session-${id}`, async (signal) => {
    const sessions = await api.data(api.listChatSessions({ signal }))
    const context = sessions.find((item) => item.id === sessionId)
    if (!context) throw new api.ApiError(404, 'NOT_FOUND', '会话不存在或无权访问。')
    return context
  })
  const offers = useRemote(`offers-${id}`, (signal) => api.data(api.listSessionOffers({ path: { sessionId }, signal })), 5000)
  const chat = useChat(sessionId)
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const attemptKey = useAttemptKey()
  const [amount, setAmount] = useState<number | null>(null)
  const mutation = useMutation()
  return <Page title={remote.value ? `与 ${remote.value.peer.nickname} 聊天` : '聊天'} extra={<Link to="/chat">返回列表</Link>}><Resource {...remote}>
    {remote.value && <>
      <Card style={{ marginBottom: 16 }}><Space wrap>{remote.value.product ? <Link to={`/product/${remote.value.product.id}`}>{remote.value.product.title}</Link> : <Link to={`/wanted/${remote.value.wanted?.id}`}>{remote.value.wanted?.title}</Link>}<ReportButton targetType="USER" targetId={remote.value.peer.id} /></Space></Card>
      <Alert type={chat.connection === 'connected' ? 'success' : 'warning'} title={chat.connection === 'connected' ? '实时连接已建立' : '实时连接恢复中，可通过 HTTP 发送与补拉消息。'} style={{ marginBottom: 16 }} />
      <Failure error={chat.error} /><Card loading={chat.loading}>
        <Button disabled={!chat.hasOlder || !chat.messages.length} onClick={() => void chat.older()}>加载更早消息</Button>
        <List dataSource={chat.messages} renderItem={(item) => <List.Item style={{ justifyContent: item.senderId === user.id ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '85%' }}><Typography.Text type="secondary">{item.senderId === user.id ? '我' : remote.value?.peer.nickname} · {new Date(item.createdAt).toLocaleString()}</Typography.Text><div>{item.kind === 'IMAGE' ? <PrivateImage messageId={item.id} /> : <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.content}</Typography.Paragraph>}</div>{item.senderId !== user.id && <ReportButton targetType="CHAT_MESSAGE" targetId={item.id} />}</div></List.Item>} />
        {chat.pending.map((item) => <Card size="small" key={item.clientMsgId} style={{ marginBottom: 8 }}><Typography.Paragraph>{item.kind === 'IMAGE' ? '[图片]' : item.content}</Typography.Paragraph><Tag color={item.failed ? 'error' : 'processing'}>{item.failed ? '发送失败' : '发送中'}</Tag>{item.failed && <><Failure error={item.error} /><Button onClick={() => void chat.send({ clientMsgId: item.clientMsgId, kind: item.kind, content: item.content })}>重试发送</Button></>}</Card>)}
        <Input.TextArea aria-label="消息内容" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} rows={3} />
        <Button type="primary" disabled={!text.trim()} style={{ marginTop: 8 }} onClick={() => { const content = text; setText(''); void chat.send({ clientMsgId: crypto.randomUUID(), kind: 'TEXT', content }) }}>发送消息</Button>
        <div style={{ marginTop: 12 }}><ImageQueue purpose="chat" value={images} onChange={setImages} onBusyChange={setUploadBlocked} /><Button disabled={!images.length || uploadBlocked} onClick={() => { for (const content of images) void chat.send({ clientMsgId: crypto.randomUUID(), kind: 'IMAGE', content }); setImages([]) }}>发送已上传图片</Button></div>
      </Card>
      <Card title="报价" style={{ marginTop: 16 }}><Failure error={mutation.error} /><Failure error={offers.error} retry={offers.reload} />
        {offers.value?.map((offer) => <Quote key={offer.id} offer={offer} refresh={offers.reload} />)}
        {remote.value.product && <Space wrap><InputNumber aria-label="报价金额" min={0.01} max={99999999.99} precision={2} value={amount} onChange={setAmount} /><Button disabled={!amount || remote.value.product.status !== 'ON_SALE'} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.createOffer({ path: { sessionId }, body: { amount: amount! }, headers: api.idempotencyHeaders(attemptKey({ sessionId, amount })) }); setAmount(null); offers.reload() })}>提交报价</Button></Space>}
        {!remote.value.product && <Typography.Text type="secondary">求购会话用于沟通；交易请从具体商品发起。</Typography.Text>}
      </Card>
    </>}
  </Resource></Page>
}

export function OrderListPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const role = params.get('role') === 'buyer' ? 'buyer' : params.get('role') === 'seller' ? 'seller' : undefined
  const status = params.get('status') as OrderStatus | null
  const remote = useRemote(`orders-${params}`, (signal) => api.data(api.listOrders({ signal, query: { page, pageSize: 12, role, status: status || undefined } })), 5000)
  const change = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }
  return <Page title="交易中心"><Space wrap style={{ marginBottom: 16 }}><Select aria-label="交易角色" placeholder="全部角色" allowClear style={{ width: 140 }} value={role} options={[{ value: 'buyer', label: '我买到的' }, { value: 'seller', label: '我卖出的' }]} onChange={(value) => change('role', value)} /><Select aria-label="订单状态" placeholder="全部状态" allowClear style={{ width: 160 }} value={status || undefined} options={Object.entries(orderLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => change('status', value)} /></Space>
    <Resource {...remote}>{remote.value?.items.length ? <List dataSource={remote.value.items} renderItem={(order) => <List.Item><List.Item.Meta title={<Link to={`/transactions/${order.id}`}>{order.product.title} · 订单 #{order.id}</Link>} description={`¥${order.amount.toFixed(2)} · 买家 ${order.buyer.nickname} · 卖家 ${order.seller.nickname}`} /><Tag>{orderLabels[order.status]}</Tag></List.Item>} /> : <NoItems filtered={Boolean(role || status)} />}{remote.value && <Pagination current={page} pageSize={12} total={remote.value.pagination.total} showSizeChanger={false} onChange={(next) => { const updated = new URLSearchParams(params); updated.set('page', String(next)); setParams(updated) }} />}</Resource>
  </Page>
}

export function OrderPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const user = useSession((state) => state.user)!
  const remote = useRemote(`order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId }, signal })), 5000)
  const events = useRemote(`events-${id}`, (signal) => api.data(api.listOrderEvents({ path: { orderId }, signal })), 5000)
  const mutation = useMutation()
  const [reason, setReason] = useState('')
  const item = remote.value
  const confirmedComplete = item && (user.id === item.buyer.id ? item.buyerConfirmedComplete : item.sellerConfirmedComplete)
  const confirmedMeetup = item?.meetup && (user.id === item.buyer.id ? item.meetup.buyerConfirmed : item.meetup.sellerConfirmed)
  const mutable = item && !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(item.status)
  return <Page title={`订单 #${id}`} extra={<Link to="/transactions">返回交易中心</Link>}><Resource {...remote}><Failure error={mutation.error} retry={remote.reload} />{item && <>
    <Card><Descriptions column={1} items={[{ key: 'product', label: '商品', children: <Link to={`/product/${item.product.id}`}>{item.product.title}</Link> }, { key: 'price', label: '成交金额', children: `¥${item.amount.toFixed(2)}` }, { key: 'status', label: '状态', children: orderLabels[item.status] }, { key: 'parties', label: '参与者', children: `${item.buyer.nickname}（买家） / ${item.seller.nickname}（卖家）` }]} />
      {item.meetup && <><Typography.Title level={5}>见面约定 · 版本 {item.meetup.version}</Typography.Title><Typography.Paragraph>{item.meetup.campusLocation} · {item.meetup.scheduledDate} · {item.meetup.timeSlotStart}–{item.meetup.timeSlotEnd}<br />{item.meetup.note}</Typography.Paragraph><Space wrap><Tag color={item.meetup.buyerConfirmed ? 'success' : undefined}>买家{item.meetup.buyerConfirmed ? '已确认' : '未确认'}</Tag><Tag color={item.meetup.sellerConfirmed ? 'success' : undefined}>卖家{item.meetup.sellerConfirmed ? '已确认' : '未确认'}</Tag></Space></>}
      <div style={{ margin: '16px 0' }}><Space wrap>
        {mutable && <Link to={`/transactions/${item.id}/meetup`}>{item.meetup ? '修改见面约定' : '安排见面'}</Link>}
        {mutable && item.meetup && <Button disabled={confirmedMeetup} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.confirmMeetup({ path: { orderId }, body: { meetupId: item.meetup!.id, version: item.meetup!.version }, headers: api.idempotencyHeaders(crypto.randomUUID()) }); remote.reload(); events.reload() })}>确认当前版本</Button>}
        {item.status === 'MEETUP_ARRANGED' && <Popconfirm title="确认已实际完成这次交易？" onConfirm={() => mutation.run(async () => { await api.confirmOrderComplete({ path: { orderId }, body: { meetupVersion: item.meetup!.version }, headers: api.idempotencyHeaders(crypto.randomUUID()) }); remote.reload(); events.reload() })}><Button type="primary" disabled={confirmedComplete} loading={mutation.busy}>我已完成交易</Button></Popconfirm>}
        {item.status === 'COMPLETED' && <Link to={`/transactions/${item.id}/review`}>评价交易</Link>}
        <ReportButton targetType="ORDER" targetId={item.id} />
      </Space></div>
      {mutable && <Alert type="info" title={`完成确认：买家${item.buyerConfirmedComplete ? '已确认' : '未确认'}，卖家${item.sellerConfirmedComplete ? '已确认' : '未确认'}；双方确认后才完成。`} />}
      {mutable && !item.buyerConfirmedComplete && !item.sellerConfirmedComplete && <Space wrap style={{ marginTop: 16 }}><Input aria-label="取消原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="取消原因" maxLength={200} /><Popconfirm title="取消这笔订单？商品将恢复在售。" onConfirm={() => mutation.run(async () => { await api.cancelOrder({ path: { orderId }, body: { reason } }); remote.reload(); events.reload() })}><Button danger disabled={!reason.trim()} loading={mutation.busy}>取消订单</Button></Popconfirm></Space>}
    </Card><Card title="订单时间线" style={{ marginTop: 16 }}><Resource {...events}><Timeline items={events.value?.map((event) => ({ children: <>{event.description}<br /><Typography.Text type="secondary">{new Date(event.createdAt).toLocaleString()}</Typography.Text></> }))} /></Resource></Card>
  </>}</Resource></Page>
}

export function MeetupPage() {
  const { id } = useParams()
  const remote = useRemote(`meetup-order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId: Number(id) }, signal })))
  const [form] = Form.useForm<MeetupWriteRequest>()
  const mutation = useMutation()
  const navigate = useNavigate()
  const attemptKey = useAttemptKey()
  useEffect(() => { if (remote.value?.meetup) form.setFieldsValue(remote.value.meetup) }, [remote.value, form])
  return <Page title="安排见面" extra={<Link to={`/transactions/${id}`}>返回订单</Link>}><Resource {...remote}><Card><Failure error={mutation.error} /><Alert type="info" title="每次修改生成新版本，双方需要重新确认。" style={{ marginBottom: 16 }} /><Form form={form} layout="vertical" onFinish={(body) => void mutation.run(async () => { await api.saveMeetup({ path: { orderId: Number(id) }, body, headers: api.idempotencyHeaders(attemptKey(body)) }); navigate(`/transactions/${id}`) })}>
    <Form.Item name="campusLocation" label="校内见面地点" rules={[{ required: true, whitespace: true, max: 100 }]}><Input /></Form.Item>
    <Form.Item name="scheduledDate" label="日期" rules={[{ required: true }]}><Input type="date" /></Form.Item>
    <Space wrap><Form.Item name="timeSlotStart" label="开始时间" rules={[{ required: true }]}><Input type="time" /></Form.Item><Form.Item name="timeSlotEnd" label="结束时间" rules={[{ required: true }]}><Input type="time" /></Form.Item></Space>
    <Form.Item name="note" label="备注"><Input.TextArea maxLength={500} /></Form.Item><Button type="primary" htmlType="submit" loading={mutation.busy} disabled={!remote.value || ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(remote.value.status)}>保存新约定</Button>
  </Form></Card></Resource></Page>
}

export function ReviewPage() {
  const { id } = useParams()
  const remote = useRemote(`review-order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId: Number(id) }, signal })))
  const mutation = useMutation()
  const [done, setDone] = useState(false)
  const attemptKey = useAttemptKey()
  return <Page title="评价交易" extra={<Link to={`/transactions/${id}`}>返回订单</Link>}><Resource {...remote}><Card><Failure error={mutation.error} />{done ? <Alert type="success" title="评价已保存。" /> : remote.value?.status !== 'COMPLETED' ? <Alert type="warning" title="双方完成交易后才可评价。" /> : <Form layout="vertical" onFinish={(values: Omit<ReviewWriteRequest, 'orderId'>) => void mutation.run(async () => { await api.createReview({ body: { ...values, orderId: Number(id) }, headers: api.idempotencyHeaders(attemptKey(values)) }); setDone(true) })}>
    {[['overall', '总体评价'], ['descriptionAccuracy', '描述准确度'], ['communication', '沟通体验'], ['punctuality', '守时情况']].map(([name, label]) => <Form.Item key={name} name={name} label={label} rules={[{ required: true, type: 'number', min: 1, max: 5 }]}><Rate /></Form.Item>)}
    <Form.Item name="comment" label="评价内容"><Input.TextArea maxLength={1000} /></Form.Item><Button type="primary" htmlType="submit" loading={mutation.busy}>提交评价</Button>
  </Form>}</Card></Resource></Page>
}

export function NotificationsPage() {
  const remote = useRemote('notifications', (signal) => api.data(api.listNotifications({ signal })), 5000)
  const reports = useRemote('my-reports', (signal) => api.data(api.listMyReports({ signal })), 5000)
  const mutation = useMutation()
  const navigate = useNavigate()
  return <Page title="通知与举报记录" extra={<Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.markAllNotificationsRead(); remote.reload() })}>全部已读</Button>}><Failure error={mutation.error} /><Resource {...remote}>
    {remote.value?.length ? <List dataSource={remote.value} renderItem={(item) => <List.Item actions={[<Button key="read" disabled={item.read} onClick={() => void mutation.run(async () => { await api.markNotificationRead({ path: { notificationId: item.id } }); remote.reload() })}>标为已读</Button>, ...(item.link && /^\/(?!\/)/.test(item.link) ? [<Button key="open" onClick={() => void mutation.run(async () => { if (!item.read) await api.markNotificationRead({ path: { notificationId: item.id } }); navigate(item.link!) })}>查看</Button>] : [])]}><List.Item.Meta title={<Space><Badge dot={!item.read} /><span>{item.title}</span></Space>} description={<>{item.content}<br />{new Date(item.createdAt).toLocaleString()}</>} /></List.Item>} /> : <NoItems />}
  </Resource><Card title="我的举报" style={{ marginTop: 16 }}><Resource {...reports}>{reports.value?.length ? <List dataSource={reports.value} renderItem={(item) => <List.Item>#{item.id} · {item.targetType} #{item.targetId} · {item.reason}<Tag>{item.status}</Tag></List.Item>} /> : <NoItems />}</Resource></Card></Page>
}
