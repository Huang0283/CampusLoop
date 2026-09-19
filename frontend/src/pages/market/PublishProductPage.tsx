import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Input,
  Select,
  Upload,
  Button,
  Form,
  Avatar,
  Badge,
  Dropdown,
  Card,
  Typography,
  Space,
  message,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  SearchOutlined,
  BellOutlined,
  DownOutlined,
  PlusOutlined,
  ContainerOutlined,
  MessageOutlined,
  SwapOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const categoryOptions = [
  { value: 'digital', label: '数码电子' },
  { value: 'books', label: '图书教材' },
  { value: 'life', label: '生活用品' },
  { value: 'clothes', label: '服饰鞋包' },
  { value: 'sports', label: '运动户外' },
  { value: 'others', label: '其他' },
];

const conditionOptions = [
  { value: 'new', label: '全新' },
  { value: 'like-new', label: '几乎全新' },
  { value: 'good', label: '轻微使用痕迹' },
  { value: 'fair', label: '明显使用痕迹' },
];

const locationOptions = [
  { value: 'east', label: '东校区' },
  { value: 'west', label: '西校区' },
  { value: 'south', label: '南校区' },
  { value: 'north', label: '北校区' },
  { value: 'library', label: '图书馆' },
  { value: 'gym', label: '体育馆' },
];

const menuItems = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'market', icon: <ShopOutlined />, label: '市场' },
  { key: 'wanted', icon: <ContainerOutlined />, label: '求购' },
  { key: 'chat', icon: <MessageOutlined />, label: '聊天' },
  { key: 'trade', icon: <SwapOutlined />, label: '交易' },
];

const userMenuItems = [
  { key: 'profile', label: '个人中心' },
  { key: 'my-products', label: '我的发布' },
  { key: 'logout', label: '退出登录' },
];

const PublishProductPage: React.FC = () => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const navigate = useNavigate();

  const handleFinish = (values: Record<string, unknown>) => {
    console.log('发布商品:', { ...values, images: fileList });
    message.success('商品信息发布成功（Mock）');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 64,
          padding: '0 24px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Space size={8} style={{ width: 220 }}>
          <ReadOutlined style={{ fontSize: 28, color: '#1677ff' }} />
          <Text strong style={{ fontSize: 18, color: '#262626' }}>
            Campus Market
          </Text>
        </Space>

        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="搜索校园好物"
          style={{
            maxWidth: 480,
            height: 40,
            borderRadius: 20,
            background: '#f5f6fa',
          }}
        />

        <Space size={20} style={{ width: 220, justifyContent: 'flex-end' }}>
          <Badge dot>
            <BellOutlined style={{ fontSize: 18, color: '#262626' }} />
          </Badge>
          <Space size={8}>
            <Avatar
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=student"
              size={36}
            />
            <Text style={{ color: '#262626' }}>同学</Text>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <DownOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
            </Dropdown>
          </Space>
        </Space>
      </Header>

      <Layout style={{ marginTop: 64, background: '#f5f6fa' }}>
        <Sider
          width={220}
          style={{
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
            background: '#ffffff',
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={['market']}
            items={menuItems}
            style={{ borderRight: 'none', paddingTop: 16 }}
          />
        </Sider>

        <Content style={{ marginLeft: 220, padding: '24px 40px' }}>
          <Card
            style={{
              maxWidth: 900,
              margin: '0 auto',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            }}
            bodyStyle={{ padding: '32px 40px 40px' }}
          >
            <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
              发布商品
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              填写商品信息，让更多同学看到你的闲置好物
            </Text>

            <Form
              form={form}
              layout="horizontal"
              labelAlign="left"
              onFinish={handleFinish}
              style={{ marginTop: 32 }}
              labelCol={{ flex: '110px' }}
              wrapperCol={{ flex: 1 }}
            >
              <Form.Item
                label="商品图片"
                name="images"
                rules={[{ required: true, message: '请上传商品图片' }]}
                extra={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    最多上传 5 张图片，支持 JPG、PNG 格式
                  </Text>
                }
              >
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  maxCount={5}
                  accept=".jpg,.jpeg,.png"
                  beforeUpload={() => false}
                  onChange={({ fileList: newList }) => setFileList(newList)}
                >
                  {fileList.length < 5 && (
                    <div>
                      <PlusOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />
                      <div style={{ marginTop: 4, color: '#8c8c8c' }}>
                        上传图片
                      </div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                label="商品分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类" options={categoryOptions} />
              </Form.Item>

              <Form.Item
                label="成色"
                name="condition"
                rules={[{ required: true, message: '请选择成色' }]}
              >
                <Select placeholder="请选择成色" options={conditionOptions} />
              </Form.Item>

              <Form.Item label="原价" name="originalPrice">
                <Input
                  prefix="¥"
                  placeholder="请输入原价"
                  inputMode="decimal"
                />
              </Form.Item>

              <Form.Item
                label="售价"
                name="price"
                rules={[{ required: true, message: '请输入售价' }]}
              >
                <Input prefix="¥" placeholder="请输入售价" inputMode="decimal" />
              </Form.Item>

              <Form.Item label="价格参考">
                <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/publish/price-advice')}>
                  查看价格建议
                </Button>
              </Form.Item>

              <Form.Item
                label="商品描述"
                name="description"
                rules={[{ required: true, message: '请填写商品描述' }]}
              >
                <Input.TextArea
                  placeholder="描述商品状态、配件、使用情况"
                  maxLength={500}
                  showCount={{
                    formatter: ({ count, maxLength }) =>
                      `${count}/${maxLength}`,
                  }}
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </Form.Item>

              <Form.Item
                label="交易地点"
                name="location"
                rules={[{ required: true, message: '请选择校区或地点' }]}
              >
                <Select
                  placeholder="请选择校区或地点"
                  options={locationOptions}
                />
              </Form.Item>

              <Form.Item wrapperCol={{ offset: 0, flex: 1 }} style={{ marginTop: 8 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  style={{
                    height: 48,
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  发布
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PublishProductPage;
