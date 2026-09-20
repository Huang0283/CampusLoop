import React, { useState } from 'react';
import { Input, Avatar, Badge, Button } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  FileSearchOutlined,
  MessageOutlined,
  SwapOutlined,
  BellOutlined,
  DownOutlined,
  UserOutlined,
  MessageFilled,
  MoneyCollectFilled,
  AimOutlined,
  SettingFilled,
} from '@ant-design/icons';

const PRIMARY_COLOR = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER_COLOR = '#eef0f3';
const UNREAD_BG = '#f0f5ff';
const DANGER_COLOR = '#ff4d4f';

type NotificationType = '消息' | '报价' | '匹配' | '系统';

interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const typeConfig: Record<
  NotificationType,
  { bg: string; icon: React.ReactNode }
> = {
  消息: {
    bg: '#2f6bff',
    icon: <MessageFilled style={{ fontSize: 20, color: '#ffffff' }} />,
  },
  报价: {
    bg: '#52c41a',
    icon: <MoneyCollectFilled style={{ fontSize: 22, color: '#ffffff' }} />,
  },
  匹配: {
    bg: '#fa8c16',
    icon: <AimOutlined style={{ fontSize: 20, color: '#ffffff' }} />,
  },
  系统: {
    bg: '#722ed1',
    icon: <SettingFilled style={{ fontSize: 20, color: '#ffffff' }} />,
  },
};

const initialNotifications: NotificationItem[] = [
  { id: 1, type: '消息', title: '王同学发来一条消息', description: '你好，请问显示器还在吗？', time: '今天 10:24', read: false },
  { id: 2, type: '报价', title: '收到新的报价', description: '李同学对「机械键盘」报价 ¥180', time: '今天 09:17', read: false },
  { id: 3, type: '匹配', title: '发现新的匹配商品', description: '有 3 件商品符合你的求购条件', time: '昨天 20:36', read: false },
  { id: 4, type: '系统', title: '系统通知', description: '你的商品已通过审核', time: '昨天 16:05', read: true },
  { id: 5, type: '消息', title: '张同学发来一条消息', description: '请问可以面交吗？我在东区', time: '昨天 11:28', read: true },
  { id: 6, type: '报价', title: '收到新的报价', description: '陈同学对「二手平板」报价 ¥650', time: '4月20日 19:14', read: true },
  { id: 7, type: '匹配', title: '发现新的匹配商品', description: '有 1 件商品符合你的求购条件', time: '4月20日 14:21', read: true },
  { id: 8, type: '系统', title: '系统通知', description: '平台将于 4 月 25 日进行系统维护', time: '4月19日 09:03', read: true },
];

interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'market', label: '市场', icon: <ShopOutlined /> },
  { key: 'wanted', label: '求购', icon: <FileSearchOutlined /> },
  { key: 'chat', label: '聊天', icon: <MessageOutlined /> },
  { key: 'transaction', label: '交易', icon: <SwapOutlined /> },
];

const headerStyle: React.CSSProperties = {
  height: 64,
  background: '#ffffff',
  borderBottom: `1px solid ${BORDER_COLOR}`,
  display: 'flex',
  alignItems: 'center',
  padding: '0 24px',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const sidebarStyle: React.CSSProperties = {
  width: 176,
  flexShrink: 0,
  background: '#ffffff',
  borderRight: `1px solid ${BORDER_COLOR}`,
  padding: '16px 8px',
};

const sidebarItemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  height: 44,
  padding: '0 16px',
  marginBottom: 4,
  borderRadius: 8,
  fontSize: 15,
  color: active ? PRIMARY_COLOR : TEXT_SECONDARY,
  background: active ? 'rgba(47, 107, 255, 0.08)' : 'transparent',
  borderLeft: active ? `3px solid ${PRIMARY_COLOR}` : '3px solid transparent',
  cursor: 'pointer',
  fontWeight: active ? 500 : 400,
});

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleItemClick = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 顶部导航栏 */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 200 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: PRIMARY_COLOR,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 16,
            }}
          >
            <SwapOutlined />
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              letterSpacing: 0.5,
            }}
          >
            CampusLoop
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Input.Search
            placeholder="搜索校园好物"
            style={{ maxWidth: 520, width: '100%' }}
            allowClear
            onSearch={(value) => console.log('搜索：', value)}
          />
        </div>

        <div
          style={{
            width: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 20,
          }}
        >
          <Badge dot offset={[-2, 2]}>
            <BellOutlined style={{ fontSize: 18, color: TEXT_PRIMARY }} />
          </Badge>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Avatar
              size={32}
              style={{ background: PRIMARY_COLOR }}
              icon={<UserOutlined />}
            />
            <span style={{ fontSize: 14, color: TEXT_PRIMARY }}>同学</span>
            <DownOutlined style={{ fontSize: 10, color: TEXT_SECONDARY }} />
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左侧侧边栏 */}
        <aside style={sidebarStyle}>
          {sidebarItems.map((item) => {
            const active = item.key === 'transaction';
            return (
              <div key={item.key} style={sidebarItemStyle(active)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </aside>

        {/* 主内容区 */}
        <main style={{ flex: 1, padding: '24px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* 标题行 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                }}
              >
                通知
              </h1>
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 12,
                    padding: '3px 10px',
                    borderRadius: 10,
                    background: '#fff1f0',
                    color: DANGER_COLOR,
                    fontSize: 13,
                  }}
                >
                  {unreadCount} 条未读
                </span>
              )}
              <div style={{ flex: 1 }} />
              <Button
                type="link"
                style={{ fontSize: 14, padding: 0 }}
                onClick={handleMarkAllRead}
              >
                全部标为已读
              </Button>
            </div>

            {/* 通知列表 */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(31, 35, 41, 0.04)',
                overflow: 'hidden',
              }}
            >
              {notifications.map((item, index) => {
                const config = typeConfig[item.type];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      padding: '18px 24px',
                      background: item.read ? '#ffffff' : UNREAD_BG,
                      borderBottom:
                        index === notifications.length - 1
                          ? 'none'
                          : `1px solid ${BORDER_COLOR}`,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* 未读红点 */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: item.read ? 'transparent' : DANGER_COLOR,
                        flexShrink: 0,
                      }}
                    />

                    {/* 类型圆形图标 */}
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: config.bg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {config.icon}
                    </span>

                    {/* 标题与描述 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: item.read ? 500 : 600,
                          color: TEXT_PRIMARY,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 14,
                          color: TEXT_SECONDARY,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.description}
                      </div>
                    </div>

                    {/* 时间 */}
                    <span
                      style={{
                        fontSize: 14,
                        color: TEXT_SECONDARY,
                        flexShrink: 0,
                      }}
                    >
                      {item.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationPage;