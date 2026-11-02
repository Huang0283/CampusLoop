import { useState } from 'react'
import { Pagination, Space, Table, Tag } from 'antd'
import * as api from '../sdk'
import { NoItems, Resource, useRemote } from '../live/common'
import { auditEventLabels, resultStatusLabels } from './labels'

const SUBJECTS = { PRODUCT: '商品', REPORT: '举报', USER: '用户' } as const
// Audited reads carry a purpose code instead of a typed reason.
const PURPOSES: Record<string, string> = { dashboard_overview: '查看运营概览', order_oversight: '订单巡查', decision_trail_review: '查看处理记录', product_queue_review: '商品队列巡查', product_detail_review: '商品详情复核', report_queue_review: '举报队列巡查', account_administration: '账号管理', manual_review: '人工复核' }

export function AuditLogPage() {
  const [scope, setScope] = useState<'decisions' | 'all'>('decisions')
  const [page, setPage] = useState(1)
  const remote = useRemote(`admin-audit-${scope}-${page}`, (signal) => api.data(api.adminListAuditLogs({ signal, query: { scope, page, pageSize: 20 } })))
  return <div className="adm-section">
    <div className="adm-head">
      <div><h1>操作日志</h1><p>每一次人工处理都会记录操作人、理由和结果，用于追溯。日志只读，不能修改或删除。</p></div>
      <div className="adm-seg" role="radiogroup" aria-label="日志范围">
        {([['decisions', '处理决定'], ['all', '含查看记录']] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={scope === value} className={scope === value ? 'is-on' : ''} onClick={() => { setScope(value); setPage(1) }}>{label}</button>)}
      </div>
    </div>
    <div className="adm-card adm-plain">
      <Resource {...remote}>
        {remote.value?.items.length === 0 && <NoItems />}
        {Boolean(remote.value?.items.length) && <Table rowKey="id" pagination={false} scroll={{ x: 860 }} dataSource={remote.value?.items} columns={[
          { title: '时间', key: 'time', render: (_, row) => new Date(row.createdAt).toLocaleString('zh-CN', { hour12: false }) },
          { title: '操作人', key: 'actor', render: (_, row) => row.actor ? `${row.actor.nickname ?? '管理员'}（#${row.actor.id}）` : '系统' },
          { title: '操作', key: 'event', render: (_, row) => <Space size={4}><Tag color={row.decision ? 'blue' : undefined}>{auditEventLabels[row.event] ?? row.event}</Tag>{row.resultStatus && <Tag color={['HIDDEN', 'DISABLED'].includes(row.resultStatus) ? 'red' : row.resultStatus === 'REJECTED' ? 'orange' : 'green'}>{resultStatusLabels[row.resultStatus] ?? row.resultStatus}</Tag>}</Space> },
          { title: '对象', key: 'subject', render: (_, row) => row.subject ? `${SUBJECTS[row.subject.type]} #${row.subject.id}${row.targetUser?.nickname && row.subject.type === 'USER' ? ` · ${row.targetUser.nickname}` : ''}` : '—' },
          { title: '理由', key: 'reason', render: (_, row) => row.reason ? <span className="adm-wrap">{PURPOSES[row.reason] ?? row.reason}</span> : <span className="adm-muted">—</span> },
        ]} />}
        {remote.value && remote.value.pagination.total > 20 && <Pagination className="adm-pager" current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={setPage} />}
      </Resource>
    </div>
  </div>
}
