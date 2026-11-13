import { localize } from '../i18n/Localize'
import { useLanguage, dateLocale, t } from '../i18n/language'
import { CatalogText } from '../i18n/CatalogText'
import { useState } from 'react'
import { Button } from 'antd'
import { FlagOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import type { Report, ReportTargetType } from '../sdk'
import * as api from '../sdk'
import { NoItems, Page, Resource, useRemote } from './common'
import { reportReasonLabels } from './reportReasons'
import { useSession } from './session'

const targetLabels: Record<ReportTargetType, string> = { USER: '用户', PRODUCT: '商品', ORDER: '订单', CHAT_MESSAGE: '聊天消息' }
const statusLabels: Record<Report['status'], string> = { PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已处理', REJECTED: '已驳回' }
const PAGE_SIZE = 20

function targetPath(report: Report) {
  if (report.targetType === 'PRODUCT') return `/product/${report.targetId}`
  if (report.targetType === 'ORDER') return `/transactions/${report.targetId}`
  return null
}

const when = (value: string) => new Date(value).toLocaleString(dateLocale(), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

export function MyReports() {
  useLanguage()
  const user = useSession((state) => state.user)
  const [page, setPage] = useState(1)
  const reports = useRemote(`my-reports-${user?.id}-${page}`, (signal) => api.data(api.listMyReports({ query: { page, pageSize: PAGE_SIZE }, signal })), 5000)
  const items = reports.value ?? []
  return localize(<section className="report-board" aria-label="我的举报">
    <div className="report-board-head"><h2>我的举报</h2><Button size="small" type="text" icon={<ReloadOutlined />} onClick={reports.reload}>刷新</Button></div>
    <Resource {...reports}>
      {items.length ? <ol className="report-list">{items.map((item) => {
        const target = <>{targetLabels[item.targetType]} #{item.targetId}</>
        const path = targetPath(item)
        return localize(<li key={item.id} className={`report-item is-${item.status.toLowerCase()}`}>
          <span className="report-icon" aria-hidden="true"><FlagOutlined /></span>
          <div className="report-body">
            <div className="report-line">
              <h3>举报 #{item.id}</h3>
              <span className="report-status">{statusLabels[item.status]}</span>
            </div>
            <div className="report-meta">
              <span className="report-reason">{reportReasonLabels[item.reason]}</span>
              {path ? <Link className="report-target" to={path}>{target}<RightOutlined aria-hidden="true" /></Link> : <span className="report-target">{target}</span>}
            </div>
            {item.description && <p className="report-desc"><CatalogText text={item.description} /></p>}
            {item.resolutionNote && <div className="report-reply"><strong>处理说明</strong><p><CatalogText text={item.resolutionNote} /></p></div>}
            <div className="report-dates"><span>提交于 {when(item.createdAt)}</span>{item.handledAt && <span>处理于 {when(item.handledAt)}</span>}</div>
          </div>
        </li>)
      })}</ol> : <NoItems />}
      {(items.length > 0 || page > 1) && <div className="report-pager">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <span className="report-pager-label">{t(`第 ${page} 页`)}</span>
        <Button disabled={items.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>下一页</Button>
      </div>}
    </Resource>
  </section>)
}

export function ReportsPage() {
  useLanguage()
  return localize(<Page title="我的举报记录" subtitle="举报提交后由平台审核，处理结果会同步到通知。" className="reports-page" extra={<Link className="report-decisions-link" to="/account/decisions">账号处理记录与申诉</Link>}><MyReports /></Page>)
}
