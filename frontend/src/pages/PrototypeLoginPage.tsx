import { Button, Card, Space, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components'
import { useAuthStore } from '../stores/auth'
import { CURRENT_USER_ID } from '../mocks/transaction'

const { Text, Title } = Typography

/**
 * 原型演示登录页（占位）：正式登录由 M2 / M5 实现。
 * 点击后写入本地 token 以便浏览 M4 交易流程原型。
 */
export default function PrototypeLoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const enter = (role: 'buyer' | 'seller') => {
    // 身份统一写入 auth store（持久化键与路由守卫保持一致）
    login({ id: CURRENT_USER_ID, nickname: '我', role: 'student' })
    message.success(`以${role === 'buyer' ? '买家' : '卖家'}身份进入原型`)
    navigate('/')
  }

  return (
    <PageContainer title="CampusLoop AI · 原型入口">
      <Card style={{ maxWidth: 480, margin: '48px auto' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>M4 交易流程前端 · 可点击原型</Title>
          <Text type="secondary">
            此页为原型演示占位（正式登录由 M2/M5 实现）。选择身份进入后可浏览：
            消息 / 聊天 / 订单 / 见面约定 / 通知中心 / 个人交易中心。
          </Text>
          <Space>
            <Button type="primary" onClick={() => enter('buyer')}>买家身份进入</Button>
            <Button onClick={() => enter('seller')}>卖家身份进入</Button>
          </Space>
        </Space>
      </Card>
    </PageContainer>
  )
}
