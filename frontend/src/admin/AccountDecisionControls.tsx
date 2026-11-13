import { Alert, Button, Input, InputNumber, Pagination, Select, Space } from 'antd'
import { useState } from 'react'
import { Form } from '../i18n/Form'
import { localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import * as api from '../sdk'
import type { UserProfile, AccountDecisionWrite } from '../sdk'
import { Failure, NoItems, Resource, useMutation, useRemote } from '../live/common'
import { DecisionSummary } from '../live/ModerationPages'
import { ImageQueue } from '../live/ImageQueue'
import { useAttemptKey } from '../live/idempotency'

export function AccountDecisionControls({ user, onChanged }: { user: UserProfile; onChanged: (user: UserProfile) => void }) {
  useLanguage()
  const mutation = useMutation()
  const attemptKey = useAttemptKey()
  const [form] = Form.useForm()
  const [action, setAction] = useState<AccountDecisionWrite['action']>('DISABLE')
  const [uploading, setUploading] = useState(false)
  const [history, setHistory] = useState(false)
  const [saved, setSaved] = useState(false)
  const [revision, setRevision] = useState(0)
  const [localNow] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
  return localize(<div style={{ marginTop: 20 }}>
    <Failure error={mutation.error} />
    {saved && <Alert role="status" type="success" title="处理已保存并通知用户，操作已记录审计。" style={{ marginBottom: 16 }} />}
    <Form key={user.status} form={form} layout="vertical" initialValues={{ occurredAt: localNow }} onFinish={(values: { reason: string; facts?: string; basis?: string; occurredAt?: string; productId?: number; evidence?: string[] }) => void mutation.run(async () => {
      if (user.status === 'ACTIVE') {
        const body = { action, reason: values.reason.trim(), facts: values.facts!.trim(), basis: values.basis!.trim(), occurredAt: new Date(values.occurredAt!).toISOString(), productId: values.productId || null, evidence: values.evidence || [] }
        const confirmed = await api.data(api.adminCreateAccountDecision({ path: { userId: user.id }, body, headers: api.idempotencyHeaders(attemptKey(body)) }))
        onChanged({ ...user, status: confirmed.action === 'DISABLE' ? 'DISABLED' : 'ACTIVE' })
      } else {
        onChanged(await api.data(api.adminUpdateUserStatus({ path: { userId: user.id }, body: { status: 'ACTIVE', reason: values.reason.trim() } })))
      }
      setSaved(true); setRevision(value => value + 1); form.resetFields()
    })}>
      {user.status === 'ACTIVE' && <>
        <Form.Item label="处理方式"><Select virtual={false} aria-label="处理方式" value={action} onChange={setAction} options={[{ value: 'WARNING', label: '发出违规警告' }, { value: 'DISABLE', label: '禁用账号并撤销会话' }]} /></Form.Item>
        <Form.Item name="occurredAt" label="行为发生时间" rules={[{ required: true }]}><Input type="datetime-local" max={localNow} /></Form.Item>
        <Form.Item name="facts" label="相关行为与事实" rules={[{ required: true, whitespace: true, max: 2000 }]}><Input.TextArea rows={3} maxLength={2000} showCount /></Form.Item>
        <Form.Item name="basis" label="处理依据" rules={[{ required: true, whitespace: true, max: 500 }]}><Input.TextArea rows={2} maxLength={500} placeholder="请填写适用的平台规则或人工核实依据。" /></Form.Item>
        <details className="moderation-optional"><summary>关联商品（可选）</summary>
          <Form.Item name="productId" label="关联商品编号（须属于该用户）"><InputNumber min={1} max={Number.MAX_SAFE_INTEGER} precision={0} style={{ width: '100%' }} /></Form.Item>
        </details>
        <Alert type="info" showIcon title="以下事实、原因和证据将对被处理用户可见，请勿包含举报人身份或他人隐私。" style={{ marginBottom: 16 }} />
        <Form.Item name="evidence" label="可向本人展示的证据图片（可选）"><ImageQueue purpose="evidence" onBusyChange={setUploading} /></Form.Item>
      </>}
      <Form.Item name="reason" label="状态变更原因" rules={[{ required: true, whitespace: true, max: user.status === 'ACTIVE' ? 500 : 200 }]}><Input.TextArea rows={2} maxLength={user.status === 'ACTIVE' ? 500 : 200} /></Form.Item>
      <Button type="primary" htmlType="submit" danger={user.status === 'ACTIVE' && action === 'DISABLE'} loading={mutation.busy} disabled={uploading}>{user.status === 'DISABLED' ? '恢复账号' : action === 'WARNING' ? '发出违规警告' : '禁用账号并撤销会话'}</Button>
    </Form>
    <Button style={{ marginTop: 16 }} onClick={() => setHistory(value => !value)}>{history ? '收起处理记录' : '查看处理记录'}</Button>
    {history && <DecisionHistory key={revision} userId={user.id} />}
  </div>)
}

function DecisionHistory({ userId }: { userId: number }) {
  useLanguage()
  const [page, setPage] = useState(1)
  const remote = useRemote(`admin-decisions-${userId}-${page}`, signal => api.data(api.adminListAccountDecisions({ signal, path: { userId }, query: { page, pageSize: 5 } })))
  return <Resource {...remote}>{remote.value && <div className="moderation-stack" style={{ marginTop: 16 }}>
    {!remote.value.items.length && <NoItems />}
    {remote.value.items.map(item => <DecisionSummary key={item.id} decision={item} />)}
    <Space><Pagination current={page} pageSize={5} total={remote.value.pagination.total} showSizeChanger={false} onChange={setPage} /></Space>
  </div>}</Resource>
}
