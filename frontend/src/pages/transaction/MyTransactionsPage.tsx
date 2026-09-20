import React, { useState } from 'react';
import {
  Avatar,
  Badge,
  ConfigProvider,
  Dropdown,
  Empty,
  Input,
  Menu,
  Space,
  Tabs,
} from 'antd';
import type { MenuProps, TabsProps } from 'antd';
import {
  BellOutlined,
  DownOutlined,
  HomeOutlined,
  MessageOutlined,
  SearchOutlined,
  ShoppingOutlined,
  SwapOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

type OrderStatus = '待确认' | '已预约' | '见面已安排' | '已完成';

interface Order {
  id: string;
  title: string;
  orderNo: string;
  time: string;
  price: number;
  buyer: string;
  seller: string;
  status: OrderStatus;
}

const PRIMARY = '#2f6bff';
const TEXT_MAIN = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER = '#eef0f3';
const PAGE_BG = '#f5f6f8';

/** 当前登录用户（用于“购买 / 出售”筛选） */
const CURRENT_USER = '林同学';

const ORDER_LIST: Order[] = [
  {
    id: '1',
    title: '戴尔 27 英寸显示器',
    orderNo: 'CL202405200001',
    time: '2024-05-20 14:32',
    price: 899,
    buyer: '林同学',
    seller: '王同学',
    status: '待确认',
  },
  {
    id: '2',
    title: '高等数学教材',
    orderNo: 'CL202405190021',
    time: '2024-05-19 10:18',
    price: 35,
    buyer: '陈同学',
    seller: '赵同学',
    status: '已预约',
  },
  {
    id: '3',
    title: '机械键盘',
    orderNo: 'CL202405180015',
    time: '2024-05-18 16:45',
    price: 220,
    buyer: '林同学',
    seller: '王同学',
    status: '见面已安排',
  },
  {
    id: '4',
    title: '宿舍收纳架',
    orderNo: 'CL202405170008',
    time: '2024-05-17 11:20',
    price: 28,
    buyer: '陈同学',
    seller: '赵同学',
    status: '已完成',
  },
  {
    id: '5',
    title: '人体工学椅',
    orderNo: 'CL202405150012',
    time: '2024-05-15 09:36',
    price: 450,
    buyer: '林同学',
    seller: '王同学',
    status: '见面已安排',
  },
];

const STATUS_STYLE: Record<OrderStatus, { background: string; color: string }> = {
  待确认: { background: '#e8f0ff', color: '#2f6bff' },
  已预约: { background: '#fff3e2', color: '#f29c0b' },
  见面已安排: { background: '#f3edff', color: '#8b5cf6' },
  已完成: { background: '#e6f7ee', color: '#22a06b' },
};

const PROCESSING_STATUS: OrderStatus[] = ['待确认', '已预约', '见面已安排'];

const MENU_ITEMS: NonNullable<MenuProps['items']> = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'market', icon: <ShoppingOutlined />, label: '市场' },
  { key: 'wanted', icon: <UnorderedListOutlined />, label: '求购' },
  { key: 'chat', icon: <MessageOutlined />, label: '聊天' },
  { key: 'transaction', icon: <SwapOutlined />, label: '交易' },
];

const TAB_ITEMS: TabsProps['items'] = [
  { key: 'all', label: '全部' },
  { key: 'buy', label: '购买' },
  { key: 'sell', label: '出售' },
  { key: 'processing', label: '进行中' },
  { key: 'finished', label: '已结束' },
];

/** 蓝色学士帽 Logo（antd 无内置学士帽图标，使用内联 SVG 还原） */
const GraduationCapIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M12 2.6 1.2 7.4 12 12.2l8.8-3.99V15h2V7.4L12 2.6z" fill={PRIMARY} />
    <path d="M5 11.3v4.3c0 1.66 3.13 3.4 7 3.4s7-1.74 7-3.4v-4.3l-7 3.18-7-3.18z" fill={PRIMARY} />
  </svg>
);

interface RoleBlockProps {
  label: '买家' | '卖家';
  name: string;
}

const RoleBlock: React.FC<RoleBlockProps> = ({ label, name }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 108 }}>
    <Avatar
      size={40}
      src={`https://picsum.photos/seed/${encodeURIComponent(name)}/80/80`}
    />
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
      <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_MAIN }}>{name}</span>
    </div>
  </div>
);

const StatusTag: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const style = STATUS_STYLE[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 76,
        height: 30,
        padding: '0 14px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        background: style.background,
        color: style.color,
      }}
    >
      {status}
    </span>
  );
};

const OrderCard: React.FC<{ order: Order }> = ({ order }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: 20,
      background: '#ffffff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(17, 24, 39, 0.05)',
    }}
  >
    <img
      src={`https://picsum.photos/seed/${encodeURIComponent(order.orderNo)}/240/180`}
      alt={order.title}
      style={{ width: 120, height: 90, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: TEXT_MAIN,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {order.title}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: TEXT_SECONDARY }}>
        订单编号：{order.orderNo} ｜ 下单时间：{order.time}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: PRIMARY }}>
        ¥{order.price}
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginLeft: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <RoleBlock label="买家" name={order.buyer} />
        <RoleBlock label="卖家" name={order.seller} />
      </div>
      <div style={{ marginLeft: 44 }}>
        <StatusTag status={order.status} />
      </div>
    </div>
  </div>
);

const filterOrders = (key: string): Order[] => {
  switch (key) {
    case 'buy':
      return ORDER_LIST.filter((o) => o.buyer === CURRENT_USER);
    case 'sell':
      return ORDER_LIST.filter((o) => o.seller === CURRENT_USER);
    case 'processing':
      return ORDER_LIST.filter((o) => PROCESSING_STATUS.includes(o.status));
    case 'finished':
      return ORDER_LIST.filter((o) => o.status === '已完成');
    default:
      return ORDER_LIST;
  }
};

const MyTransactionsPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('transaction');
  const [activeTab, setActiveTab] = useState('all');

  const orders = filterOrders(activeTab);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: PRIMARY,
          colorText: TEXT_MAIN,
          colorTextSecondary: TEXT_SECONDARY,
          colorBorder: BORDER,
          colorBgLayout: PAGE_BG,
          fontSize: 14,
        },
        components: {
          Menu: {
            itemBg: '#ffffff',
            itemColor: TEXT_MAIN,
            itemHoverBg: '#f5f7fa',
            itemSelectedBg: '#e8f0ff',
            itemSelectedColor: PRIMARY,
          },
          Tabs: {
            inkBarColor: PRIMARY,
            itemSelectedColor: PRIMARY,
          },
        },
      }}
    >
      <div
        style={{
          minHeight: '100vh',
          background: PAGE_BG,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 顶部导航栏 */}
        <header
          style={{
            height: 60,
            background: '#ffffff',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 24,
            flexShrink: 0,
          }}
        >
          <Space size={10} style={{ cursor: 'pointer' }}>
            <GraduationCapIcon size={28} />
            <span style={{ fontSize: 19, fontWeight: 700, color: TEXT_MAIN }}>
              CampusLoop
            </span>
          </Space>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#a8adb7' }} />}
            placeholder="搜索校园好物"
            style={{
              width: 360,
              height: 38,
              borderRadius: 999,
              background: '#f5f6f8',
              borderColor: 'transparent',
            }}
          />
          <Space size={22} style={{ marginLeft: 'auto' }}>
            <Badge dot offset={[-4, 4]}>
              <BellOutlined style={{ fontSize: 18, color: TEXT_MAIN, cursor: 'pointer' }} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人中心' },
                  { key: 'logout', label: '退出登录' },
                ],
              }}
            >
              <Space size={10} style={{ cursor: 'pointer' }}>
                <Avatar
                  size={34}
                  src="https://picsum.photos/seed/campus-user/68/68"
                />
                <span style={{ fontSize: 14, color: TEXT_MAIN }}>同学</span>
                <DownOutlined style={{ fontSize: 11, color: TEXT_SECONDARY }} />
              </Space>
            </Dropdown>
          </Space>
        </header>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* 左侧侧边栏 */}
          <aside
            style={{
              width: 208,
              flexShrink: 0,
              background: '#ffffff',
              borderRight: `1px solid ${BORDER}`,
              padding: '12px 8px',
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[activeMenu]}
              items={MENU_ITEMS}
              onClick={({ key }) => setActiveMenu(key)}
              style={{ borderInlineEnd: 'none' }}
            />
          </aside>

          {/* 主内容区 */}
          <main style={{ flex: 1, padding: '20px 24px', minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TEXT_MAIN }}>
              我的订单
            </h1>
            <Tabs
              activeKey={activeTab}
              items={TAB_ITEMS}
              onChange={setActiveTab}
              style={{ marginTop: 8 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {orders.length > 0 ? (
                orders.map((order) => <OrderCard key={order.id} order={order} />)
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 8,
                    padding: '64px 0',
                    boxShadow: '0 1px 3px rgba(17, 24, 39, 0.05)',
                  }}
                >
                  <Empty description="暂无相关订单" />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default MyTransactionsPage;