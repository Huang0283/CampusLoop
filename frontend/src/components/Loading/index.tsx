import { Spin } from 'antd'

interface LoadingProps {
  tip?: string
}

export default function Loading({ tip = 'Loading...' }: LoadingProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Spin tip={tip} />
    </div>
  )
}