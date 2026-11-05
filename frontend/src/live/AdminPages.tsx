import { localize, OriginalText } from '../i18n/Localize'
import { t, useLanguage } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Alert, Button, Descriptions, Image, Input, Modal, Pagination, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import { Form } from '../i18n/Form'
import type { ReactNode } from 'react'
import * as api from '../sdk'
import type { AdminProduct, AdminReport, ReportStatus, UserProfile } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { useAttemptKey } from './idempotency'
import { Person } from './Presentation'
import { PrivateMediaImage } from './PrivateMediaImage'
import { AccountDecisionControls } from '../admin/AccountDecisionControls'
import { reportReasonLabels } from './reportReasons'
import { productStatusLabels, accountStatusLabels, reportStatusLabels, roleLabels, targetTypeLabels, displayDate, systemText, riskClueText } from './display'

function useDrawerFocusReturn(open: boolean) {
  const triggerRef = useRef<HTMLElement>(null)
  const previousOpen = useRef(open)
  const capture = (element: HTMLElement) => {
    triggerRef.current = element
  }

  useEffect(() => {
    const closing = previousOpen.current && !open
    previousOpen.current = open
    if (!closing) return

    const frame = window.requestAnimationFrame(() => {
      const trigger = triggerRef.current
      if (trigger?.isConnected && !trigger.matches(':disabled')) {
        trigger.focus({ preventScroll: true })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  return { capture }
}

function keepDrawerFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab' || event.defaultPrevented
    || event.altKey || event.ctrlKey || event.metaKey) return

  const panel = event.currentTarget
  const active = panel.ownerDocument.activeElement
  // A nested portal, such as image preview, manages its own focus.
  if (!active || !panel.contains(active)) return

  const selector = [
    'button', 'a[href]', 'input', 'select', 'textarea',
    '[tabindex]', '[contenteditable="true"]', 'summary',
  ].join(',')
  const elements = [...panel.querySelectorAll<HTMLElement>(selector)]
    .filter(element =>
      element.tabIndex >= 0
      && !element.matches(':disabled')
      && element.getClientRects().length > 0
      && !element.closest('[inert], [aria-hidden="true"]'),
    )
  const first = elements[0]
  const last = elements[elements.length - 1]

  if (!first) {
    event.preventDefault()
    panel.focus({ preventScroll: true })
    return
  }
  if (event.shiftKey ? active === first : active === last) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus({ preventScroll: true })
  }
}

/** Centred detail dialog for the console. The Tab trap wraps the whole panel, close button included. */
export function DetailDialog({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useLanguage()
  return localize(<Modal title={title} open={open} onCancel={onClose} footer={null} width={760} centered destroyOnHidden rootClassName="adm-detail"
    modalRender={(node) => localize(<div onKeyDown={keepDrawerFocus}>{node}</div>)}>{children}</Modal>)
}

function RiskDetail({ user }: { user: UserProfile }) {
  useLanguage()
  const remote = useRemote(`admin-risk-${user.id}`, (signal) => api.data(api.getUserRiskClues({ path: { userId: user.id }, signal })))
  return localize(<><Alert type="info" showIcon title="风险线索仅供人工复核，不代表违规认定，也不会自动禁用账号。" />
    <Resource {...remote}>{remote.value && <Descriptions column={1} bordered style={{ marginTop: 16 }} items={[
      { key: 'status', label: '线索状态', children: systemText(remote.value.status) },
      { key: 'version', label: '判断依据', children: systemText(remote.value.algorithmVersion, '风险线索规则') },
      { key: 'time', label: '数据截至', children: displayDate(remote.value.sourceWindowAsOf) },
      { key: 'missing', label: '缺少数据', children: remote.value.missingInputs?.map((field) => t(systemText(field, '其他指标'))).join('；') || '无' },
      { key: 'degraded', label: '服务状态', children: remote.value.degraded ? systemText(remote.value.degradationReason || remote.value.fallback, '当前使用备用规则') : '正常' },
      { key: 'action', label: '建议', children: systemText(remote.value.recommendedAction, '人工检查当前事实') },
      { key: 'clues', label: '内部线索', children: remote.value.clues?.length ? remote.value.clues.map((clue, index) => localize(<p key={index}>{riskClueText(clue)}</p>)) : '暂无风险线索' },
      { key: 'disclaimer', label: '限制', children: <CatalogText text={remote.value.disclaimer || '线索不能替代人工判断。'} /> },
    ]} />}</Resource></>)
}

function UserDetail({ user, refresh }: { user: UserProfile; refresh: () => void }) {
  useLanguage()
  const [showRisk, setShowRisk] = useState(false)
  const [confirmed, setConfirmed] = useState<UserProfile>()
  const current = confirmed || user
  return localize(<><Descriptions column={1} bordered items={[
    { key: 'id', label: '用户编号', children: user.id },
    { key: 'name', label: '昵称', children: <OriginalText>{user.nickname}</OriginalText> },
    { key: 'email', label: '邮箱', children: <OriginalText>{user.email}</OriginalText> },
    { key: 'status', label: '处理状态', children: <Tag>{accountStatusLabels[current.status] || '未知状态'}</Tag> },
    { key: 'role', label: '角色', children: roleLabels[user.role] || '其他角色' },
    { key: 'trades', label: '已完成交易', children: user.transactionCount },
  ]} />
    {user.role === 'USER' && <AccountDecisionControls user={current} onChanged={next => { setConfirmed(next); refresh() }} />}
    {user.role === 'ADMIN' ? <Alert style={{ marginTop: 16 }} type="info" showIcon title="管理员账号受保护，不能在用户管理中禁用自己或其他管理员。" />
      : <Button style={{ margin: '16px 0' }} onClick={() => setShowRisk(true)}>读取风险线索（记录访问审计）</Button>}
    {showRisk && <RiskDetail user={user} />}
  </>)
}

export function UsersPanel() {
  useLanguage()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>()
  const [selected, setSelected] = useState<UserProfile>()
  const drawerFocus = useDrawerFocusReturn(Boolean(selected))
  const remote = useRemote(`admin-users-${page}`, (signal) => api.data(api.adminListUsers({ signal, query: { page, pageSize: 20 } })))
  const visible = remote.value?.items.filter((user) => (!status || user.status === status) && `${user.id} ${user.nickname} ${user.email}`.toLowerCase().includes(query.toLowerCase())) || []
  return localize(<>
    <Alert type="info" showIcon title="用户与风险线索读取、账号状态变更均由后端鉴权并审计；禁用会撤销已有会话。" />
    <Space wrap style={{ margin: '16px 0' }}>
      <Input aria-label="筛选本页用户" placeholder="本页编号、昵称或邮箱" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select virtual={false} aria-label="筛选本页账号状态" placeholder="本页全部状态" allowClear value={status} onChange={setStatus} style={{ width: 180 }} options={['ACTIVE', 'DISABLED'].map((value) => ({ value, label: accountStatusLabels[value] }))} />
      <Button onClick={remote.reload}>刷新用户</Button>
    </Space>
    <Typography.Paragraph type="secondary">筛选只作用于当前页，查看其他用户请翻页。服务端全文筛选尚未提供。</Typography.Paragraph>
    <Resource {...remote}>
      {!visible.length && remote.value && <NoItems filtered={Boolean(query || status)} />}
      {visible.length > 0 && <Table rowKey="id" pagination={false} scroll={{ x: 800 }} dataSource={visible} columns={[
        { title: '用户', key: 'user', render: (_, user) => localize(<Person person={user} detail={user.email} />) },
        { title: '编号', dataIndex: 'id' }, { title: '状态', key: 'status', render: (_, user) => localize(<Tag color={user.status === 'ACTIVE' ? 'green' : 'red'}>{user.status === 'ACTIVE' ? '正常' : '已禁用'}</Tag>) },
        { title: '角色', key: 'role', render: (_, user) => t(user.role === 'ADMIN' ? '管理员' : '普通用户') },
        { title: '操作', key: 'action', render: (_, user) => localize(<Button onClick={(event) => { drawerFocus.capture(event.currentTarget); setSelected(user) }}>{user.role === 'ADMIN' ? '查看资料 #' : '详情与人工处理 #'}{user.id}</Button>) },
      ]} />}
      {remote.value && <Pagination current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={(next) => { setSelected(undefined); setPage(next) }} />}
    </Resource>
    <DetailDialog title={selected?.role === 'ADMIN' ? '管理员资料' : '用户详情与风险复核'} open={Boolean(selected)} onClose={() => setSelected(undefined)}>
      {selected && <UserDetail key={selected.id} user={selected} refresh={remote.reload} />}
    </DetailDialog>
  </>)
}

function Evidence({ reportId, index }: { reportId: number; index: number }) {
  useLanguage()
  const [attempt, setAttempt] = useState(0)
  const [image, setImage] = useState<{ blob?: Blob; url?: string; error?: unknown }>({})
  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    let url: string | undefined
    void api.getReportEvidence({ path: { reportId, imageIndex: index }, signal: controller.signal, parseAs: 'blob' }).then((blob) => {
      if (!disposed) { url = URL.createObjectURL(blob as unknown as Blob); setImage({ blob: blob as unknown as Blob, url }) }
    }).catch((error) => { if (!disposed) setImage({ error }) })
    return () => { disposed = true; controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [reportId, index, attempt])
  return image.url && image.blob ? localize(<PrivateMediaImage key={image.url} url={image.url} blob={image.blob} alt={`举报私密证据 ${index + 1}`} width={160} />) : image.error ? localize(<Failure error={image.error} retry={() => { setImage({}); setAttempt((value) => value + 1) }} />) : localize(<Typography.Text role="status">正在读取私密证据…</Typography.Text>)
}

function ReportDetail({ report, refresh }: { report: AdminReport; refresh: () => void }) {
  useLanguage()
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const [showEvidence, setShowEvidence] = useState(false)
  const [confirmed, setConfirmed] = useState<AdminReport>()
  const current = confirmed || report
  return localize(<>
    <Descriptions column={1} bordered items={[
    { key: 'target', label: '对象', children: <>{t(targetTypeLabels[current.targetType] || '举报对象')} #{current.targetId}</> },
    { key: 'reason', label: '举报原因', children: reportReasonLabels[current.reason] || '其他举报原因' },
      { key: 'description', label: '举报说明', children: <CatalogText text={current.description || '无'} /> },
    { key: 'status', label: '处理状态', children: <Tag>{reportStatusLabels[current.status] || '未知状态'}</Tag> },
    { key: 'created', label: '提交时间', children: displayDate(current.createdAt) },
    ]} />
    <Failure error={mutation.error} />
    {confirmed && <Alert role="status" type="success" title="后端已确认处理结果。" />}
    {['PENDING', 'PROCESSING'].includes(current.status) && <Form layout="vertical" onFinish={(values: { resolution: 'RESOLVED' | 'REJECTED'; note: string }) => void mutation.run(async () => {
      const body = { resolution: values.resolution, note: values.note.trim() }
      setConfirmed(await api.data(api.resolveReport({ path: { reportId: report.id }, body, headers: api.idempotencyHeaders(attemptKey({ reportId: report.id, body })) })))
      refresh()
    })}>
      <Form.Item name="resolution" label="人工处理结论" rules={[{ required: true }]}><Select virtual={false} options={[{ value: 'RESOLVED', label: '处理完成' }, { value: 'REJECTED', label: '驳回' }]} /></Form.Item>
      <Form.Item name="note" label="处理说明" rules={[{ required: true, whitespace: true, max: 500 }]}><Input.TextArea maxLength={500} /></Form.Item>
      <Button htmlType="submit" loading={mutation.busy}>确认处理举报</Button>
    </Form>}
    {Boolean(current.evidence?.length) && <Button style={{ margin: '16px 0' }} onClick={() => setShowEvidence(true)}>读取私密证据（记录访问审计）</Button>}
    {showEvidence && current.evidence?.map((_, index) => localize(<Evidence key={index} reportId={report.id} index={index} />))}
  </>)
}

export function ReportsPanel() {
  useLanguage()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ReportStatus>()
  const [selected, setSelected] = useState<AdminReport>()
  const drawerFocus = useDrawerFocusReturn(Boolean(selected))
  const remote = useRemote(`admin-reports-${page}-${status}-${query}`, (signal) => api.data(api.adminListReports({ signal, query: { page, pageSize: 20, status, query } })))
  return localize(<>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search aria-label="搜索举报" placeholder="举报编号、商品或用户名称、举报说明" value={query} allowClear style={{ width: 300, maxWidth: '100%' }} onChange={(event) => { setQuery(event.target.value); setPage(1); setSelected(undefined) }} onSearch={(value) => { setQuery(value.trim()); setPage(1); setSelected(undefined) }} />
      <Select virtual={false} aria-label="举报状态筛选" placeholder="全部举报状态" allowClear value={status} onChange={(next) => { setSelected(undefined); setPage(1); setStatus(next) }} style={{ width: 200 }} options={(['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'] as const).map((value) => ({ value, label: reportStatusLabels[value] }))} /><Button onClick={remote.reload}>刷新举报</Button>
    </Space>
    {remote.error instanceof api.ApiError && [404, 501].includes(remote.error.status) ? <Alert type="warning" showIcon title="举报管理接口尚未接通" description="当前服务未提供举报队列，不能读取或处理举报。请等待后端治理接口交付后刷新。" action={<Button onClick={remote.reload}>重新检查接口</Button>} /> : <Resource {...remote}>
      {remote.value?.length === 0 && <NoItems filtered={Boolean(status || query)} />}
      {Boolean(remote.value?.length) && <Table rowKey="id" pagination={false} scroll={{ x: 740 }} dataSource={remote.value} columns={[
        { title: '举报编号', key: 'id', render: (_, report) => t(`举报 #${report.id}`) },
        { title: '举报对象', key: 'target', render: (_, report) => `${t(targetTypeLabels[report.targetType] || '举报对象')} #${report.targetId}` },
        { title: '处理状态', key: 'status', render: (_, report) => localize(<Tag>{reportStatusLabels[report.status] || '未知状态'}</Tag>) },
        { title: '提交时间', key: 'time', render: (_, report) => displayDate(report.createdAt) },
        { title: '操作', key: 'action', render: (_, report) => localize(<Button onClick={(event) => { drawerFocus.capture(event.currentTarget); setSelected(report) }}>举报详情 #{report.id}</Button>) },
      ]} />}
      {remote.value && <Space><Button disabled={page === 1} onClick={() => { setSelected(undefined); setPage(page - 1) }}>上一页</Button><span>第 {page} 页</span><Button disabled={remote.value.length < 20} onClick={() => { setSelected(undefined); setPage(page + 1) }}>下一页</Button></Space>}
    </Resource>}
    <DetailDialog title="举报详情与人工处理" open={Boolean(selected)} onClose={() => setSelected(undefined)}>{selected && <ReportDetail key={selected.id} report={selected} refresh={remote.reload} />}</DetailDialog>
  </>)
}

function ProductDetail({ productId, refresh }: { productId: number; refresh: () => void }) {
  useLanguage()
  const remote = useRemote(`admin-product-${productId}`, (signal) => api.data(api.adminGetProduct({ path: { productId }, signal })))
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const [confirmed, setConfirmed] = useState<AdminProduct>()
  const current = confirmed || remote.value
  const item = current?.product
  return localize(<Resource {...remote}>{item && <>
    <Descriptions column={1} bordered items={[
      { key: 'id', label: '商品编号', children: item.id },
      { key: 'title', label: '商品名称', children: <CatalogText text={item.title} /> },
      { key: 'seller', label: '发布者', children: <OriginalText>{item.seller.nickname}</OriginalText> },
      { key: 'price', label: '售价', children: `¥${item.price.toFixed(2)}` },
      { key: 'status', label: '商品状态', children: productStatusLabels[item.status] || '未知状态' },
      { key: 'description', label: '商品说明', children: <CatalogText text={item.description || '无'} /> },
      { key: 'hold', label: '人工下架', children: current?.moderationBlocked ? '管理员已下架，发布者不能自行上架' : '无人工下架限制' },
    ]} />
    <Space wrap style={{ margin: '16px 0' }}>{item.images.map((url) => localize(<Image key={url} src={url} width={120} alt="商品审核图片" />))}</Space>
    <Failure error={mutation.error} retry={() => { setConfirmed(undefined); remote.reload() }} />
    {confirmed && <Alert type="success" role="status" title="后端已确认商品处理，已记录人工审计。" />}
    {(item.status === 'ON_SALE' || current?.moderationBlocked) ? <Form layout="vertical" onFinish={(values: { reason: string }) => void mutation.run(async () => {
      const body = { hidden: !current?.moderationBlocked, reason: values.reason.trim(), expectedUpdatedAt: item.updatedAt }
      setConfirmed(await api.data(api.adminModerateProduct({ path: { productId }, body, headers: api.idempotencyHeaders(attemptKey({ productId, body })) })))
      refresh()
    })}>
      <Form.Item name="reason" label="商品处理原因" rules={[{ required: true, whitespace: true, max: 500 }]}><Input.TextArea maxLength={500} /></Form.Item>
      <Button htmlType="submit" aria-label={current?.moderationBlocked ? '解除人工下架' : '人工下架商品'} danger={!current?.moderationBlocked} loading={mutation.busy}>{current?.moderationBlocked ? '解除人工下架' : '人工下架商品'}</Button>
    </Form> : <Alert type="info" title="已预订、已售出或发布者自行下架的商品不能通过此入口更改交易状态。" />}
  </>}</Resource>)
}

export function ProductsPanel() {
  useLanguage()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<api.ProductStatus>()
  const [selected, setSelected] = useState<number>()
  const drawerFocus = useDrawerFocusReturn(Boolean(selected))
  const remote = useRemote(`admin-products-${page}-${query}-${status}`, (signal) => api.data(api.adminListProducts({ signal, query: { query, status, page, pageSize: 20 } })))
  return localize(<>
    <Alert type="info" showIcon title="管理员人工处理商品，读取和处理均记录审计；不会自动处罚账号，也不会改变已预订或已售出的商品。" />
    <Space wrap style={{ margin: '16px 0' }}>
      <Input.Search aria-label="搜索治理商品" placeholder="搜索商品名称" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); setSelected(undefined) }} onSearch={(value) => { setPage(1); setQuery(value.trim()); setSelected(undefined) }} allowClear />
      <Select virtual={false} aria-label="筛选治理商品状态" placeholder="全部商品状态" allowClear style={{ width: 180 }} value={status} options={(['ON_SALE', 'HIDDEN', 'RESERVED', 'SOLD'] as const).map((value) => ({ value, label: productStatusLabels[value] }))} onChange={(value) => { setStatus(value); setPage(1); setSelected(undefined) }} />
      <Button onClick={remote.reload}>刷新商品</Button>
    </Space>
    {remote.error instanceof api.ApiError && [404, 501].includes(remote.error.status) ? <Alert type="warning" title="商品治理接口尚未接通" action={<Button onClick={remote.reload}>重新检查接口</Button>} /> : <Resource {...remote}>
      {remote.value?.items.length === 0 && <NoItems filtered={Boolean(query || status)} />}
      {Boolean(remote.value?.items.length) && <Table rowKey={(item) => item.product.id} pagination={false} scroll={{ x: 800 }} dataSource={remote.value?.items} columns={[
        { title: '商品', key: 'product', render: (_, { product }) => localize(<Space>{product.images[0] && <Image src={product.images[0]} width={56} height={48} style={{ objectFit: 'cover' }} alt={product.title} />}<strong>{<CatalogText text={product.title} />}</strong></Space>) },
        { title: '卖家', key: 'seller', render: (_, { product }) => <OriginalText>{product.seller.nickname}</OriginalText> },
        { title: '价格', key: 'price', render: (_, { product }) => `¥${product.price.toFixed(2)}` },
        { title: '状态', key: 'status', render: (_, { product, moderationBlocked }) => localize(<Space><Tag>{productStatusLabels[product.status]}</Tag>{moderationBlocked && <Tag color="red">人工下架</Tag>}</Space>) },
        { title: '操作', key: 'action', render: (_, { product }) => localize(<Button onClick={(event) => { drawerFocus.capture(event.currentTarget); setSelected(product.id) }}>查看并处理商品 #{product.id}</Button>) },
      ]} />}
      {remote.value && <Pagination current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={(value) => { setPage(value); setSelected(undefined) }} />}
    </Resource>}
    <DetailDialog title="商品详情与人工处理" open={Boolean(selected)} onClose={() => setSelected(undefined)}>{selected && <ProductDetail key={selected} productId={selected} refresh={remote.reload} />}</DetailDialog>
  </>)
}

export function AdminPage() {
  useLanguage()
  return localize(<Page title="管理后台" subtitle="管理用户、处理举报与人工审核商品"><div className="admin-panel"><Tabs destroyOnHidden items={[
    { key: 'users', label: '用户与风险线索', children: <UsersPanel /> },
    { key: 'reports', label: '举报处理', children: <ReportsPanel /> },
    { key: 'products', label: '商品治理', children: <ProductsPanel /> },
  ]} /></div></Page>)
}
