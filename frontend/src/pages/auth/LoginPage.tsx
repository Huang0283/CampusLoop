import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const navigate = useNavigate()

  const onFinish = (values: LoginForm) => {
    console.log('login values:', values)

    // 这里假登录，等 M5 接口好了再换成真实请求
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('role', 'student')

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