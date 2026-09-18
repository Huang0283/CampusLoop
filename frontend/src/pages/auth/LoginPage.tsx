import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const navigate = useNavigate()

  const onFinish = (values: LoginForm) => {
    console.log('login values:', values)

    // 这里假登录，等 M5 接口好了再换成真实请求。
    // 必须写完整身份（userId/nickname）：按钮权限层 <Can> 与聊天 senderId
    // 均依赖 userId，只写 token 会导致所有订单页按钮按"非参与方"求值而消失。
    useAuthStore.getState().login({ id: 1, nickname: '我', role: 'student' })

    message.success('Login success')
    navigate('/')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <Card title="Login" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Please input email' }]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please input password' }]}
          >
            <Input.Password placeholder="password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Login
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <a onClick={() => navigate('/register')}>Create an account</a>
        </div>
      </Card>
    </div>
  )
}