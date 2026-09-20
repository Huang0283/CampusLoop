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
import { useNavigate } from 'react-router-dom';
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
import { useAuthStore } from '../../stores/auth';
import { useMockDbStore } from '../../stores/mockDb';
import { ORDER_STATUS_LABEL } from '../../constants/order';
import type { Order, OrderStatus } from '../../types/transaction';

const PRIMARY = '#2f6bff';
const TEXT_MAIN = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER = '#eef0f3';
const PAGE_BG = '#f5f6f8';

const STATUS_STYLE: Record<OrderStatus, { background: string; color: string }> = {
  PENDING_CONFIRM: { background: '#e8f0ff', color: '#2f6bff' },
  BOOKED: { background: '#fff3e2', color: '#f29c0b' },
  MEETUP_ARRANGED: { background: '#f3edff', color: '#8b5cf6' },
  COMPLETED: { background: '#e6f7ee', color: '#22a06b' },
  CANCELLED: { background: '#f2f3f5', color: '#646a73' },
  DISPUTED: { background: '#ffefef', color: '#ff4d4f' },
};

/** 进行中：尚未走到终态（争议中仍属未结束，需管理员裁决） */
const PROCESSING_STATUS: OrderStatus[] = ['PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED', 'DISPUTED'];
/** 已结束：完成或取消 */
const FINISHED_STATUS: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

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
    <Avatar size={40} src={`https://picsum.photos/seed/${encodeURIComponent(name)}/80/80`} />
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
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
};

const OrderCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      padding: 20,
      background: '#ffffff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(17, 24, 39, 0.05)',
      cursor: 'pointer',
    }}
  >
    <img
      src={`https://picsum.photos/seed/p${order.productId}/240/180`}
      alt={order.product.title}
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
        {order.product.title}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: TEXT_SECONDARY }}>
        订单编号：#{order.id} ｜ 下单时间：
        {new Date(order.createdAt).toLocaleString('zh-CN', { hour12: false })}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: PRIMARY }}>¥{order.amount}</div>
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
        <RoleBlock label="买家" name={order.buyer.nickname} />
        <RoleBlock label="卖家" name={order.seller.nickname} />
      </div>
      <div style={{ marginLeft: 44 }}>
        <StatusTag status={order.status} />
      </div>
    </div>
  </div>
);

/**
 * 按 tab 过滤：购买 / 出售 依赖当前登录身份（与订单页按钮权限同一份身份），
 * 不再使用写死的用户名——切到卖家身份后「购买」为空、「出售」出现订单。
 */
const filterOrders = (key: string, orders: Order[], userId: number | undefined): Order[] => {
  switch (key) {
    case 'buy':
      return orders.filter((o) => o.buyer.id === userId);
    case 'sell':
      return orders.filter((o) => o.seller.id === userId);
    case 'processing':
      return orders.filter((o) => PROCESSING_STATUS.includes(o.status));
    case 'finished':
      return orders.filter((o) => FINISHED_STATUS.includes(o.status));
    default:
      return orders;
  }
};

const MyTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('transaction');
  const [activeTab, setActiveTab] = useState('all');

  const orders = useMockDbStore((s) => s.orders);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const visibleOrders = filterOrders(activeTab, orders, user?.id);
  const myOrders = orders.filter((o) => o.buyer.id === user?.id || o.seller.id === user?.id);

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
          <Space size={10} style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            <GraduationCapIcon size={28} />
            <span style={{ fontSize: 19, fontWeight: 700, color: TEXT_MAIN }}>CampusLoop</span>
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
              <BellOutlined
                style={{ fontSize: 18, color: TEXT_MAIN, cursor: 'pointer' }}
                onClick={() => navigate('/notifications')}
              />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人中心' },
                  { key: 'logout', label: '退出登录' },
                ],
                onClick: ({ key }) => {
                  if (key === 'profile') navigate('/profile');
                  if (key === 'logout') {
                    logout();
                    navigate('/login');
                  }
                },
              }}
            >
              <Space size={10} style={{ cursor: 'pointer' }}>
                <Avatar size={34} src={user?.avatar}>
                  {(user?.nickname ?? '游').slice(0, 1)}
                </Avatar>
                <span style={{ fontSize: 14, color: TEXT_MAIN }}>{user?.nickname ?? '未登录'}</span>
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
              onClick={({ key }) => {
                setActiveMenu(key);
                if (key === 'home') navigate('/');
                if (key === 'market') navigate('/market');
                if (key === 'wanted') navigate('/wanted');
                if (key === 'chat') navigate('/chat');
              }}
              style={{ borderInlineEnd: 'none' }}
            />
          </aside>

          {/* 主内容区 */}
          <main style={{ flex: 1, padding: '20px 24px', minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TEXT_MAIN }}>我的订单</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: TEXT_SECONDARY }}>
              当前身份：{user?.nickname ?? '未登录'}（id={user?.id ?? '-'}）｜ 与我相关订单 {myOrders.length} 笔
              ｜ 切换身份：在订单详情页点「切换为对方视角」
            </div>
            <Tabs activeKey={activeTab} items={TAB_ITEMS} onChange={setActiveTab} style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {visibleOrders.length > 0 ? (
                visibleOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onClick={() => navigate(`/transactions/${order.id}`)} />
                ))
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
