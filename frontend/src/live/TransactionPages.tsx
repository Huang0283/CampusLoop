import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, Descriptions, Form, Input, Pagination, Popconfirm, Rate, Select, Space, Steps, Tabs, Tag, Timeline, Typography } from 'antd'
import { AimOutlined, BellFilled, MessageFilled, MoneyCollectFilled } from '@ant-design/icons'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { MeetupWriteRequest, Notification, OrderStatus, ReviewWriteRequest } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { ReportButton } from './ReportButton'
import { useSession } from './session'
import { useAttemptKey } from './idempotency'
import { campusToday, validateMeetupEnd, validateMeetupStart } from './meetupTime'
import { MyReports } from './ReportsPage'
import { notifyNotificationsChanged, uniqueNotifications } from './notifications'
import { ProductSummary, Person } from './Presentation'
import { displayDate } from './display'

const orderLabels: Record<OrderStatus, string> = { PENDING_CONFIRM: '待约定', BOOKED: '已预订', MEETUP_ARRANGED: '见面已确认', COMPLETED: '已完成', CANCELLED: '已取消', DISPUTED: '争议中' }


export function OrderListPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const role = params.get('role') === 'buyer' ? 'buyer' : params.get('role') === 'seller' ? 'seller' : undefined
  const status = params.get('status') as OrderStatus | null
  const remote = useRemote(`orders-${params}`, (signal) => api.data(api.listOrders({ signal, query: { page, pageSize: 12, role, status: status || undefined } })), 5000)
  const change = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }
  return <Page title="交易中心" subtitle="查看购买、出售进度，管理见面与评价"><div className="order-list"><Tabs activeKey={role || 'all'} onChange={(value) => change('role', value === 'all' ? undefined : value)} items={[{ key: 'all', label: '全部交易' }, { key: 'buyer', label: '我买到的' }, { key: 'seller', label: '我卖出的' }]} />
    <Space wrap style={{ marginBottom: 16 }}><Select aria-label="订单状态" placeholder="全部状态" allowClear style={{ width: 160 }} value={status || undefined} options={Object.entries(orderLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => change('status', value)} /><Button onClick={remote.reload}>刷新订单</Button></Space>
    <Resource {...remote}>{remote.value?.items.length ? remote.value.items.map((order) => <Card className="order-card" key={order.id}><div className="order-card-header"><span className="muted">订单 #{order.id} · {displayDate(order.createdAt)}</span><Tag color={order.status === 'COMPLETED' ? 'green' : 'blue'}>{orderLabels[order.status]}</Tag></div><div className="order-card-body"><ProductSummary product={order.product}><p className="muted">买家 {order.buyer.nickname} · 卖家 {order.seller.nickname}</p></ProductSummary><div className="order-price"><span className="muted">成交金额</span><div className="price">¥{order.amount.toFixed(2)}</div><Link to={`/transactions/${order.id}`}><Button>查看订单</Button></Link></div></div></Card>) : <NoItems filtered={Boolean(role || status)} />}{remote.value && <Pagination current={page} pageSize={12} total={remote.value.pagination.total} showSizeChanger={false} onChange={(next) => { const updated = new URLSearchParams(params); updated.set('page', String(next)); setParams(updated) }} />}</Resource></div>
  </Page>
}

export function OrderPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const user = useSession((state) => state.user)!
  const remote = useRemote(`order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId }, signal })), 5000)
  const events = useRemote(`events-${id}`, (signal) => api.data(api.listOrderEvents({ path: { orderId }, signal })), 5000)
  const mutation = useMutation()
  const [reason, setReason] = useState('')
  const completionButtonRef = useRef<HTMLButtonElement>(null)
  const item = remote.value
  const confirmedComplete = item && (user.id === item.buyer.id ? item.buyerConfirmedComplete : item.sellerConfirmedComplete)
  const confirmedMeetup = item?.meetup && (user.id === item.buyer.id ? item.meetup.buyerConfirmed : item.meetup.sellerConfirmed)
  const meetupNeedsReschedule = Boolean(item?.meetup && !(item.meetup.buyerConfirmed && item.meetup.sellerConfirmed) && new Date(`${item.meetup.scheduledDate}T${item.meetup.timeSlotStart}+08:00`).getTime() <= now)
  const mutable = item && !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(item.status)
  return <Page title={`订单 #${id}`} extra={<Link to="/transactions">返回交易中心</Link>}><Resource {...remote}><Failure error={mutation.error} retry={remote.reload} />{item && <>
    <Card className="order-progress"><Steps size="small" status={['CANCELLED', 'DISPUTED'].includes(item.status) ? 'error' : undefined} current={item.status === 'COMPLETED' ? 3 : item.status === 'MEETUP_ARRANGED' ? 2 : 1} items={[{ title: '达成报价' }, { title: '安排见面' }, { title: '双方确认' }, { title: '完成交易' }]} /><div style={{ marginTop: 16 }}><Tag color="blue">{orderLabels[item.status]}</Tag><span className="muted">订单 #{item.id} · {displayDate(item.createdAt)}</span></div></Card>
    <div className="detail-columns"><div className="detail-sections"><Card title="商品信息"><ProductSummary product={item.product} /><div className="order-persons"><div><p className="muted">买家</p><Person person={item.buyer} /></div><div><p className="muted">卖家</p><Person person={item.seller} /></div></div></Card>
    <Card title="见面与交易操作">
      {item.meetup && <><Typography.Title level={5}>见面约定 · 版本 {item.meetup.version}</Typography.Title><Typography.Paragraph>{item.meetup.campusLocation} · {item.meetup.scheduledDate} · {item.meetup.timeSlotStart}–{item.meetup.timeSlotEnd}<br />{item.meetup.note}</Typography.Paragraph><Space wrap><Tag color={item.meetup.buyerConfirmed ? 'success' : undefined}>买家{item.meetup.buyerConfirmed ? '已确认' : '未确认'}</Tag><Tag color={item.meetup.sellerConfirmed ? 'success' : undefined}>卖家{item.meetup.sellerConfirmed ? '已确认' : '未确认'}</Tag></Space></>}
      <div style={{ margin: '16px 0' }}><Space wrap>
        {mutable && <Link to={`/transactions/${item.id}/meetup`}>{item.meetup ? '修改见面约定' : '安排见面'}</Link>}
        {mutable && item.meetup && <Button disabled={confirmedMeetup || meetupNeedsReschedule} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.confirmMeetup({ path: { orderId }, body: { meetupId: item.meetup!.id, version: item.meetup!.version }, headers: api.idempotencyHeaders(crypto.randomUUID()) }); remote.reload(); events.reload() })}>确认当前版本</Button>}
        {item.status === 'MEETUP_ARRANGED' && <Popconfirm title="确认已实际完成这次交易？" onCancel={() => {
          window.requestAnimationFrame(() => {
            completionButtonRef.current?.focus({ preventScroll: true })
          })
        }} onConfirm={() => mutation.run(async () => { await api.confirmOrderComplete({ path: { orderId }, body: { meetupVersion: item.meetup!.version }, headers: api.idempotencyHeaders(crypto.randomUUID()) }); remote.reload(); events.reload() })}><Button ref={completionButtonRef} type="primary" disabled={confirmedComplete} loading={mutation.busy}>我已完成交易</Button></Popconfirm>}
        {item.status === 'COMPLETED' && <Link to={`/transactions/${item.id}/review`}>评价交易</Link>}
        <ReportButton targetType="ORDER" targetId={item.id} orderRole={user.id === item.seller.id ? 'seller' : 'buyer'} />
      </Space></div>
      {mutable && meetupNeedsReschedule && <Alert type="warning" style={{ marginBottom: 16 }} title="见面开始时间已过且尚未完成双方确认，请修改见面约定后重新确认。" />}
      {mutable && <Alert type="info" title={`完成确认：买家${item.buyerConfirmedComplete ? '已确认' : '未确认'}，卖家${item.sellerConfirmedComplete ? '已确认' : '未确认'}；双方确认后才完成。`} />}
      {mutable && !item.buyerConfirmedComplete && !item.sellerConfirmedComplete && <Space wrap style={{ marginTop: 16 }}><Input aria-label="取消原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="取消原因" maxLength={200} /><Popconfirm title="取消这笔订单？商品将恢复在售。" onConfirm={() => mutation.run(async () => { await api.cancelOrder({ path: { orderId }, body: { reason } }); remote.reload(); events.reload() })}><Button danger disabled={!reason.trim()} loading={mutation.busy}>取消订单</Button></Popconfirm></Space>}
    </Card><Card title="订单时间线"><Resource {...events}><Timeline items={events.value?.map((event) => ({ children: <>{event.description}<br /><Typography.Text type="secondary">{new Date(event.createdAt).toLocaleString()}</Typography.Text></> }))} /></Resource></Card></div><aside className="surface"><h2>订单信息</h2><Descriptions column={1} items={[{ key: 'price', label: '成交金额', children: <span className="price">¥{item.amount.toFixed(2)}</span> }, { key: 'status', label: '状态', children: orderLabels[item.status] }, { key: 'created', label: '创建时间', children: displayDate(item.createdAt) }]} /><p className="muted">请核实商品和见面信息，实际完成交易后再确认。买卖双方都确认后，订单才会完成。</p></aside></div>
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
  return <Page title="安排见面" extra={<Link to={`/transactions/${id}`}>返回订单</Link>}><Resource {...remote}><div className="detail-columns"><div className="detail-sections">
    <Card title="当前约定">{remote.value?.meetup ? <Descriptions column={1} items={[{ key: 'location', label: '见面地点', children: remote.value.meetup.campusLocation }, { key: 'time', label: '见面时间', children: `${remote.value.meetup.scheduledDate} ${remote.value.meetup.timeSlotStart}–${remote.value.meetup.timeSlotEnd}` }, { key: 'version', label: '版本', children: remote.value.meetup.version }]} /> : <Typography.Text type="secondary">尚未安排见面，请与对方沟通后填写约定。</Typography.Text>}</Card>
    <Card title="填写 / 修改约定"><Failure error={mutation.error} /><Alert type="info" title="请使用北京时间选择未来的开始时间；每次修改生成新版本，双方需要重新确认。" style={{ marginBottom: 16 }} /><Form form={form} layout="vertical" size="large" noValidate onFinish={(body) => void mutation.run(async () => { validateMeetupStart(body.scheduledDate, body.timeSlotStart); await api.saveMeetup({ path: { orderId: Number(id) }, body, headers: api.idempotencyHeaders(attemptKey(body)) }); navigate(`/transactions/${id}`) })}>
    <Form.Item name="campusLocation" label="校内见面地点" rules={[{ required: true, whitespace: true, max: 100 }]}><Input /></Form.Item>
    <Form.Item name="scheduledDate" label="日期" rules={[{ required: true }]}><Input type="date" min={campusToday()} /></Form.Item>
    <Space wrap><Form.Item name="timeSlotStart" label="开始时间" dependencies={['scheduledDate']} rules={[{ required: true }, { validator: async (_, value) => { validateMeetupStart(form.getFieldValue('scheduledDate'), value) } }]}><Input type="time" /></Form.Item><Form.Item name="timeSlotEnd" label="结束时间" dependencies={['timeSlotStart']} rules={[{ required: true }, { validator: async (_, value) => { validateMeetupEnd(form.getFieldValue('timeSlotStart'), value) } }]}><Input type="time" /></Form.Item></Space>
    <Form.Item name="note" label="备注"><Input.TextArea maxLength={500} /></Form.Item><Button type="primary" htmlType="submit" loading={mutation.busy} disabled={!remote.value || ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(remote.value.status)}>保存新约定</Button>
  </Form></Card></div><aside className="surface"><h2>交易商品</h2>{remote.value && <ProductSummary product={remote.value.product} />}<p className="muted">建议选择校内公共区域。修改约定后，请提醒对方确认最新版本。</p></aside></div></Resource></Page>
}

export function ReviewPage() {
  const { id } = useParams()
  const remote = useRemote(`review-order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId: Number(id) }, signal })))
  const mutation = useMutation()
  const [done, setDone] = useState(false)
  const attemptKey = useAttemptKey()
  return <Page title="评价交易" subtitle="分享真实的交易体验" extra={<Link to={`/transactions/${id}`}>返回订单</Link>}><Resource {...remote}><Card className="review-card">{remote.value && <ProductSummary product={remote.value.product} />}<Failure error={mutation.error} />{done ? <Alert type="success" title="评价已保存。" /> : remote.value?.status !== 'COMPLETED' ? <Alert type="warning" title="双方完成交易后才可评价。" /> : <Form layout="vertical" onFinish={(values: Omit<ReviewWriteRequest, 'orderId'>) => void mutation.run(async () => { await api.createReview({ body: { ...values, orderId: Number(id) }, headers: api.idempotencyHeaders(attemptKey(values)) }); setDone(true) })}>
    {[['overall', '总体评价'], ['descriptionAccuracy', '描述准确度'], ['communication', '沟通体验'], ['punctuality', '守时情况']].map(([name, label]) => <Form.Item key={name} name={name} label={label} rules={[{ required: true, type: 'number', min: 1, max: 5 }]}><Rate /></Form.Item>)}
    <Form.Item name="comment" label="评价内容"><Input.TextArea maxLength={1000} /></Form.Item><Button type="primary" htmlType="submit" loading={mutation.busy}>提交评价</Button>
  </Form>}</Card></Resource></Page>
}

export function NotificationsPage() {
  const user = useSession((state) => state.user)
  const remote = useRemote(`notifications-${user?.id}`, (signal) => api.data(api.listNotifications({ signal })), 5000)
  const mutation = useMutation()
  const navigate = useNavigate()
  const notifications = uniqueNotifications(remote.value ?? [])
  const [group, setGroup] = useState('全部')
  const groupOf = (item: Notification) => item.type === 'MESSAGE' ? '消息' : item.type.startsWith('OFFER_') ? '报价' : item.type === 'MATCH_FOUND' ? '匹配' : '系统'
  const visible = notifications.filter((item) => group === '全部' || groupOf(item) === group)
  const config = { 消息: { icon: <MessageFilled />, color: '#2f6bff' }, 报价: { icon: <MoneyCollectFilled />, color: '#52c41a' }, 匹配: { icon: <AimOutlined />, color: '#fa8c16' }, 系统: { icon: <BellFilled />, color: '#722ed1' } }
  return <Page title="通知" extra={<Button loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.markAllNotificationsRead(); notifyNotificationsChanged(); remote.reload() })}>全部已读</Button>}><Failure error={mutation.error} /><div className="notification-list"><Tabs activeKey={group} onChange={setGroup} items={['全部', '消息', '报价', '匹配', '系统'].map((value) => ({ key: value, label: value }))} /><Resource {...remote}>
    {visible.length ? visible.map((item) => <article key={item.id} className={`notification-row ${item.read ? '' : 'is-unread'}`}><span className="notification-icon" style={{ background: config[groupOf(item)].color }}>{config[groupOf(item)].icon}</span><div className="notification-copy"><h2><Badge dot={!item.read} /> {item.title}</h2><p>{item.content}</p><span className="muted">{displayDate(item.createdAt)}</span></div><div className="notification-actions"><Button disabled={item.read} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.markNotificationRead({ path: { notificationId: item.id } }); notifyNotificationsChanged(); remote.reload() })}>标为已读</Button>{item.link && /^\/(?!\/)/.test(item.link) && <Button onClick={() => void mutation.run(async () => { if (!item.read) { await api.markNotificationRead({ path: { notificationId: item.id } }); notifyNotificationsChanged() } navigate(item.link!) })}>查看</Button>}</div></article>) : <NoItems />}
  </Resource></div><MyReports /></Page>
}
