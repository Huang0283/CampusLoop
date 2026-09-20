import React from 'react';
import { Input, Avatar, Badge, Button } from 'antd';
import {
  HomeOutlined,
  ShopOutlined,
  FileSearchOutlined,
  MessageOutlined,
  SwapOutlined,
  BellOutlined,
  DownOutlined,
  BankFilled,
  CheckCircleFilled,
  StarFilled,
} from '@ant-design/icons';

const PRIMARY_COLOR = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER_COLOR = '#eef0f3';
const PRICE_RED = '#ff4d4f';
const SUCCESS_GREEN = '#23a26d';
const ORANGE = '#fa8c16';

interface OrderStep {
  key: string;
  title: string;
  time?: string;
  description: string;
  status: 'done' | 'current' | 'pending';
}

const orderSteps: OrderStep[] = [
  {
    key: 'pending-confirm',
    title: '待确认',
    time: '2026-09-18 10:00',
    description: '卖家已创建订单，等待买家确认',
    status: 'done',
  },
  {
    key: 'booked',
    title: '已预约',
    time: '2026-09-18 12:30',
    description: '双方已达成见面交易时间',
    status: 'done',
  },
  {
    key: 'meetup-arranged',
    title: '见面已安排',
    time: '2026-09-18 15:20',
    description: '双方已确认见面地点，等待完成交易',
    status: 'current',
  },
  {
    key: 'completed',
    title: '已完成',
    description: '等待双方确认完成交易',
    status: 'pending',
  },
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

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: 18,
  fontWeight: 600,
  color: TEXT_PRIMARY,
};

const OrderDetailPage: React.FC = () => {
  const handleConfirmComplete = () => {
    console.log('确认完成订单');
  };

  const handleCancelOrder = () => {
    console.log('取消订单');
  };

  const handleContact = () => {
    console.log('联系对方');
  };

  const renderStepDot = (status: OrderStep['status']) => {
    if (status === 'done') {
      return (
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: PRIMARY_COLOR,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <CheckCircleFilled style={{ fontSize: 12, color: '#ffffff' }} />
        </span>
      );
    }
    if (status === 'current') {
      return (
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: ORANGE,
            border: '4px solid #fff7e8',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            boxSizing: 'border-box',
          }}
        />
      );
    }
    return (
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#ffffff',
          border: `2px solid #c4c9cf`,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      />
    );
  };

  const renderParty = (
    role: '买家' | '卖家',
    name: string,
    avatar: string,
  ) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Avatar size={64} src={avatar} />
      <div>
        <div style={{ marginBottom: 6 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              background: role === '买家' ? '#f0f5ff' : LIGHT_TAG_BG,
              color: role === '买家' ? PRIMARY_COLOR : TEXT_SECONDARY,
            }}
          >
            {role}
          </span>
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: TEXT_PRIMARY,
            marginBottom: 6,
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 13,
            color: TEXT_SECONDARY,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircleFilled style={{ fontSize: 13, color: SUCCESS_GREEN }} />
            信誉良好
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <StarFilled style={{ fontSize: 13, color: '#fadb14' }} />
            评分 4.9
          </span>
        </div>
      </div>
    </div>
  );

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
            <BankFilled />
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
            <Avatar size={32} src="https://picsum.photos/seed/me/64/64" />
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
            {/* 标题 */}
            <h1
              style={{
                margin: '0 0 20px',
                fontSize: 28,
                fontWeight: 700,
                color: TEXT_PRIMARY,
              }}
            >
              订单详情
            </h1>

            <div
              style={{
                background: '#ffffff',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(31, 35, 41, 0.04)',
                display: 'flex',
                padding: '32px 40px',
                gap: 48,
              }}
            >
              {/* 左栏：商品信息 */}
              <div style={{ flex: 1.2, minWidth: 0 }}>
                <h2 style={sectionTitleStyle}>商品信息</h2>
                <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                  <img
                    src="https://picsum.photos/seed/monitor/400/300"
                    alt="戴尔 27 英寸显示器"
                    style={{
                      width: 200,
                      height: 150,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ paddingTop: 4 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        lineHeight: 1.4,
                      }}
                    >
                      戴尔 27 英寸显示器
                    </div>
                    <div
                      style={{
                        margin: '8px 0 14px',
                        fontSize: 24,
                        fontWeight: 700,
                        color: PRICE_RED,
                      }}
                    >
                      ¥899
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#fff7e8',
                        color: ORANGE,
                        fontSize: 13,
                        marginBottom: 16,
                      }}
                    >
                      见面已安排
                    </span>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                      订单编号OD20260918001
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${BORDER_COLOR}`,
                    paddingTop: 28,
                  }}
                >
                  <h2 style={sectionTitleStyle}>买卖双方</h2>
                  <div
                    style={{
                      display: 'flex',
                      gap: 48,
                      alignItems: 'flex-start',
                    }}
                  >
                    {renderParty('买家', '林同学', 'https://picsum.photos/seed/buyer/128/128')}
                    <div
                      style={{
                        width: 1,
                        alignSelf: 'stretch',
                        background: BORDER_COLOR,
                      }}
                    />
                    {renderParty('卖家', '王同学', 'https://picsum.photos/seed/seller/128/128')}
                  </div>
                </div>
              </div>

              {/* 右栏：订单进度 */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: `1px solid ${BORDER_COLOR}`,
                  paddingLeft: 48,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <h2 style={sectionTitleStyle}>订单进度</h2>
                <div style={{ flex: 1 }}>
                  {orderSteps.map((step, index) => (
                    <div
                      key={step.key}
                      style={{
                        display: 'flex',
                        gap: 16,
                        position: 'relative',
                        paddingBottom:
                          index === orderSteps.length - 1 ? 0 : 28,
                      }}
                    >
                      {/* 竖线 */}
                      {index !== orderSteps.length - 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 11,
                            top: 26,
                            width: 2,
                            height: 'calc(100% - 26px)',
                            background:
                              step.status === 'done'
                                ? PRIMARY_COLOR
                                : BORDER_COLOR,
                          }}
                        />
                      )}
                      {renderStepDot(step.status)}
                      <div style={{ paddingTop: 1 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight:
                              step.status === 'pending' ? 400 : 600,
                            color:
                              step.status === 'pending'
                                ? TEXT_SECONDARY
                                : TEXT_PRIMARY,
                            lineHeight: 1.4,
                          }}
                        >
                          {step.title}
                        </div>
                        {step.time && (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: TEXT_SECONDARY,
                            }}
                          >
                            {step.time}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: TEXT_SECONDARY,
                            lineHeight: 1.5,
                          }}
                        >
                          {step.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 底部操作按钮 */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginTop: 32,
                  }}
                >
                  <Button
                    type="primary"
                    size="large"
                    style={{ background: PRIMARY_COLOR, minWidth: 120 }}
                    onClick={handleConfirmComplete}
                  >
                    确认完成
                  </Button>
                  <Button
                    size="large"
                    danger
                    style={{ minWidth: 120 }}
                    onClick={handleCancelOrder}
                  >
                    取消订单
                  </Button>
                  <Button size="large" style={{ minWidth: 120 }} onClick={handleContact}>
                    联系对方
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const LIGHT_TAG_BG = '#f7f8fa';

export default OrderDetailPage;