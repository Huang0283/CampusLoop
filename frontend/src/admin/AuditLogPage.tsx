import { localize, OriginalText } from '../i18n/Localize'
import { dateLocale, t, useLanguage } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useState } from 'react'
import { Button, Pagination, Select, Space, Table, Tag } from 'antd'
import * as api from '../sdk'
import { NoItems, Resource, useRemote } from '../live/common'
import { auditEventLabels, resultStatusLabels } from './labels'

const SUBJECTS = { PRODUCT: '商品', REPORT: '举报', USER: '用户' } as const
// Audited reads carry a purpose code instead of a typed reason.
const PURPOSES: Record<string, string> = { dashboard_overview: '查看运营概览', order_oversight: '订单巡查', decision_trail_review: '查看处理记录', product_queue_review: '商品队列巡查', product_detail_review: '商品详情复核', report_queue_review: '举报队列巡查', account_administration: '账号管理', manual_review: '人工复核' }

export function AuditLogPage() {
  useLanguage()
  const [scope, setScope] = useState<'decisions' | 'all'>('decisions')
  const [days, setDays] = useState<7 | 30 | 'all'>(7)
  const [page, setPage] = useState(1)
  const remote = useRemote(`admin-audit-${scope}-${days}-${page}`, (signal) => api.data(api.adminListAuditLogs({ signal, query: { scope, days: days === 'all' ? undefined : days, page, pageSize: 20 } })))
  return localize(<div className="adm-section">
    <div className="adm-head">
      <div><h1>操作日志</h1><p>每一次人工处理都会记录操作人、理由和结果，用于追溯。日志只读，不能修改或删除。</p></div>
      <div className="adm-seg" role="radiogroup" aria-label="日志范围">
        {([['decisions', '处理决定'], ['all', '含查看记录']] as const).map(([value, label]) => localize(<button key={value} type="button" role="radio" aria-checked={scope === value} className={scope === value ? 'is-on' : ''} onClick={() => { setScope(value); setPage(1) }}>{label}</button>))}
      </div>
    </div>
    <div className="adm-card adm-plain">
      <Space wrap className="adm-filters">
        <Select virtual={false} getPopupContainer={(trigger) => trigger.parentElement ?? document.body} transitionName={window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : undefined} aria-label="日志时间范围" value={days} onChange={(value) => { setDays(value); setPage(1) }} style={{ width: 160 }} options={[{ value: 7, label: t('近 7 天') }, { value: 30, label: t('近 30 天') }, { value: 'all', label: t('全部时间') }]} />
        <Button aria-label="刷新" onClick={remote.reload} loading={remote.loading}>刷新</Button>
        <span className="adm-muted">{t('每页 20 条，按时间倒序显示')}{remote.value && <> · {t(`共 ${remote.value.pagination.total} 条记录`)}</>}</span>
      </Space>
      <Resource {...remote}>
        {remote.value?.items.length === 0 && <NoItems />}
        {Boolean(remote.value?.items.length) && <Table rowKey="id" pagination={false} scroll={{ x: 860 }} dataSource={remote.value?.items} columns={[
          { title: '时间', key: 'time', render: (_, row) => new Date(row.createdAt).toLocaleString(dateLocale(), { hour12: false, timeZone: 'Asia/Shanghai' }) },
          { title: '操作人', key: 'actor', render: (_, row) => row.actor ? <OriginalText>{`${row.actor.nickname ?? t('管理员')} (#${row.actor.id})`}</OriginalText> : t('系统') },
          { title: '操作', key: 'event', render: (_, row) => localize(<Space size={4}><Tag color={row.decision ? 'blue' : undefined}>{auditEventLabels[row.event] ?? row.event}</Tag>{row.resultStatus && <Tag color={['HIDDEN', 'DISABLED'].includes(row.resultStatus) ? 'red' : row.resultStatus === 'REJECTED' ? 'orange' : 'green'}>{resultStatusLabels[row.resultStatus] ?? row.resultStatus}</Tag>}</Space>) },
          { title: '对象', key: 'subject', render: (_, row) => row.subject ? <>{t(SUBJECTS[row.subject.type])} #{row.subject.id}{row.targetUser?.nickname && row.subject.type === 'USER' && <OriginalText>{` · ${row.targetUser.nickname}`}</OriginalText>}</> : '—' },
          { title: '理由', key: 'reason', render: (_, row) => row.reason ? <span className="adm-wrap"><CatalogText text={PURPOSES[row.reason] ?? row.reason} /></span> : <span className="adm-muted">—</span> },
        ]} />}
        {remote.value && remote.value.pagination.total > 20 && <Pagination className="adm-pager" current={page} pageSize={20} total={remote.value.pagination.total} showSizeChanger={false} onChange={setPage} />}
      </Resource>
    </div>
  </div>)
}
