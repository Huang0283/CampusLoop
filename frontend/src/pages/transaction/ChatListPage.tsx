import React from 'react';
import { Input, Avatar, Badge } from 'antd';
import { AppSidebar, NotificationBell, UserMenu } from '../../components';
import { useNavigate } from 'react-router-dom';
import { mockSessions } from '../../mocks/transaction';
import type { Message } from '../../types/transaction';

const PAGE_BG = '#f5f6f8';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER_COLOR = '#eef0f3';
const DANGER_COLOR = '#ff4d4f';

interface ChatSession {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}


/** 会话列表一行摘要：按消息类型给不同文案 */
function lastMessageText(m?: Message): string {
  if (!m) return '还没有消息';
  switch (m.kind) {
    case 'TEXT':
      return m.content ?? '';
    case 'IMAGE':
      return '[图片]';
    case 'OFFER':
      return m.offer ? `报价 ¥${m.offer.amount}` : '[报价]';
    case 'ORDER_EVENT':
      return m.orderEvent?.description ?? '[订单动态]';
    default:
      return '[系统消息]';
  }
}

/** 列表时间：一天内用相对时间，更早显示具体时间 */
function formatListTime(iso?: string): string {
  if (!iso) return '';
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

const ChatListPage: React.FC = () => {
  const navigate = useNavigate();

  /**
   * 会话列表与聊天详情页共用同一份 mockSessions，
   * 因此列表里的 id 就是 /chat/:id 能打开的会话（此前列表用本地假数据，点进去会"会话不存在"）。
   */
  const chatSessions: ChatSession[] = mockSessions.map((s) => ({
    id: s.id,
    name: s.peer.nickname,
    avatar: s.peer.avatar ?? `https://i.pravatar.cc/96?u=${s.peer.id}`,
    lastMessage: lastMessageText(s.lastMessage),
    time: formatListTime(s.lastMessage?.createdAt),
    unread: s.unreadCount,
  }));

  const handleSessionClick = (session: ChatSession) => {
    navigate(`/chat/${session.id}`);
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
            {/* 标题 */}
            <h1
              style={{
                margin: '0 0 20px',
                fontSize: 28,
                fontWeight: 700,
                color: TEXT_PRIMARY,
              }}
            >
              聊天
            </h1>

            {/* 会话列表 */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(31, 35, 41, 0.04)',
                overflow: 'hidden',
              }}
            >
              {chatSessions.map((session, index) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 24px',
                    borderBottom:
                      index === chatSessions.length - 1
                        ? 'none'
                        : `1px solid ${BORDER_COLOR}`,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f8fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  {/* 头像 */}
                  <Avatar size={52} src={session.avatar} />

                  {/* 昵称与最后消息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        lineHeight: 1.4,
                      }}
                    >
                      {session.name}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 14,
                        color: TEXT_SECONDARY,
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {session.lastMessage}
                    </div>
                  </div>

                  {/* 时间与未读数 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                      {session.time}
                    </span>
                    {session.unread > 0 && (
                      <Badge
                        count={session.unread}
                        style={{
                          background: DANGER_COLOR,
                          fontSize: 12,
                          minWidth: 20,
                          height: 20,
                          lineHeight: '20px',
                          borderRadius: 10,
                          boxShadow: 'none',
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatListPage;
