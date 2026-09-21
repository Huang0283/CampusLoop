import React from 'react';
import { Input, Button } from 'antd';
import {
  MessageFilled,
  MoneyCollectFilled,
  AimOutlined,
  SettingFilled,
} from '@ant-design/icons';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { useNavigate } from 'react-router-dom';
import { useMockDbStore } from '../../stores/mockDb';
import type { AppNotification, NotificationType as ApiNotificationType } from '../../types/transaction';

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
  /** 点击后跳转的目标（由 mockDb 在产生通知时写入） */
  link?: string;
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

/** 业务通知类型 → 页面四个分组（消息 / 报价 / 匹配 / 系统） */
const GROUP_OF: Record<ApiNotificationType, NotificationType> = {
  MESSAGE: '消息',
  OFFER_RECEIVED: '报价',
  OFFER_ACCEPTED: '报价',
  OFFER_REJECTED: '报价',
  MATCH_FOUND: '匹配',
  ORDER_STATUS_CHANGED: '系统',
  MEETUP_REMINDER: '系统',
  REVIEW_REQUEST: '系统',
  REPORT_RESULT: '系统',
};

/** 相对时间：一天内相对显示，更早显示具体时间 */
function formatNotifyTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

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

/** 与 /market 完全一致：侧栏从页面顶部开始、通高、宽 220，内容为共享 AppSidebar */
const sidebarStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  bottom: 0,
  width: 220,
  background: '#ffffff',
  borderRight: `1px solid ${BORDER_COLOR}`,
  overflow: 'auto',
  zIndex: 120,
};

const NotificationPage: React.FC = () => {
  const navigate = useNavigate();

  /** 通知来自可变 mockDb：报价/订单/举报等动作会真实产生通知，且每条带 link */
  const rawNotifications = useMockDbStore((s) => s.notifications);
  const markNotificationRead = useMockDbStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useMockDbStore((s) => s.markAllNotificationsRead);

  const notifications: NotificationItem[] = rawNotifications.map((n: AppNotification) => ({
    id: n.id,
    type: GROUP_OF[n.type],
    title: n.title,
    description: n.content,
    time: formatNotifyTime(n.createdAt),
    read: n.read,
    link: n.link,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => markAllNotificationsRead();

  /** 点击一条通知：标为已读 + 跳到它指向的页面（订单详情、会话等） */
  const handleItemClick = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 220,
      }}
    >
      {/* 顶部导航栏 */}
      <header style={headerStyle}>
        {/* Logo 已统一到左侧栏 AppSidebar，这里仅保留占位以维持顶栏布局 */}
        <div style={{ width: 200 }} />

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
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* 左侧侧边栏 */}
        <aside style={sidebarStyle}>
          <AppSidebar />
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
                    onClick={() => handleItemClick(item)}
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