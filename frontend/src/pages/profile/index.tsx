import React from 'react'
import { Layout, Input, Avatar, Space, Form, Select, Button, Rate, message } from 'antd'
import { SearchOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { AppSidebar, NotificationBell, UserMenu } from '../../components'
import { useAuthStore } from '../../stores/auth'

const { Header, Sider, Content } = Layout

const PRIMARY = '#2f6bff'
const BG = '#f5f6f8'
const CARD_BG = '#ffffff'
const TEXT_MAIN = '#1f2329'
const TEXT_SUB = '#646a73'
const BORDER = '#eef0f3'

const styles: Record<string, React.CSSProperties> = {
  layout: { minHeight: '100vh', background: BG, marginLeft: 220 },
  header: {
    background: CARD_BG,
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${BORDER}`,
    height: 64,
    lineHeight: '64px',
  },
  headerSearch: { width: 420, maxWidth: '40vw' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  content: { padding: 24, background: BG },
  profileCard: {
    background: CARD_BG,
    borderRadius: 12,
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '16px 8px',
    borderBottom: `1px solid ${BORDER}`,
    fontSize: 15,
  },
  editCard: { background: CARD_BG, borderRadius: 12, padding: '40px 36px' },
}

interface ProfileFormValues {
  nickname: string
  school?: string
  college?: string
  major?: string
  bio?: string
}

const ProfilePage: React.FC = () => {
  const [form] = Form.useForm<ProfileFormValues>()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  if (!user) {
    return null
  }

  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: '学校', value: user.school || '-' },
    { label: '学院', value: user.college || '-' },
    { label: '专业', value: user.major || '-' },
    { label: '交易次数', value: '28 次' },
    {
      label: '评分',
      value: (
        <Space size={10}>
          <Rate value={4.9} disabled style={{ fontSize: 16 }} />
          <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>4.9</span>
        </Space>
      ),
    },
  ]

  const handleFinish = (values: ProfileFormValues) => {
    updateProfile(values)
    message.success('资料已保存')
  }

  return (
    <Layout style={styles.layout}>
      <Header style={styles.header}>
        <div style={{ width: 220 }} />
        <Input
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          placeholder="搜索校园好物"
          style={styles.headerSearch}
          allowClear
        />
        <div style={styles.headerRight}>
          <NotificationBell />
          <UserMenu />
        </div>
      </Header>

      <Layout>
        <Sider
          width={220}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            background: '#ffffff',
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
            zIndex: 120,
          }}
        >
          <AppSidebar />
        </Sider>

        <Content style={styles.content}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '400px 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            <div style={styles.profileCard}>
              <Avatar
                src={user.avatar}
                size={140}
                style={{ marginBottom: 20 }}
              >
                {user.nickname?.[0]}
              </Avatar>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_MAIN,
                  marginBottom: 14,
                }}
              >
                {user.nickname}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: user.campusVerified ? '#e8f8ee' : '#f5f5f5',
                  color: user.campusVerified ? '#1db863' : '#999',
                  borderRadius: 20,
                  padding: '5px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                {user.campusVerified ? <CheckCircleFilled /> : <CloseCircleFilled />}
                {user.campusVerified ? '已认证' : '未认证'}
              </div>
              <div style={{ width: '100%', marginTop: 16 }}>
                {infoRows.map((row) => (
                  <div key={row.label} style={styles.infoRow}>
                    <span style={{ color: TEXT_SUB }}>{row.label}</span>
                    <span style={{ color: TEXT_MAIN }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.editCard}>
              <h2
                style={{
                  margin: '0 0 32px 0',
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_MAIN,
                }}
              >
                编辑资料
              </h2>
              <Form<ProfileFormValues>
                form={form}
                layout="horizontal"
                labelAlign="left"
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 18 }}
                initialValues={{
                  nickname: user.nickname,
                  school: user.school,
                  college: user.college,
                  major: user.major,
                  bio: user.bio,
                }}
                onFinish={handleFinish}
                requiredMark={false}
                size="large"
              >
                <Form.Item
                  name="nickname"
                  label="昵称"
                  rules={[{ required: true, message: '请输入昵称' }]}
                >
                  <Input style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="school" label="学校">
                  <Select
                    style={{ borderRadius: 8 }}
                    options={[
                      { value: '清华大学', label: '清华大学' },
                      { value: '北京大学', label: '北京大学' },
                      { value: '复旦大学', label: '复旦大学' },
                      { value: '浙江大学', label: '浙江大学' },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="college" label="学院">
                  <Input style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="major" label="专业">
                  <Input style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="bio" label="个人简介">
                  <Input.TextArea rows={4} style={{ borderRadius: 8, resize: 'vertical' }} />
                </Form.Item>

                <Form.Item
                  wrapperCol={{ offset: 4, span: 18 }}
                  style={{ marginBottom: 0, marginTop: 16 }}
                >
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    style={{
                      borderRadius: 8,
                      background: PRIMARY,
                      minWidth: 140,
                      fontWeight: 600,
                    }}
                  >
                    保存修改
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default ProfilePage