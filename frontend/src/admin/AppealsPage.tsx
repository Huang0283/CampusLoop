import { Alert, Button, Card, Input, Pagination, Select, Space, Table, Tag } from 'antd'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Form } from '../i18n/Form'
import { OriginalText, localize } from '../i18n/Localize'
import { useLanguage } from '../i18n/language'
import * as api from '../sdk'
import type { AccountAppealRecord } from '../sdk'
import { DetailDialog } from '../live/AdminPages'
import { DecisionSummary, AppealSummary } from '../live/ModerationPages'
import { ModerationImage } from '../live/ModerationImage'
import { Failure, NoItems, Resource, useMutation, useRemote } from '../live/common'
import { appealStatusLabels, displayDate } from '../live/display'
import { notifyNotificationsChanged } from '../live/notifications'

export function AppealsPage() {
  useLanguage()
  const [params, setParams] = useSearchParams()
  const selected = Number(params.get('appeal')) || undefined
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<AccountAppealRecord['status']>()
  const remote = useRemote(`admin-appeals-${page}-${status}`, signal => api.data(api.adminListAccountAppeals({ signal, query: { page, pageSize: 20, status } })))
  return localize(<div className="adm-section"><div className="adm-head"><div><h1>申诉复核</h1><p>查看原处理事实和用户说明，填写复核理由后维持或撤销处理。</p></div></div>
    <div className="adm-card adm-plain admin-panel">
      <Space wrap style={{ marginBottom: 16 }}><Select virtual={false} aria-label="申诉状态筛选" placeholder="全部申诉状态" allowClear value={status} onChange={value => { setStatus(value); setPage(1) }} style={{ minWidth: 180 }} options={Object.entries(appealStatusLabels).map(([value, label]) => ({ value, label }))} /><Button onClick={remote.reload}>刷新申诉</Button></Space>
      <Resource {...remote}>{remote.value && <>
        {!remote.value.items.length ? <NoItems filtered={Boolean(status)} /> : <Table rowKey={item => item.appeal.id} pagination={false} scroll={{ x: 650 }} dataSource={remote.value.items} columns={[
          { title: '申诉编号', render: (_, item) => `#${item.appeal.id}` },
          { title: '用户', render: (_, item) => <OriginalText>{item.user.nickname}</OriginalText> },
          { title: '原处理', render: (_, item) => localize(<Tag color={item.decision.action === 'DISABLE' ? 'red' : 'orange'}>{item.decision.action === 'DISABLE' ? '禁用账号' : '违规警告'}</Tag>) },
          { title: '状态', render: (_, item) => localize(<Tag>{appealStatusLabels[item.appeal.status]}</Tag>) },
          { title: '申诉时间', render: (_, item) => displayDate(item.appeal.createdAt) },
          { title: '操作', render: (_, item) => localize(<Button onClick={() => setParams({ appeal: String(item.appeal.id) })}>查看申诉 #{item.appeal.id}</Button>) },
        ]} />}
        <Pagination current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={setPage} />
      </>}</Resource>
    </div>
    <DetailDialog title="账号申诉复核" open={Boolean(selected)} onClose={() => setParams({})}>{selected && <AppealDetail key={selected} appealId={selected} onReviewed={remote.reload} />}</DetailDialog>
  </div>)
}

function AppealDetail({ appealId, onReviewed }: { appealId: number; onReviewed: () => void }) {
  useLanguage()
  const remote = useRemote(`appeal-${appealId}`, signal => api.data(api.adminGetAccountAppeal({ signal, path: { appealId } })))
  const mutation = useMutation()
  const [outcome, setOutcome] = useState<'UPHELD' | 'REVOKED'>('UPHELD')
  const item = remote.value
  return localize(<Resource {...remote}>{item && <div className="moderation-stack">
    <Alert showIcon type="info" title="请结合原处理和申诉证据人工复核；撤销禁用处理会恢复账号，但旧登录会话不会恢复。" />
    <Card title="原处理记录"><DecisionSummary decision={item.decision} /><Space wrap style={{ marginTop: 16 }}>{item.decision.evidence.map((_, imageIndex) => <ModerationImage key={imageIndex} load={signal => api.adminGetAppealEvidence({ signal, path: { appealId, imageIndex }, query: { source: 'decision' }, parseAs: 'blob' })} />)}</Space></Card>
    <Card title="用户申诉"><AppealSummary appeal={item.appeal} /><Space wrap style={{ marginTop: 16 }}>{item.appeal.evidence.map((_, imageIndex) => <ModerationImage key={imageIndex} load={signal => api.adminGetAppealEvidence({ signal, path: { appealId, imageIndex }, parseAs: 'blob' })} />)}</Space></Card>
    {item.appeal.status === 'PENDING' && <><Failure error={mutation.error} /><Form layout="vertical" onFinish={(values: { reason: string }) => void mutation.run(async () => { await api.data(api.adminReviewAccountAppeal({ path: { appealId }, body: { outcome, reason: values.reason.trim() } })); remote.reload(); onReviewed(); notifyNotificationsChanged() })}>
      <Form.Item label="复核结论"><Select virtual={false} aria-label="复核结论" value={outcome} onChange={setOutcome} options={[{ value: 'UPHELD', label: '维持原处理' }, { value: 'REVOKED', label: '撤销原处理' }]} /></Form.Item>
      <Form.Item name="reason" label="复核说明" rules={[{ required: true, whitespace: true, max: 1000 }]}><Input.TextArea rows={4} maxLength={1000} showCount /></Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.busy}>确认复核并通知用户</Button>
    </Form></>}
  </div>}</Resource>)
}
