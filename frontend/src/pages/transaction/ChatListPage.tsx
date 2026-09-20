import React from 'react';
import { Input, Avatar, Badge } from 'antd';
import {
  BellOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { AppSidebar } from '../../components';

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

const chatSessions: ChatSession[] = [
  {
    id: 1,
    name: '王同学',
    lastMessage: '你好，这件商品还在吗？',
    time: '刚刚',
    unread: 2,
    avatar: 'https://picsum.photos/seed/chat1/104/104',
  },
  {
    id: 2,
    name: '陈同学',
    lastMessage: '可以在紫荆宿舍楼下交易',
    time: '10:24',
    unread: 1,
    avatar: 'https://picsum.photos/seed/chat2/104/104',
  },
  {
    id: 3,
    name: '赵同学',
    lastMessage: '我已经为你预留了',
    time: '昨天',
    unread: 3,
    avatar: 'https://picsum.photos/seed/chat3/104/104',
  },
  {
    id: 4,
    name: '李同学',
    lastMessage: '请问什么时候方便取货？',
    time: '昨天',
    unread: 0,
    avatar: 'https://picsum.photos/seed/chat4/104/104',
  },
  {
    id: 5,
    name: '周同学',
    lastMessage: '谢谢，交易很顺利',
    time: '周一',
    unread: 0,
    avatar: 'https://picsum.photos/seed/chat5/104/104',
  },
  {
    id: 6,
    name: '王同学',
    lastMessage: '可以再便宜一点吗？',
    time: '周一',
    unread: 0,
    avatar: 'https://picsum.photos/seed/chat6/104/104',
  },
  {
    id: 7,
    name: '陈同学',
    lastMessage: '好的，我稍后联系你',
    time: '周一',
    unread: 0,
    avatar: 'https://picsum.photos/seed/chat7/104/104',
  },
  {
    id: 8,
    name: '赵同学',
    lastMessage: '没问题，明天见',
    time: '周一',
    unread: 0,
    avatar: 'https://picsum.photos/seed/chat8/104/104',
  },
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
  const handleSessionClick = (session: ChatSession) => {
    console.log('打开会话：', session.name);
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
              src="https://picsum.photos/seed/me/64/64"
            />
            <span style={{ fontSize: 14, color: TEXT_PRIMARY }}>同学</span>
            <DownOutlined style={{ fontSize: 10, color: TEXT_SECONDARY }} />
          </div>
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