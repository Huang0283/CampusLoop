import { Table, Tag, Space, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface ReportRow {
  id: number
  targetType: string
  targetId: number
  reason: string
  status: string
}

const mockData: ReportRow[] = [
  { id: 1, targetType: 'product', targetId: 3, reason: 'Fake description', status: 'pending' },
  { id: 2, targetType: 'user', targetId: 2, reason: 'Harassment', status: 'resolved' },
]

const columns: ColumnsType<ReportRow> = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Target Type', dataIndex: 'targetType', key: 'targetType' },
  { title: 'Target ID', dataIndex: 'targetId', key: 'targetId' },
  { title: 'Reason', dataIndex: 'reason', key: 'reason' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={status === 'pending' ? 'orange' : 'green'}>{status}</Tag>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: () => (
      <Space>
        <Button size="small">Review</Button>
      </Space>
    ),
  },
]

export default function ReportTable() {
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={mockData}
      pagination={{ pageSize: 10 }}
    />
  )
}