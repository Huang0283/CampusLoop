import { Tabs } from 'antd'
import { PageContainer } from '../../components'
import UserTable from './UserTable'
import ProductTable from './ProductTable'
import ReportTable from './ReportTable'

export default function AdminPage() {
  return (
    <PageContainer title="Admin">
      <Tabs
        items={[
          { key: 'users', label: 'Users', children: <UserTable /> },
          { key: 'products', label: 'Products', children: <ProductTable /> },
          { key: 'reports', label: 'Reports', children: <ReportTable /> },
        ]}
      />
    </PageContainer>
  )
}