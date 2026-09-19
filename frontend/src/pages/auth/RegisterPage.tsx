import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();

  const handleFinish = (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次密码不一致');
      return;
    }
    console.log('注册表单值：', values);
  };

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
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#1677ff">
            <path d="M12 3L1 8l4 1.8V15c0 3 3.1 5 7 5s7-2 7-5V9.8L21 8l-9-5zm0 2.2l6.2 2.8L12 10.8 5.8 8 12 5.2zM7 10.9l4 1.8v5.1c-2.2-.3-4-1.5-4-3.3v-3.6zm6 6.9v-5.1l4-1.8v3.6c0 1.8-1.8 3-4 3.3z" />
          </svg>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>CampusLoop</span>
        </div>

        {/* 标题 */}
        <h1
          style={{
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: '#222222',
            margin: '0 0 28px 0',
          }}
        >
          注册
        </h1>

        {/* 表单 */}
        <Form<RegisterFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#999' }} />}
              placeholder="请输入邮箱地址"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="请输入密码"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="请再次输入密码"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 20, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              style={{ borderRadius: 8, height: 46, fontSize: 16, fontWeight: 600 }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>

        {/* 底部链接 */}
        <div style={{ textAlign: 'center', color: '#666666', fontSize: 14 }}>
          已有账号？{' '}
          <a
            style={{ color: '#1677ff', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => navigate('/login')}
          >
            返回登录
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;