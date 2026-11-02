import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { App, Avatar, Button, Input, Modal, Result, Skeleton, Tag } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../sdk'
import type { AdminDashboard, AdminTodoItem } from '../sdk'
import { errorText } from '../live/common'
import { useAttemptKey } from '../live/idempotency'
import { useSession } from '../live/session'
import { Glyph, categoryOf } from '../theme/brand'
import { Bars, CountUp, Donut, Heatmap, Rings, SemiDonut, Sparkline, TrendChart } from './charts'
import { change, clock, downloadCsv, fmt, ratio, waited } from './format'
import { Icon, type IconName } from './icons'
import { useConsole } from './AdminLayout'
import { auditEventLabels, categoryLabels, highRiskReasons, orderStatusGroups, orderStatusLabels, reportReasonLabels, resultStatusLabels, targetTypeLabels } from './labels'

const WEEK = '日一二三四五六'
const REASON_COLORS: Record<string, string> = { FAKE_PRODUCT: '#F53F3F', DESCRIPTION_MISMATCH: '#eb6834', SPAM: '#eda100', ABNORMAL_PRICE: '#2F6BFF', HARASSMENT: '#e87ba4', VIOLATION: '#8659F5' }

function Card({ area, tint, icon, title, sub, extra, children, className = '', style }: { area: string; tint: string; icon: IconName; title: string; sub?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`adm-card a-${area} ${className}`} style={{ ['--tint' as string]: tint, ...style }} aria-label={title}>
    <header className="adm-card-hd"><h2><span className="adm-hic"><Icon name={icon} size={15} /></span>{title}</h2>{sub && <small className="adm-card-sub">{sub}</small>}{extra}</header>
    {children}
  </section>
}

function Delta({ value }: { value: ReturnType<typeof change> }) {
  return <span className={`adm-delta ${value.up ? 'up' : 'down'}`}>{value.text}</span>
}

function Empty({ children }: { children: ReactNode }) { return <p className="adm-empty">{children}</p> }

function targetText(item: AdminTodoItem) {
  const type = targetTypeLabels[item.targetType] ?? '对象'
  return item.targetTitle ? `${type}「${item.targetTitle}」` : `${type} #${item.targetId}`
}

export function DashboardPage() {
  const { dashboard, days, setDays } = useConsole()
  const data = dashboard.value
  if (!data) {
    if (dashboard.error) return <Result status="warning" title="仪表盘数据暂时读取失败" subTitle={errorText(dashboard.error)} extra={<Button type="primary" onClick={dashboard.reload}>重新读取</Button>} />
    return <div className="adm-loading" role="status" aria-label="正在读取仪表盘"><Skeleton active paragraph={{ rows: 10 }} /></div>
  }
  return <Board data={data} days={days} setDays={setDays} refreshing={dashboard.loading} reload={dashboard.reload} error={dashboard.error} />
}

function Board({ data, days, setDays, refreshing, reload, error }: { data: AdminDashboard; days: 7 | 30; setDays: (days: 7 | 30) => void; refreshing: boolean; reload: () => void; error?: unknown }) {
  const navigate = useNavigate()
  const user = useSession((state) => state.user)
  const now = Date.parse(data.asOf)
  const hour = new Date().getHours()
  const greeting = hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const highRisk = data.todo.filter((item) => item.kind === 'DISPUTE' || (item.reason && highRiskReasons.has(item.reason))).length
  const labels = data.trend.map((point, i) => i === data.trend.length - 1 ? '今天' : `${Number(point.date.slice(5, 7))}/${Number(point.date.slice(8))}`)
  const fullLabels = data.trend.map((point) => `${point.date} 周${WEEK[new Date(`${point.date}T00:00:00+08:00`).getDay()]}`)
  const exportCsv = () => downloadCsv(`CampusLoop-运营概览-近${days}天-${data.trend[data.trend.length - 1]?.date}.csv`, [
    ['日期（北京时间）', '新增商品', '新增订单', '完成订单'],
    ...data.trend.map((point) => [point.date, point.newProducts, point.newOrders, point.completedOrders]),
    [],
    ['指标', '数值'],
    ['在售商品（与市场列表一致）', data.products.onSale], ['人工下架中', data.products.moderationHeld],
    ['平台用户', data.users.total], ['已禁用用户', data.users.disabled],
    ['待处理举报', data.pending.openReports], ['争议订单', data.pending.disputedOrders],
    ['数据时间', new Date(data.asOf).toLocaleString('zh-CN', { hour12: false })],
  ])
  return <div className={`adm-dash ${refreshing ? 'is-refreshing' : ''}`}>
    <div className="adm-head">
      <div>
        <h1>{greeting}，{user?.nickname ?? '管理员'}</h1>
        <p>{data.pending.total ? <>还有 <b className="adm-red">{data.pending.total}</b> 项待处理{highRisk > 0 && <>，其中 <b className="adm-red">{highRisk}</b> 项高风险</>}</> : '暂无待处理事项'} · 数据更新于 {clock(data.asOf)}（北京时间）</p>
      </div>
      <div className="adm-head-tools">
        <div className="adm-seg" role="radiogroup" aria-label="统计周期">
          {([7, 30] as const).map((value) => <button key={value} type="button" role="radio" aria-checked={days === value} className={days === value ? 'is-on' : ''} onClick={() => setDays(value)}>近 {value} 天</button>)}
        </div>
        <Button className="adm-btn" icon={<Icon name="refresh" size={15} />} onClick={reload} loading={refreshing}>刷新</Button>
        <Button className="adm-btn" icon={<Icon name="download" size={15} />} onClick={exportCsv}>导出 CSV</Button>
      </div>
    </div>
    {Boolean(error) && <p className="adm-stale" role="status">刷新失败，当前显示的是 {clock(data.asOf)} 的数据。{errorText(error)}</p>}

    <div className="adm-bento">
      <Card area="hero" tint="#2F6BFF" icon="goods" title="商品增长" sub={`近 ${days} 天 · 每日`} className="adm-hero"
        extra={<div className="adm-legend-inline"><span><i style={{ background: 'var(--adm-s1)' }} />新增商品</span><span><i style={{ background: 'var(--adm-s2)' }} />新增订单</span></div>}>
        <div className="adm-hero-stats">
          <div className="adm-hero-big"><b><CountUp value={data.products.newToday} /></b><div><span>今日新增商品</span><span>较昨日 <Delta value={change(data.products.newToday, data.products.newYesterday)} /></span></div></div>
          <div className="adm-mini" style={{ ['--mc' as string]: 'var(--adm-s1)' }}><small>近 {days} 天新增</small><b>{fmt(data.products.newInRange)}</b><Delta value={change(data.products.newInRange, data.products.newPreviousRange)} /></div>
          <div className="adm-mini" style={{ ['--mc' as string]: 'var(--adm-s2)' }}><small>近 {days} 天下单</small><b>{fmt(data.orders.newInRange)}</b><Delta value={change(data.orders.newInRange, data.orders.newPreviousRange)} /></div>
          <div className="adm-mini" style={{ ['--mc' as string]: '#8659F5' }}><small>在售商品</small><b>{fmt(data.products.onSale)}</b><span className="adm-mini-note">与市场一致</span></div>
        </div>
        <TrendChart labels={labels} fullLabels={fullLabels} height={236} caption={`近 ${days} 天每日新增商品与新增订单`}
          series={[{ name: '新增商品', color: 'var(--adm-s1)', values: data.trend.map((point) => point.newProducts) }, { name: '新增订单', color: 'var(--adm-s2)', values: data.trend.map((point) => point.newOrders) }]} />
      </Card>

      <section className={`adm-card adm-kpi a-pend ${data.pending.total ? 'is-urgent' : ''}`} style={{ ['--g1' as string]: '#FF6A3D', ['--g2' as string]: '#F5365C', ['--tint' as string]: '#FF6A3D' }} aria-label="待处理事项">
        <div className="adm-kpi-top"><span className="adm-kpi-ic"><Icon name="alert" /></span>待处理事项</div>
        <div className="adm-kpi-val"><CountUp value={data.pending.total} /><small>项</small></div>
        <div className="adm-stack" aria-hidden="true">
          {data.pending.total === 0 ? <i style={{ flexGrow: 1, background: 'var(--adm-well)' }} /> : <>
            <i style={{ flexGrow: data.pending.openReports, background: '#FF7D00' }} title={`待处理举报 ${data.pending.openReports}`} />
            <i style={{ flexGrow: data.pending.disputedOrders, background: '#F53F3F' }} title={`争议订单 ${data.pending.disputedOrders}`} />
          </>}
        </div>
        <div className="adm-kpi-break"><span><i style={{ background: '#FF7D00' }} />举报 {data.pending.openReports}</span><span><i style={{ background: '#F53F3F' }} />争议订单 {data.pending.disputedOrders}</span><span><i style={{ background: '#9AA0AE' }} />人工下架 {data.products.moderationHeld}</span></div>
        {data.pending.total > 0 && <Button className="adm-go" onClick={() => navigate(data.pending.openReports ? '/admin/reports' : '/admin/orders?status=DISPUTED')}>去处理 →</Button>}
      </section>

      <section className="adm-card adm-kpi a-ord" style={{ ['--g1' as string]: '#0FB5A8', ['--g2' as string]: '#2BD39A', ['--tint' as string]: '#0FB5A8' }} aria-label="今日订单">
        <div className="adm-kpi-top"><span className="adm-kpi-ic"><Icon name="order" /></span>今日订单</div>
        <div className="adm-kpi-val"><CountUp value={data.orders.newToday} delay={60} /></div>
        <div className="adm-kpi-cmp">较昨日 <Delta value={change(data.orders.newToday, data.orders.newYesterday)} /></div>
        <Sparkline values={data.trend.slice(-10).map((point) => point.newOrders)} color="#0FB5A8" />
      </section>

      <section className="adm-card adm-kpi a-usr" style={{ ['--g1' as string]: '#7B5CFF', ['--g2' as string]: '#C15CFF', ['--tint' as string]: '#7B5CFF' }} aria-label="平台用户">
        <div className="adm-kpi-top"><span className="adm-kpi-ic"><Icon name="user" /></span>平台用户</div>
        <div className="adm-kpi-val"><CountUp value={data.users.total} delay={120} /></div>
        <div className="adm-kpi-cmp">近 {days} 天 +{data.users.newInRange} <Delta value={change(data.users.newInRange, data.users.newPreviousRange)} /></div>
        <div className="adm-kpi-foot">已禁用 {data.users.disabled} 个账号</div>
      </section>




      <h2 className="adm-sec a-l1"><span>数据洞察</span><small>与前台市场同一口径 · 北京时间</small></h2>
      <CategoryCard data={data} />

      <Card area="semi" tint="#1baf7a" icon="pie" title="订单状态" sub={`近 ${days} 天下单 · ${data.orderStatuses.reduce((sum, item) => sum + item.count, 0)} 单`}>
        <OrderStatusChart data={data} />
      </Card>

      <Card area="bars" tint="#eb6834" icon="flag" title="举报原因" sub={`近 ${days} 天`} extra={<Link className="adm-more" to="/admin/reports">举报处理 ›</Link>}>
        <Bars empty={<Empty>近 {days} 天没有收到举报。</Empty>} items={data.reportReasons.slice(0, 6).map((item) => ({ label: reportReasonLabels[item.key as keyof typeof reportReasonLabels] ?? item.key, value: item.count, color: REASON_COLORS[item.key] ?? 'var(--adm-gray)' }))} />
      </Card>

      <Card area="heat" tint="#8659F5" icon="clock" title="发布活跃时段" sub={`近 ${data.postingHeatmap.days} 天 · 按小时 · 北京时间`}>
        <Heatmap cells={data.postingHeatmap.cells} days={data.postingHeatmap.days} />
      </Card>

      <h2 className="adm-sec a-l2"><span>待办与处理</span></h2>
      <TodoCard data={data} now={now} reload={reload} />

      <Card area="hlth" tint="#7B5CFF" icon="shield" title="平台健康度" sub={`近 ${days} 天`}>
        <Rings caption="平台健康度" rings={[
          { label: '举报处理率', value: ratio(data.health.reportsHandled), color: 'var(--adm-s1)', hint: `${data.health.reportsHandled.numerator}/${data.health.reportsHandled.denominator} 条举报已处理` },
          { label: '24 小时内处理', value: ratio(data.health.reportsHandledWithin24h), color: '#7B5CFF', hint: `已处理中 ${data.health.reportsHandledWithin24h.numerator} 条在 24 小时内完成` },
          { label: '订单完成率', value: ratio(data.health.ordersCompleted), color: '#1baf7a', hint: `已结束 ${data.health.ordersCompleted.denominator} 单，完成 ${data.health.ordersCompleted.numerator} 单` },
        ]} />
      </Card>

      <Card area="feed" tint="#14C9C9" icon="order" title="最新订单" sub={`更新于 ${clock(data.asOf)}`} extra={<Link className="adm-more" to="/admin/orders">订单管理 ›</Link>}>
        {data.recentOrders.length ? <ul className="adm-feed">{data.recentOrders.slice(0, 4).map((order) => {
          const meta = categoryOf(order.category)
          return <li key={order.id}>
            <span className="adm-feed-ic" style={{ ['--fc' as string]: meta.color }}><Glyph name={meta.glyph} size={20} /></span>
            <div><p>{order.productTitle}</p><small>{order.buyerNickname} → {order.sellerNickname} · {clock(order.createdAt)}</small></div>
            <div className="adm-feed-rt"><b>¥{order.amount.toFixed(2)}</b><Tag className={`adm-st st-${order.status}`}>{orderStatusLabels[order.status]}</Tag></div>
          </li>
        })}</ul> : <Empty>还没有订单。买家接受报价后，订单会出现在这里。</Empty>}
      </Card>

      <Card area="risk" tint="#e87ba4" icon="user" title="被举报较多的用户" sub={`近 ${days} 天`} extra={<Link className="adm-more" to="/admin/users">用户管理 ›</Link>}>
        {data.riskUsers.length ? <ul className="adm-risky">{data.riskUsers.map((person) => {
          const top = data.riskUsers[0].reportCount
          return <li key={person.id}>
            <Avatar size={34} src={person.avatar}>{person.nickname.slice(0, 1)}</Avatar>
            <div><p>{person.nickname} {person.status === 'DISABLED' && <Tag color="red">已禁用</Tag>}</p><small>被举报 {person.reportCount} 次 · 待处理 {person.openReportCount} · 最近 {clock(person.lastReportedAt)}</small></div>
            <div className="adm-risky-bar" style={{ ['--w' as string]: `${(person.reportCount / top) * 100}%`, ['--sc' as string]: person.openReportCount ? 'var(--adm-red)' : 'var(--adm-orange)' }}><i /></div>
          </li>
        })}</ul> : <Empty>近 {days} 天没有用户或其商品被举报。</Empty>}
      </Card>

      <Card area="note" tint="#3B8BFF" icon="log" title="最近处理记录" extra={<Link className="adm-more" to="/admin/audit">操作日志 ›</Link>}>
        {data.recentDecisions.length ? <ul className="adm-notes">{data.recentDecisions.map((row) => {
          const kind = row.event.includes('product') ? 'goods' : row.event.includes('user') ? 'user' : 'flag'
          const color = row.event === 'admin_user_disabled' || row.resultStatus === 'HIDDEN' ? 'var(--adm-red)' : row.resultStatus === 'REJECTED' ? 'var(--adm-orange)' : 'var(--adm-green)'
          return <li key={row.id}>
            <span className="adm-note-ic" style={{ ['--nc' as string]: color }}><Icon name={kind} size={16} /></span>
            <div><p>{auditEventLabels[row.event] ?? row.event}{row.resultStatus && <> · {resultStatusLabels[row.resultStatus] ?? row.resultStatus}</>}{row.subject && <span className="adm-note-sub"> {row.subject.type === 'PRODUCT' ? '商品' : row.subject.type === 'REPORT' ? '举报' : '用户'} #{row.subject.id}</span>}</p><small>{row.actor?.nickname ?? '管理员'}：{row.reason ?? '未填写理由'}</small></div>
            <time>{clock(row.createdAt)}</time>
          </li>
        })}</ul> : <Empty>还没有人工处理记录。下架商品、处理举报或禁用账号后会显示在这里。</Empty>}
      </Card>

    </div>
  </div>
}

function CategoryCard({ data }: { data: AdminDashboard }) {
  const slices = useMemo(() => {
    // Six named categories in the storefront's own colours and glyphs; the tail folds into one neutral slice.
    const top = data.categories.slice(0, 6).map((item) => {
      const meta = categoryOf(item.key)
      return { key: item.key, label: categoryLabels[item.key] ?? item.key, value: item.count, color: meta.color, icon: <Glyph name={meta.glyph} size={15} /> }
    })
    const rest = data.categories.slice(6).reduce((sum, item) => sum + item.count, 0)
    return rest ? [...top, { key: '__rest', label: `其余 ${data.categories.length - 6} 类`, value: rest, color: 'var(--adm-rest)', icon: <Icon name="grid" size={14} /> }] : top
  }, [data.categories])
  const lead = data.categories[0]
  return <Card area="cat" tint="#eda100" icon="pie" title="在售商品分类" sub={`共 ${fmt(data.products.onSale)} 件`} extra={<Link className="adm-more" to="/market">去市场看看 ›</Link>}>
    {slices.length ? <>
      <Donut slices={slices} size={216} centerLabel="在售商品" caption="在售商品分类占比" />
      {lead && <p className="adm-insight"><b>{categoryLabels[lead.key] ?? lead.key}</b> 在售最多，占 {((lead.count / Math.max(1, data.products.onSale)) * 100).toFixed(1)}%。统计口径与市场列表相同。</p>}
    </> : <Empty>市场上暂时没有在售商品。</Empty>}
  </Card>
}

function OrderStatusChart({ data }: { data: AdminDashboard }) {
  const counts = new Map(data.orderStatuses.map((item) => [item.key, item.count]))
  const slices = orderStatusGroups.map((group) => ({ key: group.key, label: group.label, color: group.color, value: group.statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0) }))
  const total = slices.reduce((sum, item) => sum + item.value, 0)
  if (!total) return <Empty>这段时间还没有新订单。</Empty>
  const done = slices.find((item) => item.key === 'done')?.value ?? 0
  return <SemiDonut slices={slices} caption="订单状态分布" centerValue={`${((done / total) * 100).toFixed(1)}%`} centerLabel="已完成占比" />
}

const QUICK_NOTES: Record<'RESOLVED' | 'REJECTED', string[]> = {
  RESOLVED: ['已核实并处理', '已下架相关商品', '已提醒对方规范交易'],
  REJECTED: ['证据不足', '未发现违规', '重复举报'],
}

function TodoCard({ data, now, reload }: { data: AdminDashboard; now: number; reload: () => void }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const attemptKey = useAttemptKey()
  const [decision, setDecision] = useState<{ item: AdminTodoItem; resolution: 'RESOLVED' | 'REJECTED' }>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  const close = () => { setDecision(undefined); setNote(''); setFailure(undefined) }
  const submit = async () => {
    if (!decision || !note.trim()) return
    const body = { resolution: decision.resolution, note: note.trim() }
    setBusy(true); setFailure(undefined)
    try {
      await api.data(api.resolveReport({ path: { reportId: decision.item.id }, body, headers: api.idempotencyHeaders(attemptKey({ reportId: decision.item.id, body })) }))
      message.success(decision.resolution === 'RESOLVED' ? '举报已处理，结果已通知举报人并记入操作日志' : '举报已驳回，说明已通知举报人并记入操作日志')
      close(); reload()
    } catch (error) { setFailure(errorText(error)) } finally { setBusy(false) }
  }
  return <Card area="task" tint="#F53F3F" icon="check" title="待办任务" sub="最早提交的排在前面 · 等待超过 24 小时标红"
    extra={<div className="adm-legend-inline"><span className="adm-pill p-orange">举报</span><span className="adm-pill p-red">高风险 / 争议</span><Link className="adm-more" to="/admin/reports">全部举报 ›</Link></div>}>
    {data.todo.length ? <div className="adm-table-wrap"><table className="adm-table">
      <thead><tr><th>类型</th><th>对象与原因</th><th>提交人</th><th>等待</th><th>操作</th></tr></thead>
      <tbody>{data.todo.map((item) => {
        const risky = item.kind === 'DISPUTE' || Boolean(item.reason && highRiskReasons.has(item.reason))
        const wait = waited(item.createdAt, now)
        return <tr key={`${item.kind}-${item.id}`} className={risky ? 'is-risk' : ''}>
          <td><span className={`adm-pill ${risky ? 'p-red' : 'p-orange'}`}>{item.kind === 'DISPUTE' ? '交易争议' : '用户举报'}</span></td>
          <td className="adm-cell-title"><span title={targetText(item)}>{targetText(item)}</span><small>{item.kind === 'DISPUTE' ? `订单 #${item.id}` : reportReasonLabels[item.reason as keyof typeof reportReasonLabels] ?? '其他原因'}</small></td>
          <td className="adm-muted">{item.submittedBy ?? '—'}</td>
          <td className={wait.late ? 'adm-late' : 'adm-muted'}>{wait.text}{wait.late && ' · 超时'}</td>
          <td><div className="adm-ops">{item.kind === 'REPORT' ? <>
            <button type="button" className="ok" onClick={() => setDecision({ item, resolution: 'RESOLVED' })}>处理完成</button>
            <button type="button" className="no" onClick={() => setDecision({ item, resolution: 'REJECTED' })}>驳回</button>
            <button type="button" onClick={() => navigate('/admin/reports')}>详情</button>
          </> : <button type="button" onClick={() => navigate(`/admin/orders?query=%23${item.id}`)}>查看订单</button>}</div></td>
        </tr>
      })}</tbody>
    </table></div> : <div className="adm-clear"><span><Icon name="check" size={22} /></span><b>待办已清空</b><small>新的举报和交易争议会第一时间出现在这里。</small></div>}
    <Modal open={Boolean(decision)} title={decision?.resolution === 'RESOLVED' ? '确认处理完成' : '驳回举报'} onCancel={close} okText="确认" cancelText="取消"
      okButtonProps={{ disabled: !note.trim(), loading: busy, danger: decision?.resolution === 'REJECTED' }} onOk={() => void submit()} destroyOnHidden>
      {decision && <>
        <p className="adm-modal-sub">举报 #{decision.item.id} · {targetText(decision.item)} · {reportReasonLabels[decision.item.reason as keyof typeof reportReasonLabels] ?? '其他原因'}</p>
        <div className="adm-chips-row">{QUICK_NOTES[decision.resolution].map((text) => <button type="button" key={text} className={note.startsWith(text) ? 'is-on' : ''} onClick={() => setNote(`${text}。`)}>{text}</button>)}</div>
        <Input.TextArea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={4} placeholder="处理说明（必填）：会发给举报人，并写入操作日志" aria-label="处理说明" />
        {failure && <p className="adm-modal-error" role="alert">{failure}</p>}
        <p className="adm-modal-note">只改变举报状态，不会自动下架商品或禁用账号；需要处罚请在商品治理或用户管理中单独操作。</p>
      </>}
    </Modal>
  </Card>
}
