import React, { useState } from 'react'
import { Alert, Form, Input, Button, Segmented, message } from 'antd'
import { MailOutlined, LockOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import type { UserRole } from '../../types/user'
import { toReturnPath, type ReturnLocation } from '../../hooks/useRequireAuthAction'

interface LoginFormValues {
  email: string
  password: string
}

type AuthScenario = 'success' | 'invalid' | 'expired' | 'disabled'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm<LoginFormValues>()
  const [role, setRole] = useState<UserRole>('student')
  const [scenario, setScenario] = useState<AuthScenario>('success')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'warning'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  const handleFinish = (values: LoginFormValues) => {
    setLoading(true)
    setFeedback(null)

    setTimeout(() => {
      if (scenario === 'invalid' || values.email.includes('error')) {
        setLoading(false)
        setFeedback({ type: 'error', text: '邮箱或密码错误，请检查后重试。' })
        return
      }

      if (scenario === 'expired') {
        localStorage.removeItem('token')
        setLoading(false)
        setFeedback({ type: 'warning', text: '登录令牌已失效，请重新输入凭据。' })
        return
      }

      if (scenario === 'disabled') {
        setLoading(false)
        setFeedback({ type: 'error', text: '该账号已被禁用，请联系管理员处理。' })
        return
      }

      login({
        id: role === 'admin' ? 99 : 1,
        nickname: role === 'admin' ? '演示管理员' : '演示学生',
        role,
        avatar: 'https://picsum.photos/seed/me/100/100',
        campusVerified: true,
        school: '清华大学',
        college: '计算机学院',
        major: '软件工程',
        bio: '热爱校园生活，诚信交易。',
      })

      message.success('登录成功')

      const requestedPath = toReturnPath(
        (location.state as { from?: ReturnLocation } | null)?.from,
      )
      const fallbackPath = role === 'admin' ? '/admin' : '/market'
      const target =
        role === 'student' && requestedPath?.startsWith('/admin')
          ? '/market'
          : requestedPath || fallbackPath

      setLoading(false)
      navigate(target, { replace: true })
    }, 800)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 400,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          padding: '48px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 32,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#1677ff">
            <path d="M12 3L1 8l4 1.8V15c0 3 3.1 5 7 5s7-2 7-5V9.8L21 8l-9-5zm0 2.2l6.2 2.8L12 10.8 5.8 8 12 5.2zM7 10.9l4 1.8v5.1c-2.2-.3-4-1.5-4-3.3v-3.6zm6 6.9v-5.1l4-1.8v3.6c0 1.8-1.8 3-4 3.3z" />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>CampusLoop</span>
        </div>

        <h1
          style={{
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: '#222222',
            margin: '0 0 32px 0',
          }}
        >
          登录
        </h1>

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          initialValues={{ email: 'student@campus.edu', password: 'demo123' }}
          disabled={loading}
        >
          <Form.Item label="演示身份">
            <Segmented
              block
              value={role}
              options={[
                { label: '学生', value: 'student' },
                { label: '管理员', value: 'admin' },
              ]}
              onChange={(value) => setRole(value as UserRole)}
              disabled={loading}
            />
          </Form.Item>
          <Form.Item label="演示状态">
            <Segmented
              block
              value={scenario}
              options={[
                { label: '正常', value: 'success' },
                { label: '凭据错误', value: 'invalid' },
                { label: '令牌失效', value: 'expired' },
                { label: '账号禁用', value: 'disabled' },
              ]}
              onChange={(value) => setScenario(value as AuthScenario)}
              disabled={loading}
            />
          </Form.Item>
          {feedback && (
            <Alert
              showIcon
              type={feedback.type}
              title={feedback.text}
              style={{ marginBottom: 20 }}
            />
          )}
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#999' }} />}
              placeholder="邮箱"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="密码"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 24, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{ borderRadius: 8, height: 46, fontSize: 16, fontWeight: 600 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#666666', fontSize: 14 }}>
          还没有账号？{' '}
          <a
            style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => navigate('/register')}
          >
            去注册
          </a>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
