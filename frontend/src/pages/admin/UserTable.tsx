import { Table, Tag, Space, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface UserRow {
  id: number
  nickname: string
  email: string
  role: string
  status: string
}

const mockData: UserRow[] = [
  { id: 1, nickname: 'Alice', email: 'alice@example.com', role: 'student', status: 'active' },
  { id: 2, nickname: 'Bob', email: 'bob@example.com', role: 'student', status: 'active' },
  { id: 3, nickname: 'Admin', email: 'admin@example.com', role: 'admin', status: 'active' },
]

const columns: ColumnsType<UserRow> = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Nickname', dataIndex: 'nickname', key: 'nickname' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    render: (role: string) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => <Tag color={status === 'active' ? 'green' : 'default'}>{status}</Tag>,
  },
  {
    title: 'Action',
    key: 'action',
    render: () => (
      <Space>
        <Button size="small">View</Button>
        <Button size="small" danger>
          Ban
        </Button>
      </Space>
    ),
  },
]

export default function UserTable() {
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={mockData}
      pagination={{ pageSize: 10 }}
    />
  )
}