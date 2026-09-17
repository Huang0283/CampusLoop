import { Form, Input, Button, Card, message } from 'antd'
import { useNavigate } from 'react-router-dom'

interface RegisterForm {
  email: string
  password: string
  confirm: string
}

export default function RegisterPage() {
  const navigate = useNavigate()

  const onFinish = (values: RegisterForm) => {
    if (values.password !== values.confirm) {
      message.error('Passwords do not match')
      return
    }

    console.log('register values:', values)

    // 先假注册，等 M5 接口好了再换成真实请求
    message.success('Register success')
    navigate('/login')
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
      <Card title="Register" style={{ width: 360 }}>
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

          <Form.Item
            label="Confirm"
            name="confirm"
            rules={[{ required: true, message: 'Please confirm password' }]}
          >
            <Input.Password placeholder="confirm password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Register
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <a onClick={() => navigate('/login')}>Back to login</a>
        </div>
      </Card>
    </div>
  )
}