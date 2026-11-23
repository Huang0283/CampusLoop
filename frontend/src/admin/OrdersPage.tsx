import { localize, LocalizedText, OriginalText } from '../i18n/Localize'
import { dateLocale, t, useLanguage } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useState } from 'react'
import { Alert, App, Button, Descriptions, Dropdown, Image, Input, Pagination, Popconfirm, Select, Space, Table, Tag, Timeline } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../sdk'
import type { Order, OrderStatus } from '../sdk'
import { errorText, Failure, NoItems, Resource, useMutation, useRemote } from '../live/common'
import { categoryLabels, orderStatusLabels } from './labels'
import { clock, downloadCsv } from './format'
import { Icon } from './icons'
import { DetailDialog } from '../live/AdminPages'

const STATUSES = Object.keys(orderStatusLabels) as OrderStatus[]
const EXPORT_LIMIT = 2000

export function OrdersPage() {
  useLanguage()
  const { message } = App.useApp()
  const [params, setParams] = useSearchParams()
  const query = params.get('query') ?? ''
  const status = (STATUSES as string[]).includes(params.get('status') ?? '') ? params.get('status') as OrderStatus : undefined
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [selected, setSelected] = useState<Order>()
  const [exporting, setExporting] = useState(false)
  const remote = useRemote(`admin-orders-${page}-${status}-${query}`, (signal) => api.data(api.adminListOrders({ signal, query: { page, pageSize: 20, status, query: query || undefined } })))
  const update = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params)
    Object.entries(next).forEach(([key, value]) => { if (value) merged.set(key, value); else merged.delete(key) })
    // Keep URL-backed input synchronous so fast typing and Chinese input retain every character.
    setParams(merged, { replace: true, flushSync: true }); setSelected(undefined)
  }
  const exportAll = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setExporting(true)
    try {
      const rows: Order[] = []
      for (let current = 1; rows.length < EXPORT_LIMIT; current++) {
        const result = await api.data(api.adminListOrders({ query: { page: current, pageSize: 100, status, query: query || undefined } }))
        rows.push(...result.items)
        if (rows.length >= result.pagination.total || !result.items.length) break
      }
      const filename = t(`CampusLoop-订单-${new Date().toISOString().slice(0, 10)}.${format}`)
      const table = [
        ['订单号', '商品', '分类', '买家', '卖家', '成交价', '状态', '下单时间', '最近更新'].map(t),
        ...rows.map((order) => [order.id, order.product.title, t(categoryLabels[order.product.category] ?? order.product.category), order.buyer.nickname, order.seller.nickname, order.amount, t(orderStatusLabels[order.status]), new Date(order.createdAt).toLocaleString(dateLocale(), { hour12: false, timeZone: 'Asia/Shanghai' }), new Date(order.updatedAt).toLocaleString(dateLocale(), { hour12: false, timeZone: 'Asia/Shanghai' })]),
      ]
      if (format === 'csv') downloadCsv(filename, table)
      else await (await import('./workbook')).exportOrdersWorkbook(filename, table,
        `${t('搜索订单')}：${query || t('全部')} · ${t('订单状态')}：${status ? t(orderStatusLabels[status]) : t('全部状态')} · ${t('北京时间')}`)
      message.success(<LocalizedText>{t(`已导出 ${rows.length} 条订单${rows.length >= EXPORT_LIMIT ? t(`（单次最多 ${EXPORT_LIMIT} 条，请缩小筛选范围）`) : ''}`)}</LocalizedText>)
    } catch (error) { message.error(errorText(error)) } finally { setExporting(false) }
  }
  return localize(<div className="adm-section">
    <div className="adm-head"><div><h1>订单管理</h1><p>查看全平台订单与历史；争议订单须核实双方交付及线下款项后处理。</p></div></div>
    <div className="adm-card adm-plain">
      <Space wrap className="adm-filters">
        <Input.Search aria-label="搜索订单" placeholder="订单号、商品或买卖双方关键词" value={query} allowClear onChange={(event) => update({ query: event.target.value || undefined, page: undefined })} onSearch={(value) => update({ query: value.trim() || undefined, page: undefined })} style={{ width: 280 }} />
        <Select virtual={false} aria-label="订单状态" placeholder="全部状态" allowClear value={status} style={{ width: 160 }} onChange={(value) => update({ status: value, page: undefined })} options={STATUSES.map((value) => ({ value, label: orderStatusLabels[value] }))} />
        <Button onClick={remote.reload} icon={<Icon name="refresh" size={15} />}>刷新</Button>
        <Button onClick={() => void exportAll()} loading={exporting} icon={<Icon name="download" size={15} />}>导出 Excel</Button>
        <Dropdown trigger={['click']} menu={{ items: [{ key: 'csv', label: t('导出 CSV') }], onClick: () => void exportAll('csv') }}><Button aria-label="其他导出格式" disabled={exporting}>···</Button></Dropdown>
      </Space>
      <p className="adm-orders-search-note">支持订单号、商品名称、买卖双方昵称或邮箱；多个关键词用空格分隔，输入 #6024 精确查找订单。{remote.value && <span>{t(`共 ${remote.value.pagination.total} 条订单`)}</span>}</p>
      <Resource {...remote}>
        {remote.value?.items.length === 0 && <NoItems filtered={Boolean(query || status)} />}
        {Boolean(remote.value?.items.length) && <Table rowKey="id" pagination={false} scroll={{ x: 900 }} dataSource={remote.value?.items} columns={[
          { title: '订单号', key: 'id', render: (_, order) => localize(<span className="adm-mono">#{order.id}</span>) },
          { title: '商品', key: 'product', render: (_, order) => localize(<Space>{order.product.images[0] && <Image src={order.product.images[0]} width={44} height={40} style={{ objectFit: 'cover', borderRadius: 8 }} alt={order.product.title} preview={false} />}<span className="adm-ellipsis">{<CatalogText text={order.product.title} />}</span></Space>) },
          { title: '买家 → 卖家', key: 'people', render: (_, order) => <OriginalText>{`${order.buyer.nickname} → ${order.seller.nickname}`}</OriginalText> },
          { title: '成交价', key: 'amount', align: 'right', render: (_, order) => localize(<b className="adm-mono">¥{order.amount.toFixed(2)}</b>) },
          { title: '状态', key: 'status', render: (_, order) => localize(<Tag className={`adm-st st-${order.status}`}>{orderStatusLabels[order.status]}</Tag>) },
          { title: '下单时间', key: 'time', render: (_, order) => clock(order.createdAt) },
          { title: '操作', key: 'action', render: (_, order) => localize(<Button onClick={() => setSelected(order)}>查看订单 #{order.id}</Button>) },
        ]} />}
        {remote.value && remote.value.pagination.total > 20 && <Pagination className="adm-pager" current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={(next) => update({ page: String(next) })} />}
      </Resource>
    </div>
    <DetailDialog key={selected?.id ?? 'closed'} title={selected ? `订单 #${selected.id}` : ''} open={Boolean(selected)} onClose={() => setSelected(undefined)}>
      {selected && <>
        {selected.status === 'DISPUTED' && <Alert type="warning" showIcon title="该订单处于争议中" description="请核对双方交付与付款凭证，确认已协商取消后再处理。平台未接入支付，此操作不会退款或强制确认成交。" style={{ marginBottom: 16 }} />}
        <Descriptions column={1} bordered items={[
          { key: 'product', label: '商品', children: <Link to={`/product/${selected.product.id}`} target="_blank">{<CatalogText text={selected.product.title} />}</Link> },
          { key: 'category', label: '分类', children: categoryLabels[selected.product.category] ?? selected.product.category },
          { key: 'buyer', label: '买家', children: <OriginalText>{`${selected.buyer.nickname}（#${selected.buyer.id}）`}</OriginalText> },
          { key: 'seller', label: '卖家', children: <OriginalText>{`${selected.seller.nickname}（#${selected.seller.id}）`}</OriginalText> },
          { key: 'amount', label: '成交价', children: `¥${selected.amount.toFixed(2)}` },
          { key: 'status', label: '状态', children: orderStatusLabels[selected.status] },
          { key: 'confirm', label: '完成确认', children: <>{t('买家')}：{t(selected.buyerConfirmedComplete ? '已确认' : '未确认')} · {t('卖家')}：{t(selected.sellerConfirmedComplete ? '已确认' : '未确认')}</> },
          { key: 'meetup', label: '见面约定', children: selected.meetup ? <><OriginalText>{selected.meetup.campusLocation}</OriginalText> · {selected.meetup.scheduledDate} {selected.meetup.timeSlotStart.slice(0, 5)}–{selected.meetup.timeSlotEnd.slice(0, 5)} ({t(selected.meetup.buyerConfirmed && selected.meetup.sellerConfirmed ? '双方已确认' : '待双方确认')})</> : '尚未约定' },
          { key: 'created', label: '下单时间', children: new Date(selected.createdAt).toLocaleString(dateLocale(), { hour12: false }) },
          { key: 'updated', label: '最近更新', children: new Date(selected.updatedAt).toLocaleString(dateLocale(), { hour12: false }) },
        ]} />
        <DisputeReview key={`${selected.id}-${selected.version}`} order={selected} onChanged={(order) => { setSelected(order); remote.reload() }} />
      </>}
    </DetailDialog>
  </div>)
}

function DisputeReview({ order, onChanged }: { order: Order; onChanged: (order: Order) => void }) {
  useLanguage()
  const history = useRemote(`admin-order-events-${order.id}-${order.version}`, signal => api.data(api.adminListOrderEvents({ signal, path: { orderId: order.id } })))
  const mutation = useMutation()
  const [reason, setReason] = useState('')
  return localize(<div style={{ marginTop: 20 }}>
    <h3>订单时间线</h3><Resource {...history}><Timeline items={history.value?.map(event => ({ children: <><OriginalText>{event.description}</OriginalText><br />{clock(event.createdAt)}</> }))} /></Resource>
    {order.status === 'DISPUTED' && <><Failure error={mutation.error} />
      <label htmlFor="dispute-reason">核实结论与取消原因</label><Input.TextArea id="dispute-reason" aria-label="核实结论与取消原因" value={reason} onChange={event => setReason(event.target.value)} maxLength={200} rows={3} style={{ margin: '8px 0' }} />
      <Popconfirm title="已核对双方交付与线下款项处理，确认取消争议订单？" onConfirm={() => mutation.run(async () => { const saved = await api.data(api.adminCancelDisputedOrder({ path: { orderId: order.id }, body: { expectedVersion: order.version!, reason: reason.trim() } })); onChanged(saved) })}><Button danger disabled={!reason.trim() || !order.version} loading={mutation.busy}>核实后取消订单</Button></Popconfirm>
    </>}
  </div>)
}
