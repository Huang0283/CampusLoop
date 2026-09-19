import { Table, Tag, Space, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface ProductRow {
  id: number
  title: string
  price: number
  category: string
  status: string
}

const mockData: ProductRow[] = [
  { id: 1, title: 'Monitor 24 inch', price: 800, category: 'Electronics', status: 'on_sale' },
  { id: 2, title: 'Calculus Textbook', price: 30, category: 'Books', status: 'sold' },
  { id: 3, title: 'Desk Lamp', price: 50, category: 'Dorm', status: 'hidden' },
]

const columns: ColumnsType<ProductRow> = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Price', dataIndex: 'price', key: 'price', render: (p: number) => `¥${p}` },
  { title: 'Category', dataIndex: 'category', key: 'category' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        on_sale: 'green',
        sold: 'blue',
        hidden: 'default',
      }
      return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
    },
  },
  {
    title: 'Action',
    key: 'action',
    render: () => (
      <Space>
        <Button size="small">View</Button>
        <Button size="small" danger>
          Hide
        </Button>
      </Space>
    ),
  },
]

export default function ProductTable() {
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={mockData}
      pagination={{ pageSize: 10 }}
    />
  )
}