import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Form, Image, Input, Pagination, Select, Space, Tabs, Tag, Typography } from 'antd'
import * as api from '../sdk'
import type { Report, ReportStatus, UserProfile } from '../sdk'
import { Failure, NoItems, Page, Resource, useMutation, useRemote } from './common'
import { useAttemptKey } from './idempotency'

function RiskDetail({ user }: { user: UserProfile }) {
  const remote = useRemote(`admin-risk-${user.id}`, (signal) => api.data(api.getUserRiskClues({ path: { userId: user.id }, signal })))
  return <><Alert type="info" showIcon title="风险线索仅供人工复核，不代表违规认定，也不会自动禁用账号。" />
    <Resource {...remote}>{remote.value && <Descriptions column={1} bordered style={{ marginTop: 16 }} items={[
      { key: 'status', label: '线索状态', children: remote.value.status },
      { key: 'version', label: '算法版本', children: remote.value.algorithmVersion || '未提供' },
      { key: 'time', label: '事实窗口时间', children: remote.value.sourceWindowAsOf || '未提供' },
      { key: 'missing', label: '缺少数据', children: remote.value.missingInputs?.join('、') || '无' },
      { key: 'degraded', label: '降级说明', children: remote.value.degraded ? remote.value.degradationReason || remote.value.fallback || '服务已降级' : '未降级' },
      { key: 'action', label: '建议', children: remote.value.recommendedAction || '人工检查当前事实' },
      { key: 'clues', label: '内部线索', children: <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(remote.value.clues || [], null, 2)}</pre> },
      { key: 'disclaimer', label: '限制', children: remote.value.disclaimer || '线索不能替代人工判断。' },
    ]} />}</Resource></>
}

function UserDetail({ user, refresh }: { user: UserProfile; refresh: () => void }) {
  const mutation = useMutation()
  const [showRisk, setShowRisk] = useState(false)
  const [confirmed, setConfirmed] = useState<UserProfile>()
  const current = confirmed || user
  return <><Descriptions column={1} bordered items={[
    { key: 'id', label: '用户编号', children: user.id },
    { key: 'name', label: '昵称', children: user.nickname },
    { key: 'email', label: '邮箱', children: user.email },
    { key: 'status', label: '处理状态', children: <Tag>{current.status}</Tag> },
    { key: 'role', label: '角色', children: user.role },
    { key: 'trades', label: '已完成交易', children: user.transactionCount },
  ]} />
    <Failure error={mutation.error} />
    {confirmed && <Alert role="status" type="success" title="后端已确认状态变更。操作已记录审计。" />}
    {user.role === 'USER' && <Form layout="vertical" onFinish={(values: { reason: string }) => void mutation.run(async () => {
      setConfirmed(await api.data(api.adminUpdateUserStatus({ path: { userId: user.id }, body: { status: current.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE', reason: values.reason.trim() } })))
      refresh()
    })}>
      <Form.Item name="reason" label="状态变更原因" rules={[{ required: true, whitespace: true, max: 200 }]}><Input.TextArea maxLength={200} /></Form.Item>
      <Button htmlType="submit" danger={current.status === 'ACTIVE'} loading={mutation.busy}>{current.status === 'ACTIVE' ? '禁用账号并撤销会话' : '恢复账号'}</Button>
    </Form>}
    <Button style={{ margin: '16px 0' }} onClick={() => setShowRisk(true)}>读取风险线索（记录访问审计）</Button>
    {showRisk && <RiskDetail user={user} />}
  </>
}

function UsersPanel() {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>()
  const [selected, setSelected] = useState<UserProfile>()
  const remote = useRemote(`admin-users-${page}`, (signal) => api.data(api.adminListUsers({ signal, query: { page, pageSize: 20 } })))
  const visible = remote.value?.items.filter((user) => (!status || user.status === status) && `${user.id} ${user.nickname} ${user.email}`.toLowerCase().includes(query.toLowerCase())) || []
  return <>
    <Alert type="info" showIcon title="用户与风险线索读取、账号状态变更均由后端鉴权并审计；禁用会撤销已有会话。" />
    <Space wrap style={{ margin: '16px 0' }}>
      <Input aria-label="筛选本页用户" placeholder="本页编号、昵称或邮箱" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select aria-label="筛选本页账号状态" placeholder="本页全部状态" allowClear value={status} onChange={setStatus} style={{ width: 180 }} options={['ACTIVE', 'DISABLED'].map((value) => ({ value, label: value }))} />
      <Button onClick={remote.reload}>刷新用户</Button>
    </Space>
    <Typography.Paragraph type="secondary">筛选只作用于当前页，查看其他用户请翻页。服务端全文筛选尚未提供。</Typography.Paragraph>
    <Resource {...remote}>
      {!visible.length && remote.value && <NoItems filtered={Boolean(query || status)} />}
      {visible.map((user) => <Card key={user.id} style={{ marginBottom: 12 }}><Space wrap><strong>{user.nickname}</strong><span>#{user.id}</span><Tag>{user.status}</Tag><Tag>{user.role}</Tag><Button onClick={() => setSelected(user)}>详情与人工处理 #{user.id}</Button></Space></Card>)}
      {remote.value && <Pagination current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={(next) => { setSelected(undefined); setPage(next) }} />}
    </Resource>
    <Drawer title="用户详情与风险复核" open={Boolean(selected)} onClose={() => setSelected(undefined)} destroyOnHidden>
      {selected && <UserDetail key={selected.id} user={selected} refresh={remote.reload} />}
    </Drawer>
  </>
}

function Evidence({ reportId, index }: { reportId: number; index: number }) {
  const [attempt, setAttempt] = useState(0)
  const [image, setImage] = useState<{ url?: string; error?: unknown }>({})
  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    let url: string | undefined
    void api.getReportEvidence({ path: { reportId, imageIndex: index }, signal: controller.signal, parseAs: 'blob' }).then((blob) => {
      if (!disposed) { url = URL.createObjectURL(blob as unknown as Blob); setImage({ url }) }
    }).catch((error) => { if (!disposed) setImage({ error }) })
    return () => { disposed = true; controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [reportId, index, attempt])
  return image.url ? <Image src={image.url} alt={`举报私密证据 ${index + 1}`} width={160} /> : image.error ? <Failure error={image.error} retry={() => { setImage({}); setAttempt((value) => value + 1) }} /> : <Typography.Text role="status">正在读取私密证据…</Typography.Text>
}

function ReportDetail({ report, refresh }: { report: Report; refresh: () => void }) {
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const [showEvidence, setShowEvidence] = useState(false)
  const [confirmed, setConfirmed] = useState<Report>()
  const current = confirmed || report
  return <>
    <Descriptions column={1} bordered items={[
      { key: 'target', label: '对象', children: `${current.targetType} #${current.targetId}` },
      { key: 'reason', label: '举报原因', children: current.reason },
      { key: 'description', label: '举报说明', children: current.description || '无' },
      { key: 'status', label: '处理状态', children: <Tag>{current.status}</Tag> },
      { key: 'created', label: '提交时间', children: current.createdAt },
    ]} />
    <Failure error={mutation.error} />
    {confirmed && <Alert role="status" type="success" title="后端已确认处理结果。" />}
    {['PENDING', 'PROCESSING'].includes(current.status) && <Form layout="vertical" onFinish={(values: { resolution: 'RESOLVED' | 'REJECTED'; note: string }) => void mutation.run(async () => {
      const body = { resolution: values.resolution, note: values.note.trim() }
      setConfirmed(await api.data(api.resolveReport({ path: { reportId: report.id }, body, headers: api.idempotencyHeaders(attemptKey({ reportId: report.id, body })) })))
      refresh()
    })}>
      <Form.Item name="resolution" label="人工处理结论" rules={[{ required: true }]}><Select options={[{ value: 'RESOLVED', label: '处理完成' }, { value: 'REJECTED', label: '驳回' }]} /></Form.Item>
      <Form.Item name="note" label="处理说明" rules={[{ required: true, whitespace: true, max: 500 }]}><Input.TextArea maxLength={500} /></Form.Item>
      <Button htmlType="submit" loading={mutation.busy}>确认处理举报</Button>
    </Form>}
    {Boolean(current.evidence?.length) && <Button style={{ margin: '16px 0' }} onClick={() => setShowEvidence(true)}>读取私密证据（记录访问审计）</Button>}
    {showEvidence && current.evidence?.map((_, index) => <Evidence key={index} reportId={report.id} index={index} />)}
  </>
}

function ReportsPanel() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ReportStatus>()
  const [selected, setSelected] = useState<Report>()
  const remote = useRemote(`admin-reports-${page}-${status}`, (signal) => api.data(api.adminListReports({ signal, query: { page, pageSize: 20, status } })))
  return <>
    <Space wrap style={{ marginBottom: 16 }}><Select aria-label="举报状态筛选" placeholder="全部举报状态" allowClear value={status} onChange={(next) => { setSelected(undefined); setPage(1); setStatus(next) }} style={{ width: 200 }} options={(['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'] as const).map((value) => ({ value, label: value }))} /><Button onClick={remote.reload}>刷新举报</Button></Space>
    {remote.error instanceof api.ApiError && [404, 501].includes(remote.error.status) ? <Alert type="warning" showIcon title="举报管理接口尚未接通" description="当前服务未提供举报队列，不能读取或处理举报。请等待后端治理接口交付后刷新。" action={<Button onClick={remote.reload}>重新检查接口</Button>} /> : <Resource {...remote}>
      {remote.value?.length === 0 && <NoItems filtered={Boolean(status)} />}
      {remote.value?.map((report) => <Card key={report.id} style={{ marginBottom: 12 }}><Space wrap><strong>举报 #{report.id}</strong><Tag>{report.status}</Tag><span>{report.targetType} #{report.targetId}</span><Button onClick={() => setSelected(report)}>举报详情 #{report.id}</Button></Space></Card>)}
      {remote.value && <Space><Button disabled={page === 1} onClick={() => { setSelected(undefined); setPage(page - 1) }}>上一页</Button><span>第 {page} 页</span><Button disabled={remote.value.length < 20} onClick={() => { setSelected(undefined); setPage(page + 1) }}>下一页</Button></Space>}
    </Resource>}
    <Drawer title="举报详情与人工处理" open={Boolean(selected)} onClose={() => setSelected(undefined)} destroyOnHidden>{selected && <ReportDetail key={selected.id} report={selected} refresh={remote.reload} />}</Drawer>
  </>
}

export function AdminPage() {
  return <Page title="管理后台"><Tabs destroyOnHidden items={[
    { key: 'users', label: '用户与风险线索', children: <UsersPanel /> },
    { key: 'reports', label: '举报处理', children: <ReportsPanel /> },
    { key: 'products', label: '商品治理', children: <Alert type="warning" showIcon title="商品治理接口待交付" description="管理员商品队列、隐藏商品详情和审计处理契约尚未提供。当前不能执行治理操作。" /> },
  ]} /></Page>
}
