import { localize, OriginalText } from '../i18n/Localize'
import { dateLocale, useLanguage, t } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Alert, Button, Card, Descriptions, Input, Pagination, Popconfirm, Rate, Select, Space, Steps, Tag, Timeline, Typography } from 'antd'
import { Form } from '../i18n/Form'
import { AimOutlined, AuditOutlined, BellOutlined, CalendarOutlined, CheckCircleOutlined, CheckOutlined, FlagOutlined, MessageOutlined, RightOutlined, SafetyCertificateOutlined, ShopOutlined, StarOutlined, SwapOutlined, TagOutlined } from '@ant-design/icons'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { MeetupWriteRequest, Notification, OrderStatus, ReviewWriteRequest } from '../sdk'
import { Failure, NoItems, Page, Resource, TabList, useMutation, useNotificationsResource, useRemote } from './common'
import { ReportButton } from './ReportButton'
import { useSession } from './session'
import { useAttemptKey } from './idempotency'
import { campusToday, validateMeetupEnd, validateMeetupStart } from './meetupTime'
import { notifyNotificationsChanged, uniqueNotifications } from './notifications'
import { ProductSummary, Person } from './Presentation'
import { displayDate, systemText } from './display'

const orderLabels: Record<OrderStatus, string> = { PENDING_CONFIRM: '待约定', BOOKED: '已预订', MEETUP_ARRANGED: '见面已确认', COMPLETED: '已完成', CANCELLED: '已取消', DISPUTED: '争议中' }


export function OrderListPage() {
  useLanguage()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const role = params.get('role') === 'buyer' ? 'buyer' : params.get('role') === 'seller' ? 'seller' : undefined
  const status = params.get('status') as OrderStatus | null
  const remote = useRemote(`orders-${params}`, (signal) => api.data(api.listOrders({ signal, query: { page, pageSize: 12, role, status: status || undefined } })), 5000)
  const change = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete('page'); setParams(next) }
  const filtered = Boolean(role || status)
  return localize(<Page className="transaction-center" title="交易中心" subtitle="查看购买、出售进度，管理见面与评价"><div className="order-list"><TabList ariaLabel="交易角色" className="segmented-tabs order-tabs" value={role || 'all'} onChange={(value) => change('role', value === 'all' ? undefined : value)} items={[{ key: 'all', label: '全部交易' }, { key: 'buyer', label: '我买到的' }, { key: 'seller', label: '我卖出的' }]} />
    <div className="order-toolbar"><Space wrap><Select aria-label="订单状态" placeholder="全部状态" allowClear style={{ width: 160 }} value={status || undefined} options={Object.entries(orderLabels).map(([value, label]) => ({ value, label }))} onChange={(value) => change('status', value)} /><Button onClick={remote.reload} loading={remote.loading && remote.value !== undefined}>刷新订单</Button></Space>{remote.value && <span className="muted">{t(`共 ${remote.value.pagination.total} 笔${filtered ? '符合条件的' : ''}交易`)}</span>}</div>
    <div className="order-results"><Resource {...remote}>{remote.value?.items.length ? <div className="order-cards">{remote.value.items.map((order) => localize(<Card className="order-card" key={order.id}><div className="order-card-header"><span className="muted">订单 #{order.id} · {displayDate(order.createdAt)}</span><Tag color={order.status === 'COMPLETED' ? 'green' : 'blue'}>{orderLabels[order.status]}</Tag></div><div className="order-card-body"><ProductSummary product={order.product}><p className="muted">买家 {<OriginalText>{order.buyer.nickname}</OriginalText>} · 卖家 {<OriginalText>{order.seller.nickname}</OriginalText>}</p></ProductSummary><div className="order-price"><span className="muted">成交金额</span><div className="price">¥{order.amount.toFixed(2)}</div><Link to={`/transactions/${order.id}`} className="order-open"><Button>查看订单</Button></Link></div></div></Card>))}</div> : <div className="order-empty"><div className="order-empty-content"><div className="order-empty-art" aria-hidden="true"><span className="order-empty-orbit" /><span className="order-empty-main"><SwapOutlined /></span><span className="order-empty-bubble"><MessageOutlined /></span><span className="order-empty-spark"><CheckCircleOutlined /></span></div><span className="order-empty-eyebrow">校园好物 · 轻松流转</span><h2>{filtered ? '暂时没有符合条件的交易' : '还没有交易记录'}</h2><p>{filtered ? '试试切换交易角色或订单状态，也可以清空筛选查看全部交易。' : '发现心仪的闲置，或为好物找到新主人。双方达成报价后，订单就会出现在这里。'}</p><Space wrap className="order-empty-actions">{filtered ? <Button type="primary" onClick={() => setParams({})}>清空筛选</Button> : <Link to="/market"><Button type="primary" icon={<ShopOutlined aria-hidden />}>去市场逛逛</Button></Link>}<Link to={role === 'seller' ? '/publish' : '/chat'}><Button>{role === 'seller' ? '发布一件闲置' : '查看我的聊天'}</Button></Link></Space></div></div>}{remote.value && remote.value.pagination.total > 0 && <Pagination className="order-pagination" current={page} pageSize={12} total={remote.value.pagination.total} showSizeChanger={false} onChange={(next) => { const updated = new URLSearchParams(params); updated.set('page', String(next)); setParams(updated) }} />}</Resource></div>
    <div className="order-guide" aria-label="交易流程提示"><div><span className="order-guide-icon"><MessageOutlined aria-hidden /></span><div><h3>先聊一聊</h3><p>沟通商品情况，确认报价与交易意向</p></div></div><div><span className="order-guide-icon"><AimOutlined aria-hidden /></span><div><h3>约在校内</h3><p>协商见面时间，双方确认同一份约定</p></div></div><div><span className="order-guide-icon"><CheckCircleOutlined aria-hidden /></span><div><h3>完成后再确认</h3><p>当面核实商品，双方完成后互相评价</p></div></div></div></div>
  </Page>)
}

export function OrderPage() {
  useLanguage()
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
  return localize(<Page title={`订单 #${id}`} extra={<Link to="/transactions">返回交易中心</Link>}><Resource {...remote}><Failure error={mutation.error} retry={remote.reload} />{item && <>
    <Card className="order-progress"><Steps size="small" status={['CANCELLED', 'DISPUTED'].includes(item.status) ? 'error' : undefined} current={item.status === 'COMPLETED' ? 3 : item.status === 'MEETUP_ARRANGED' ? 2 : 1} items={[{ title: '达成报价' }, { title: '安排见面' }, { title: '双方确认' }, { title: '完成交易' }]} /><div style={{ marginTop: 16 }}><Tag color="blue">{orderLabels[item.status]}</Tag><span className="muted">订单 #{item.id} · {displayDate(item.createdAt)}</span></div></Card>
    <div className="detail-columns"><div className="detail-sections"><Card title="商品信息"><ProductSummary product={item.product} /><div className="order-persons"><div><p className="muted">买家</p><Person person={item.buyer} /></div><div><p className="muted">卖家</p><Person person={item.seller} /></div></div></Card>
    <Card title="见面与交易操作">
      {item.meetup && <><Typography.Title level={5}>见面约定 · 版本 {item.meetup.version}</Typography.Title><Typography.Paragraph>{<CatalogText text={item.meetup.campusLocation} />} · {item.meetup.scheduledDate} · {item.meetup.timeSlotStart}–{item.meetup.timeSlotEnd}<br />{item.meetup.note && <CatalogText text={item.meetup.note} />}</Typography.Paragraph><Space wrap><Tag color={item.meetup.buyerConfirmed ? 'success' : undefined}>买家{item.meetup.buyerConfirmed ? '已确认' : '未确认'}</Tag><Tag color={item.meetup.sellerConfirmed ? 'success' : undefined}>卖家{item.meetup.sellerConfirmed ? '已确认' : '未确认'}</Tag></Space></>}
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
      {item.status === 'CANCELLED' && item.product.status === 'HIDDEN' && <Alert type="info" title="订单已取消，该商品已删除或下架，仍不在商城展示。" />}
      {mutable && !item.buyerConfirmedComplete && !item.sellerConfirmedComplete && <Space wrap style={{ marginTop: 16 }}><Input aria-label="取消原因" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="取消原因" maxLength={200} /><Popconfirm title="取消这笔订单？正常商品将恢复在售，已删除或下架的商品保持下架。" onConfirm={() => mutation.run(async () => { await api.cancelOrder({ path: { orderId }, body: { reason } }); remote.reload(); events.reload() })}><Button danger disabled={!reason.trim()} loading={mutation.busy}>取消订单</Button></Popconfirm></Space>}
    </Card><Card title="订单时间线"><Resource {...events}><Timeline items={events.value?.map((event) => ({ children: localize(<>{<CatalogText text={systemText(event.description, '订单状态已更新')} />}<br /><Typography.Text type="secondary">{displayDate(event.createdAt)}</Typography.Text></>) }))} /></Resource></Card></div><aside className="surface"><h2>订单信息</h2><Descriptions column={1} items={[{ key: 'price', label: '成交金额', children: <span className="price">¥{item.amount.toFixed(2)}</span> }, { key: 'status', label: '状态', children: orderLabels[item.status] }, { key: 'created', label: '创建时间', children: displayDate(item.createdAt) }]} /><p className="muted">请核实商品和见面信息，实际完成交易后再确认。买卖双方都确认后，订单才会完成。</p></aside></div>
  </>}</Resource></Page>)
}

export function MeetupPage() {
  useLanguage()
  const { id } = useParams()
  const remote = useRemote(`meetup-order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId: Number(id) }, signal })))
  const [form] = Form.useForm<MeetupWriteRequest>()
  const mutation = useMutation()
  const navigate = useNavigate()
  const attemptKey = useAttemptKey()
  useEffect(() => { if (remote.value?.meetup) form.setFieldsValue(remote.value.meetup) }, [remote.value, form])
  return localize(<Page title="安排见面" extra={<Link to={`/transactions/${id}`}>返回订单</Link>}><Resource {...remote}><div className="detail-columns"><div className="detail-sections">
    <Card title="当前约定">{remote.value?.meetup ? <Descriptions column={1} items={[{ key: 'location', label: '见面地点', children: <CatalogText text={remote.value.meetup.campusLocation} /> }, { key: 'time', label: '见面时间', children: `${remote.value.meetup.scheduledDate} ${remote.value.meetup.timeSlotStart}–${remote.value.meetup.timeSlotEnd}` }, { key: 'version', label: '版本', children: remote.value.meetup.version }]} /> : <Typography.Text type="secondary">尚未安排见面，请与对方沟通后填写约定。</Typography.Text>}</Card>
    <Card title="填写 / 修改约定"><Failure error={mutation.error} /><Alert type="info" title="请使用北京时间选择未来的开始时间；每次修改生成新版本，双方需要重新确认。" style={{ marginBottom: 16 }} /><Form form={form} layout="vertical" size="large" noValidate onFinish={(body) => void mutation.run(async () => { validateMeetupStart(body.scheduledDate, body.timeSlotStart); await api.saveMeetup({ path: { orderId: Number(id) }, body, headers: api.idempotencyHeaders(attemptKey(body)) }); navigate(`/transactions/${id}`) })}>
    <Form.Item name="campusLocation" label="校内见面地点" rules={[{ required: true, whitespace: true, max: 100 }]}><Input /></Form.Item>
    <Form.Item name="scheduledDate" label="日期" rules={[{ required: true }]}><Input type="date" min={campusToday()} /></Form.Item>
    <Space wrap><Form.Item name="timeSlotStart" label="开始时间" dependencies={['scheduledDate']} rules={[{ required: true }, { validator: async (_, value) => { validateMeetupStart(form.getFieldValue('scheduledDate'), value) } }]}><Input type="time" /></Form.Item><Form.Item name="timeSlotEnd" label="结束时间" dependencies={['timeSlotStart']} rules={[{ required: true }, { validator: async (_, value) => { validateMeetupEnd(form.getFieldValue('timeSlotStart'), value) } }]}><Input type="time" /></Form.Item></Space>
    <Form.Item name="note" label="备注"><Input.TextArea maxLength={500} /></Form.Item><Button type="primary" htmlType="submit" loading={mutation.busy} disabled={!remote.value || ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(remote.value.status)}>保存新约定</Button>
  </Form></Card></div><aside className="surface"><h2>交易商品</h2>{remote.value && <ProductSummary product={remote.value.product} />}<p className="muted">建议选择校内公共区域。修改约定后，请提醒对方确认最新版本。</p></aside></div></Resource></Page>)
}

export function ReviewPage() {
  useLanguage()
  const { id } = useParams()
  const remote = useRemote(`review-order-${id}`, (signal) => api.data(api.getOrder({ path: { orderId: Number(id) }, signal })))
  const mutation = useMutation()
  const [done, setDone] = useState(false)
  const attemptKey = useAttemptKey()
  return localize(<Page title="评价交易" subtitle="分享真实的交易体验" extra={<Link to={`/transactions/${id}`}>返回订单</Link>}><Resource {...remote}><Card className="review-card">{remote.value && <ProductSummary product={remote.value.product} />}<Failure error={mutation.error} />{done ? <Alert type="success" title="评价已保存。" /> : remote.value?.status !== 'COMPLETED' ? <Alert type="warning" title="双方完成交易后才可评价。" /> : <Form layout="vertical" onFinish={(values: Omit<ReviewWriteRequest, 'orderId'>) => void mutation.run(async () => { await api.createReview({ body: { ...values, orderId: Number(id) }, headers: api.idempotencyHeaders(attemptKey(values)) }); setDone(true) })}>
    {[['overall', '总体评价'], ['descriptionAccuracy', '描述准确度'], ['communication', '沟通体验'], ['punctuality', '守时情况']].map(([name, label]) => localize(<Form.Item key={name} name={name} label={label} rules={[{ required: true, type: 'number', min: 1, max: 5 }]}><Rate aria-label={label} /></Form.Item>))}
    <Form.Item name="comment" label="评价内容"><Input.TextArea maxLength={1000} /></Form.Item><Button type="primary" htmlType="submit" loading={mutation.busy}>提交评价</Button>
  </Form>}</Card></Resource></Page>)
}

const notificationGroups = ['全部', '消息', '报价', '匹配', '系统'] as const
type NotificationGroup = typeof notificationGroups[number]

function NotificationTabs({ value, onChange, counts }: { value: NotificationGroup; onChange: (value: NotificationGroup) => void; counts: Partial<Record<NotificationGroup, number>> }) {
  useLanguage()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const focusTab = (index: number) => {
    const next = (index + notificationGroups.length) % notificationGroups.length
    onChange(notificationGroups[next])
    tabs.current[next]?.focus()
  }
  return localize(<div className="notification-tabs" role="tablist" aria-label="通知分类">
    {notificationGroups.map((label, index) => {
      const selected = label === value
      return localize(<button
        key={label}
        ref={(element) => { tabs.current[index] = element }}
        type="button"
        role="tab"
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        className={`notification-tab${selected ? ' is-active' : ''}`}
        onClick={() => onChange(label)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); focusTab(index + 1) }
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); focusTab(index - 1) }
          else if (event.key === 'Home') { event.preventDefault(); focusTab(0) }
          else if (event.key === 'End') { event.preventDefault(); focusTab(notificationGroups.length - 1) }
        }}
      >{label}{counts[label] ? <span className="notification-tab-count" aria-hidden="true">{counts[label]}</span> : null}</button>)
    })}
  </div>)
}

// Each notification type keeps its own glyph and hue, so a glance tells what happened; tabs still group by the four families.
const NOTICE_KINDS: Record<Notification['type'], { icon: ReactNode; color: string }> = {
  MESSAGE: { icon: <MessageOutlined />, color: '#2F6BFF' },
  OFFER_RECEIVED: { icon: <TagOutlined />, color: '#12A877' },
  OFFER_ACCEPTED: { icon: <CheckCircleOutlined />, color: '#12A877' },
  OFFER_REJECTED: { icon: <TagOutlined />, color: '#7C8496' },
  MATCH_FOUND: { icon: <AimOutlined />, color: '#8B5CF6' },
  ORDER_STATUS_CHANGED: { icon: <SwapOutlined />, color: '#0E9BB8' },
  MEETUP_REMINDER: { icon: <CalendarOutlined />, color: '#0E9BB8' },
  REVIEW_REQUEST: { icon: <StarOutlined />, color: '#E8930C' },
  REPORT_RESULT: { icon: <FlagOutlined />, color: '#F07800' },
  ACCOUNT_ACTION: { icon: <SafetyCertificateOutlined />, color: '#E5383B' },
  APPEAL_RECEIVED: { icon: <AuditOutlined />, color: '#E0569E' },
  APPEAL_RESULT: { icon: <AuditOutlined />, color: '#E0569E' },
}
const dayKey = (value: Date) => `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`
function dayLabel(value: string) {
  const date = new Date(value), today = new Date()
  if (dayKey(date) === dayKey(today)) return '今天'
  if (dayKey(date) === dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1))) return '昨天'
  return new Intl.DateTimeFormat(dateLocale(), { month: 'long', day: 'numeric', weekday: 'short', ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }) }).format(date)
}
const clockTime = (value: string) => new Intl.DateTimeFormat(dateLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
const internalLink = (item: Notification) => item.link && /^\/(?!\/)/.test(item.link) ? item.link : undefined

export function NotificationsPage({ admin = false }: { admin?: boolean }) {
  useLanguage()
  const remote = useNotificationsResource()
  const mutation = useMutation()
  const navigate = useNavigate()
  const notifications = uniqueNotifications(remote.value ?? [])
  const [group, setGroup] = useState<NotificationGroup>('全部')
  const groupOf = (item: Notification): Exclude<NotificationGroup, '全部'> => item.type === 'MESSAGE' ? '消息' : item.type.startsWith('OFFER_') ? '报价' : item.type === 'MATCH_FOUND' ? '匹配' : '系统'
  const visible = notifications.filter((item) => group === '全部' || groupOf(item) === group)
  const unread = notifications.filter((item) => !item.read)
  const counts: Partial<Record<NotificationGroup, number>> = { 全部: unread.length }
  for (const item of unread) counts[groupOf(item)] = (counts[groupOf(item)] ?? 0) + 1
  const days: { key: string; label: string; items: Notification[] }[] = []
  for (const item of visible) {
    const key = dayKey(new Date(item.createdAt))
    if (days[days.length - 1]?.key !== key) days.push({ key, label: dayLabel(item.createdAt), items: [] })
    days[days.length - 1].items.push(item)
  }
  const openNotification = (item: Notification) => {
    void mutation.run(async () => {
      if (!item.read) { await api.markNotificationRead({ path: { notificationId: item.id } }); notifyNotificationsChanged() }
      const link = internalLink(item)
      if (link) navigate(link)
    })
  }
  const markRead = (item: Notification) => {
    if (item.read) return
    void mutation.run(async () => { await api.markNotificationRead({ path: { notificationId: item.id } }); notifyNotificationsChanged() })
  }
  const subtitle = remote.value ? unread.length ? t(`${unread.length} 条未读`) : t('没有未读通知') : undefined
  return localize(<Page title="通知" subtitle={subtitle} className="notifications-page" extra={<Button aria-label="全部已读" icon={<CheckOutlined />} loading={mutation.busy} onClick={() => void mutation.run(async () => { await api.markAllNotificationsRead(); notifyNotificationsChanged() })}>全部已读</Button>}><Failure error={mutation.error} /><div className="notification-list"><NotificationTabs value={group} onChange={setGroup} counts={counts} /><Resource {...remote}>
    {visible.length ? <div className="notification-rows" role="list">{days.map((day) => localize(<section key={day.key} className="notice-day" role="presentation">
      <h2 className="notice-day-label">{day.label}</h2>
      {day.items.map((item) => {
        const kind = NOTICE_KINDS[item.type] ?? { icon: <BellOutlined />, color: '#8B5CF6' }
        const title = systemText(item.title, systemText(item.type, '平台通知'))
        const link = internalLink(item)
        return localize(<article
          key={item.id}
          role="listitem"
          tabIndex={0}
          aria-label={`${t(title)}, ${displayDate(item.createdAt)}${item.read ? '' : t('，未读')}`}
          className={`notification-row${item.read ? '' : ' is-unread'}${link ? ' has-link' : ''}`}
          style={{ ['--nc' as string]: kind.color }}
          onClick={() => openNotification(item)}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openNotification(item) }
          }}
        >
          <span className="notification-icon" aria-hidden="true">{kind.icon}</span>
          <div className="notification-copy">
            <h3><CatalogText text={title} /></h3>
            {item.content ? <p><CatalogText text={systemText(item.content, item.content)} /></p> : null}
          </div>
          <time className="notification-time" dateTime={item.createdAt} title={displayDate(item.createdAt)}>{clockTime(item.createdAt)}</time>
          <div className="notification-actions">
            <Button type="text" size="small" className="notification-read" aria-label="标为已读" icon={<CheckOutlined />} disabled={item.read} onClick={(event) => { event.stopPropagation(); markRead(item) }}>标为已读</Button>
            {link ? <RightOutlined className="notification-go" aria-hidden="true" /> : <span className="notification-go" aria-hidden="true" />}
          </div>
        </article>)
      })}
    </section>))}</div> : <NoItems />}
  </Resource></div>{admin ? null : <p className="notification-foot"><Link to="/report">我的举报记录</Link><span aria-hidden="true">·</span><Link to="/account/decisions">账号处理记录与申诉</Link></p>}</Page>)
}
