import React from 'react';
import { Layout, Input, Avatar, Space, Form, Select, Button, Rate } from 'antd';
import {
  SearchOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';

const { Header, Sider, Content } = Layout;

// -------------------- Mock 数据 --------------------
const mockProfile = {
  nickname: '林同学',
  avatar: 'https://picsum.photos/seed/avatar/280/280',
  school: '清华大学',
  college: '计算机学院',
  major: '软件工程',
  tradeCount: 28,
  rating: 4.9,
  bio: '热爱校园生活，诚信交易。',
};

const PRIMARY = '#2f6bff';
const BG = '#f5f6f8';
const CARD_BG = '#ffffff';
const TEXT_MAIN = '#1f2329';
const TEXT_SUB = '#646a73';
const BORDER = '#eef0f3';

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
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700, color: TEXT_MAIN },
  headerSearch: { width: 420, maxWidth: '40vw' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 20 },
  sider: { background: CARD_BG, borderRight: `1px solid ${BORDER}`, paddingTop: 16 },
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
};

interface ProfileFormValues {
  nickname: string;
  school: string;
  college: string;
  major: string;
  bio: string;
}

const ProfilePage: React.FC = () => {
  const [form] = Form.useForm<ProfileFormValues>();


  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: '学校', value: mockProfile.school },
    { label: '学院', value: mockProfile.college },
    { label: '专业', value: mockProfile.major },
    { label: '交易次数', value: `${mockProfile.tradeCount} 次` },
    {
      label: '评分',
      value: (
        <Space size={10}>
          <Rate value={mockProfile.rating} disabled style={{ fontSize: 16 }} />
          <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>{mockProfile.rating}</span>
        </Space>
      ),
    },
  ];

  const handleFinish = (values: ProfileFormValues) => {
    console.log('保存资料：', values);
  };

  return (
    <Layout style={styles.layout}>
      {/* 顶部导航栏 */}
      <Header style={styles.header}>
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
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
        {/* 左侧侧边栏 */}
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

        {/* 主内容区 */}
        <Content style={styles.content}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '400px 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* 左栏：资料卡片 */}
            <div style={styles.profileCard}>
              <Avatar src={mockProfile.avatar} size={140} style={{ marginBottom: 20 }} />
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: TEXT_MAIN,
                  marginBottom: 14,
                }}
              >
                {mockProfile.nickname}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#e8f8ee',
                  color: '#1db863',
                  borderRadius: 20,
                  padding: '5px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                <CheckCircleFilled />
                信誉良好
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

            {/* 右栏：编辑资料卡片 */}
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
                  nickname: mockProfile.nickname,
                  school: mockProfile.school,
                  college: mockProfile.college,
                  major: mockProfile.major,
                  bio: mockProfile.bio,
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

                <Form.Item
                  name="school"
                  label="学校"
                  rules={[{ required: true, message: '请选择学校' }]}
                >
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

                <Form.Item
                  name="college"
                  label="学院"
                  rules={[{ required: true, message: '请输入学院' }]}
                >
                  <Input style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item
                  name="major"
                  label="专业"
                  rules={[{ required: true, message: '请输入专业' }]}
                >
                  <Input style={{ borderRadius: 8 }} />
                </Form.Item>

                <Form.Item name="bio" label="个人简介">
                  <Input.TextArea rows={4} style={{ borderRadius: 8, resize: 'vertical' }} />
                </Form.Item>

                <Form.Item wrapperCol={{ offset: 4, span: 18 }} style={{ marginBottom: 0, marginTop: 16 }}>
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
  );
};

export default ProfilePage;