import { Empty } from 'antd'

interface EmptyStateProps {
  description?: string
}

export default function EmptyState({ description = 'No data' }: EmptyStateProps) {
  return (
    <div style={{ padding: '48px 0' }}>
      <Empty description={description} />
    </div>
  )
}