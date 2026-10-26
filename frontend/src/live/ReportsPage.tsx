import { useState } from 'react'
import { Button, Card, List, Tag, Typography } from 'antd'
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

export function MyReports() {
  const user = useSession((state) => state.user)
  const [page, setPage] = useState(1)
  const reports = useRemote(`my-reports-${user?.id}-${page}`, (signal) => api.data(api.listMyReports({ query: { page, pageSize: PAGE_SIZE }, signal })), 5000)
  const items = reports.value ?? []
  return <Card title="我的举报" style={{ marginTop: 16 }} extra={<Button size="small" onClick={reports.reload}>刷新</Button>}><Resource {...reports}>
    {items.length ? <>
      <List dataSource={items} renderItem={(item) => {
        const target = `${targetLabels[item.targetType]} #${item.targetId}`
        const path = targetPath(item)
        return <List.Item actions={[<Tag>{statusLabels[item.status]}</Tag>]}>
          <List.Item.Meta title={<span>举报 #{item.id} · {path ? <Link to={path}>{target}</Link> : target}</span>}
            description={<>
              <span>{reportReasonLabels[item.reason]}</span>
              {item.description && <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{item.description}</Typography.Paragraph>}
              <div>提交于 {new Date(item.createdAt).toLocaleString()}</div>
              {item.handledAt && <div>处理于 {new Date(item.handledAt).toLocaleString()}</div>}
              {item.resolutionNote && <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>处理说明：{item.resolutionNote}</Typography.Paragraph>}
            </>} />
        </List.Item>
      }} />
      <div className="report-pager">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <span className="report-pager-label">第 {page} 页</span>
        <Button disabled={items.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>下一页</Button>
      </div>
    </> : <NoItems />}
  </Resource></Card>
}

export function ReportsPage() {
  return <Page title="我的举报记录"><MyReports /></Page>
}
