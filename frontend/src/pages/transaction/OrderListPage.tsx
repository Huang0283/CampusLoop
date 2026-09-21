import React, { useState } from 'react';
import {
  Layout,
  Input,
  Badge,
  Avatar,
  Dropdown,
  Tabs,
  List,
  Typography,
  Menu,
  Space,
} from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  SearchOutlined,
  BellOutlined,
  DownOutlined,
  SwapOutlined,
  MessageOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ==================== 类型定义 ====================
interface OrderItem {
  id: number;
  title: string;
  orderNo: string;
  time: string;
  price: number;
  image: string;
  buyer: { name: string; avatar: string };
  seller: { name: string; avatar: string };
  status: OrderStatus;
}

type OrderStatus = '待确认' | '已预约' | '见面已安排' | '已完成';

// ==================== Mock 数据 ====================
const mockOrders: OrderItem[] = [
  {
    id: 1,
    title: '戴尔 27 英寸显示器',
    orderNo: 'CL202405200001',
    time: '2024-05-20 14:32',
    price: 899,
    image: 'https://picsum.photos/seed/monitor/240/180',
    buyer: { name: '林同学', avatar: 'https://picsum.photos/seed/buyer1/100/100' },
    seller: { name: '王同学', avatar: 'https://picsum.photos/seed/seller1/100/100' },
    status: '待确认',
  },
  {
    id: 2,
    title: '高等数学教材',
    orderNo: 'CL202405190021',
    time: '2024-05-19 10:18',
    price: 35,
    image: 'https://picsum.photos/seed/book/240/180',
    buyer: { name: '陈同学', avatar: 'https://picsum.photos/seed/buyer2/100/100' },
    seller: { name: '赵同学', avatar: 'https://picsum.photos/seed/seller2/100/100' },
    status: '已预约',
  },
  {
    id: 3,
    title: '机械键盘',
    orderNo: 'CL202405180015',
    time: '2024-05-18 16:45',
    price: 220,
    image: 'https://picsum.photos/seed/keyboard/240/180',
    buyer: { name: '林同学', avatar: 'https://picsum.photos/seed/buyer3/100/100' },
    seller: { name: '王同学', avatar: 'https://picsum.photos/seed/seller3/100/100' },
    status: '见面已安排',
  },
  {
    id: 4,
    title: '宿舍收纳架',
    orderNo: 'CL202405170008',
    time: '2024-05-17 11:20',
    price: 28,
    image: 'https://picsum.photos/seed/shelf/240/180',
    buyer: { name: '陈同学', avatar: 'https://picsum.photos/seed/buyer4/100/100' },
    seller: { name: '赵同学', avatar: 'https://picsum.photos/seed/seller4/100/100' },
    status: '已完成',
  },
  {
    id: 5,
    title: '人体工学椅',
    orderNo: 'CL202405150012',
    time: '2024-05-15 09:36',
    price: 450,
    image: 'https://picsum.photos/seed/chair/240/180',
    buyer: { name: '林同学', avatar: 'https://picsum.photos/seed/buyer5/100/100' },
    seller: { name: '王同学', avatar: 'https://picsum.photos/seed/seller5/100/100' },
    status: '见面已安排',
  },
];

// ==================== 状态颜色映射 ====================
const statusColorMap: Record<OrderStatus, { color: string; bg: string; border: string }> = {
  待确认: { color: '#2f6bff', bg: '#e8f0ff', border: '#bcd4ff' },
  已预约: { color: '#d48806', bg: '#fff7e6', border: '#ffe1a6' },
  见面已安排: { color: '#722ed1', bg: '#f4edff', border: '#dcc8ff' },
  已完成: { color: '#52c41a', bg: '#f0ffe8', border: '#c8f0b0' },
};

// ==================== 侧边栏菜单项 ====================
const menuItems = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'market', icon: <ShopOutlined />, label: '市场' },
  { key: 'wanted', icon: <FileSearchOutlined />, label: '求购' },
  { key: 'chat', icon: <MessageOutlined />, label: '聊天' },
  { key: 'transaction', icon: <SwapOutlined />, label: '交易' },
];

// ==================== 页面组件 ====================
const OrderListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  const tabItems = [
    { key: 'all', label: '全部' },
    { key: 'buy', label: '购买' },
    { key: 'sell', label: '出售' },
    { key: 'ongoing', label: '进行中' },
    { key: 'finished', label: '已结束' },
  ];

   const userMenu = [
  { key: 'profile', label: '个人中心' },
  { key: 'logout', label: '退出登录' },
]


  const renderStatusTag = (status: OrderStatus) => {
    const c = statusColorMap[status];
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          color: c.color,
          backgroundColor: c.bg,
          border: `1px solid ${c.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {status}
      </span>
    );
  };

  const renderParty = (label: string, name: string, avatar: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar size={40} src={avatar} />
      <div>
        <div style={{ fontSize: 12, color: '#8f959e', lineHeight: '18px' }}>{label}</div>
        <div style={{ fontSize: 14, color: '#1f2329', fontWeight: 500, lineHeight: '20px' }}>
          {name}
        </div>
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6f8' }}>
      {/* ==================== 顶部导航栏 ==================== */}
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          height: 64,
          padding: '0 24px',
          background: '#ffffff',
          borderBottom: '1px solid #eef0f3',
          lineHeight: 'normal',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3L1 8l11 5 9-4.09V15h2V8L12 3z"
              fill="#2f6bff"
            />
            <path
              d="M5 11.5V16c0 1.66 3.13 3 7 3s7-1.34 7-3v-4.5l-7 3.18-7-3.18z"
              fill="#2f6bff"
              opacity="0.85"
            />
          </svg>
          <Text strong style={{ fontSize: 20, color: '#1f2329' }}>
            CampusLoop
          </Text>
        </div>

        {/* 搜索框 */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#8f959e' }} />}
            placeholder="搜索校园好物"
            style={{
              maxWidth: 440,
              height: 38,
              borderRadius: 19,
              background: '#f5f6f8',
              border: 'none',
            }}
          />
        </div>

        {/* 右侧：通知 + 用户 */}
        <Space size={20} style={{ flexShrink: 0 }}>
          <Badge dot offset={[-4, 4]}>
            <BellOutlined style={{ fontSize: 18, color: '#1f2329', cursor: 'pointer' }} />
          </Badge>
          <Dropdown menu={{ items: userMenu }} trigger={['click']}>
            <Space size={8} style={{ cursor: 'pointer' }}>
              <Avatar size={32} src="https://picsum.photos/seed/me/100/100" />
              <span style={{ fontSize: 14, color: '#1f2329' }}>同学</span>
              <DownOutlined style={{ fontSize: 10, color: '#8f959e' }} />
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <Layout>
        {/* ==================== 左侧侧边栏 ==================== */}
        <Sider
          width={200}
          style={{
            background: '#ffffff',
            borderRight: '1px solid #eef0f3',
            padding: '12px 8px',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={['transaction']}
            style={{ borderInlineEnd: 'none' }}
            items={menuItems}
          />
        </Sider>

        {/* ==================== 主内容区 ==================== */}
        <Content style={{ padding: '24px 32px', overflow: 'auto' }}>
          {/* 标题 */}
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2329', marginBottom: 8 }}>
            我的订单
          </div>

          {/* Tab 切换 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginBottom: 0 }}
          />

          {/* 订单卡片列表 */}
          <List
            dataSource={mockOrders}
            renderItem={(order) => (
              <List.Item key={order.id} style={{ padding: 0, marginBottom: 12, border: 'none' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '20px',
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #eef0f3',
                    gap: 20,
                  }}
                >
                  {/* 商品图片 */}
                  <img
                    src={order.image}
                    alt={order.title}
                    style={{
                      width: 120,
                      height: 90,
                      objectFit: 'cover',
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                  />

                  {/* 商品信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#1f2329',
                        marginBottom: 6,
                      }}
                    >
                      {order.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#8f959e', marginBottom: 8 }}>
                      订单编号：{order.orderNo} ｜ 下单时间：{order.time}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#2f6bff' }}>
                      ¥{order.price}
                    </div>
                  </div>

                  {/* 买卖双方 */}
                  <Space size={40} style={{ flexShrink: 0 }}>
                    {renderParty('买家', order.buyer.name, order.buyer.avatar)}
                    {renderParty('卖家', order.seller.name, order.seller.avatar)}
                  </Space>

                  {/* 状态标签 */}
                  <div style={{ width: 110, textAlign: 'center', flexShrink: 0 }}>
                    {renderStatusTag(order.status)}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default OrderListPage;