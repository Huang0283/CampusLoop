import { Card, List, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import type { Report, ReportTargetType } from '../sdk'
import * as api from '../sdk'
import { NoItems, Page, Resource, useRemote } from './common'
import { reportReasonLabels } from './reportReasons'
import { useSession } from './session'

const targetLabels: Record<ReportTargetType, string> = { USER: '用户', PRODUCT: '商品', ORDER: '订单', CHAT_MESSAGE: '聊天消息' }
const statusLabels: Record<Report['status'], string> = { PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已处理', REJECTED: '已驳回' }

export function MyReports() {
  const user = useSession((state) => state.user)
  const reports = useRemote(`my-reports-${user?.id}`, (signal) => api.data(api.listMyReports({ signal })), 5000)
  return <Card title="我的举报" style={{ marginTop: 16 }}><Resource {...reports}>
    {reports.value?.length ? <List dataSource={reports.value} renderItem={(item) => <List.Item>
      <List.Item.Meta title={<><span>举报 #{item.id} · {targetLabels[item.targetType]} #{item.targetId}</span> <Tag>{statusLabels[item.status]}</Tag></>}
        description={<><span>{reportReasonLabels[item.reason]}</span>{item.description && <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{item.description}</Typography.Paragraph>}<div>{new Date(item.createdAt).toLocaleString()}</div></>} />
    </List.Item>} /> : <NoItems />}
  </Resource></Card>
}

export function ReportsPage() {
  return <Page title="我的举报记录" extra={<Link to="/notifications">查看通知</Link>}><MyReports /></Page>
}
