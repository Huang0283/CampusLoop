import React, { useState } from 'react';
import { Alert, Avatar, Badge, Button, Input, List, Modal, Popconfirm, Rate, Space, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Can } from '../../components';
import { OrderTimeline, ReportModal, ReviewModal } from '../../components/transaction';
import { useAuthStore } from '../../stores/auth';
import { useMockDbStore } from '../../stores/mockDb';
import { mockUsers } from '../../mocks/transaction';
import { resolveOrderRole } from '../../access/permissions';
import { ORDER_ACTION_MATRIX, ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '../../constants/order';
import type { OrderStatus } from '../../types/transaction';

const { Text } = Typography;

const PRIMARY_COLOR = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER_COLOR = '#eef0f3';
const PRICE_RED = '#ff4d4f';
const SUCCESS_GREEN = '#23a26d';
const ORANGE = '#fa8c16';
const LIGHT_TAG_BG = '#f7f8fa';

/** 订单状态机的前四个阶段（CANCELLED / DISPUTED 分别作为终止态与异常态处理） */
const STAGES: { status: OrderStatus; title: string; description: string }[] = [
  { status: 'PENDING_CONFIRM', title: '待确认', description: '订单已创建，等待双方确认见面约定' },
  { status: 'BOOKED', title: '已预约', description: '双方已达成见面交易时间' },
  { status: 'MEETUP_ARRANGED', title: '见面已安排', description: '双方已确认见面地点，等待完成交易' },
  { status: 'COMPLETED', title: '已完成', description: '双方各自确认后订单完成' },
];

interface OrderStep {
  key: string;
  title: string;
  time?: string;
  description: string;
  status: 'done' | 'current' | 'pending' | 'error';
}

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
  const { id } = useParams();
  const navigate = useNavigate();

  /** 订单数据来自可变 mockDb：按钮动作为真实状态机流转，非本地假动作 */
  const order = useMockDbStore((s) => s.orders.find((o) => o.id === Number(id)));
  const orderEvents = useMockDbStore((s) => s.events);
  const reviews = useMockDbStore((s) => s.reviews);

  const user = useAuthStore((s) => s.user);
  const switchUser = useAuthStore((s) => s.switchUser);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: PAGE_BG, padding: 48 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Alert type="warning" showIcon message="订单不存在" description={`未找到订单 #${id}`} />
          <Button style={{ marginTop: 16 }} onClick={() => navigate('/transactions')}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  /** 参与关系由登录态推导：buyer / seller / other */
  const myRole = resolveOrderRole(user?.id, order);
  const actions = myRole === 'other' ? [] : ORDER_ACTION_MATRIX[order.status][myRole];
  const confirmProgress = Number(order.buyerConfirmedComplete) + Number(order.sellerConfirmedComplete);
  const bothConfirmed = order.buyerConfirmedComplete && order.sellerConfirmedComplete;
  const myConfirmedComplete =
    myRole === 'buyer' ? order.buyerConfirmedComplete : myRole === 'seller' ? order.sellerConfirmedComplete : false;
  const orderReviews = reviews.filter((r) => r.orderId === order.id);
  const orderEventList = orderEvents.filter((e) => e.orderId === order.id);

  /** 步骤条数据：阶段状态由订单状态推导，时间取真实事件时间 */
  const steps: OrderStep[] = STAGES.map((stage, index) => {
    const reachedIndex = STAGES.findIndex((s) => s.status === order.status);
    const event = orderEventList.find((e) => e.toStatus === stage.status);
    let status: OrderStep['status'];
    if (order.status === 'DISPUTED') {
      // 争议态：冻结在转入争议前的位置，并标记 error
      status = stage.status === 'BOOKED' ? 'error' : index === 0 ? 'done' : 'pending';
    } else if (order.status === 'CANCELLED') {
      status = index === 0 ? 'done' : 'pending';
    } else if (reachedIndex === index) {
      status = 'current';
    } else {
      status = index < reachedIndex ? 'done' : 'pending';
    }
    return {
      key: stage.status,
      title: stage.title,
      time: event ? new Date(event.createdAt).toLocaleString('zh-CN', { hour12: false }) : undefined,
      description: event?.description ?? stage.description,
      status,
    };
  });

  /** 统一写操作入口：保留 600ms 模拟延迟，演示重复提交防护（提交期间按钮 loading） */
  const runAction = (key: string, fn: () => void) => {
    setSubmitting(key);
    setTimeout(() => {
      fn();
      setSubmitting(null);
    }, 600);
  };

  /**
   * 按钮本体：只负责形态（loading / 二次确认 / 弹窗）。
   * 可见性 / 禁用统一交给 <Can>（access/permissions.ts 求值），页面内不散落权限 if。
   */
  const renderActionButton = (a: (typeof actions)[number]) => {
    const loading = submitting === a.key;
    switch (a.key) {
      case 'viewMeetup':
        return (
          <Button size="large" style={{ minWidth: 120 }} onClick={() => navigate(`/transactions/${order.id}/meetup`)}>
            {a.label}
          </Button>
        );
      case 'confirmMeetup':
        return (
          <Button
            type="primary"
            size="large"
            style={{ background: PRIMARY_COLOR, minWidth: 120 }}
            loading={loading}
            onClick={() => runAction(a.key, () => useMockDbStore.getState().confirmMeetup(order.id))}
          >
            {a.label}
          </Button>
        );
      case 'confirmComplete':
        return myConfirmedComplete ? (
          <Button size="large" loading={loading} style={{ minWidth: 120 }}>
            已确认完成（等待对方）
          </Button>
        ) : (
          <Popconfirm
            title="确认本次交易已完成？"
            description="双方都确认后订单才会完成，操作不可撤销。"
            onConfirm={() => runAction(a.key, () => useMockDbStore.getState().confirmComplete(order.id))}
          >
            <Button type="primary" size="large" style={{ background: PRIMARY_COLOR, minWidth: 120 }} loading={loading}>
              {a.label}
            </Button>
          </Popconfirm>
        );
      case 'cancel':
        return (
          <Popconfirm
            title="确认取消该订单？"
            description="取消后商品会重新上架，操作不可撤销。"
            onConfirm={() => runAction(a.key, () => useMockDbStore.getState().cancelOrder(order.id))}
          >
            <Button danger size="large" style={{ minWidth: 120 }} loading={loading}>
              {a.label}
            </Button>
          </Popconfirm>
        );
      case 'writeReview':
        return (
          <Button type="primary" size="large" style={{ background: PRIMARY_COLOR, minWidth: 120 }} onClick={() => setReviewOpen(true)}>
            {a.label}
          </Button>
        );
      case 'viewReview':
        return (
          <Button size="large" style={{ minWidth: 120 }} onClick={() => setReviewsOpen(true)}>
            {a.label}
          </Button>
        );
      case 'report':
        return (
          <Button type="text" danger onClick={() => setReportOpen(true)}>
            {a.label}
          </Button>
        );
      default:
        // 矩阵 key 已穷举，这里仅为类型完整性兜底
        return (
          <Button size="large" style={{ minWidth: 120 }} loading={loading}>
            {a.label}
          </Button>
        );
    }
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
    if (status === 'error') {
      return (
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: PRICE_RED,
            border: '4px solid #fff1f0',
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

  const renderParty = (role: '买家' | '卖家', party: { id: number; nickname: string; avatar?: string; rating?: number; transactionCount?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Avatar size={64} src={party.avatar}>
        {party.nickname.slice(0, 1)}
      </Avatar>
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
            {user?.id === party.id ? '（我）' : ''}
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
          {party.nickname}
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
            评分 {party.rating ?? '-'} · {party.transactionCount ?? 0} 次交易
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
            <BellOutlined
              style={{ fontSize: 18, color: TEXT_PRIMARY, cursor: 'pointer' }}
              onClick={() => navigate('/notifications')}
            />
          </Badge>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Avatar size={32} src={user?.avatar}>
              {(user?.nickname ?? '游').slice(0, 1)}
            </Avatar>
            <span style={{ fontSize: 14, color: TEXT_PRIMARY }}>{user?.nickname ?? '未登录'}</span>
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
              <div
                key={item.key}
                style={sidebarItemStyle(active)}
                onClick={() => {
                  if (item.key === 'home') navigate('/');
                  if (item.key === 'market') navigate('/market');
                  if (item.key === 'wanted') navigate('/wanted');
                  if (item.key === 'chat') navigate('/chat');
                  if (item.key === 'transaction') navigate('/transactions');
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </aside>

        {/* 主内容区 */}
        <main style={{ flex: 1, padding: '24px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* 标题 + 原型演示用的身份切换（参与关系由全局登录身份推导） */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 20,
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY }}>订单详情</h1>
              <Space size={16}>
                {myRole !== 'other' && (
                  <a
                    style={{ fontSize: 13 }}
                    onClick={() => {
                      const peer = myRole === 'buyer' ? order.seller : order.buyer;
                      switchUser({ id: peer.id, nickname: peer.nickname, role: 'student' });
                    }}
                  >
                    [原型演示：切换为{myRole === 'buyer' ? '卖家' : '买家'}视角（当前身份 id={user?.id}）]
                  </a>
                )}
                <Button onClick={() => navigate('/transactions')}>返回列表</Button>
              </Space>
            </div>

            {/* 非参与方：操作区零按钮，仅可查看公开信息 */}
            {myRole === 'other' && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="你不是该订单的买卖双方"
                description="仅可查看公开信息，无法执行任何操作。"
              />
            )}

            {/* 约定修改提示：修改后旧确认失效（异常交互 #14） */}
            {order.status === 'PENDING_CONFIRM' && (order.meetup?.version ?? 1) > 1 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={`对方已修改见面约定（第 ${order.meetup!.version} 版），之前的确认已失效`}
                description="请查看新约定并重新确认；历史版本可在见面约定页查看。"
              />
            )}

            {/* 争议态：操作被冻结，取消按钮可见但禁用（tooltip 说明原因） */}
            {order.status === 'DISPUTED' && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message="该订单存在争议，已冻结操作"
                description="管理员正在处理，处理结果将通过通知中心告知双方。"
              />
            )}

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
                    src={`https://picsum.photos/seed/p${order.productId}/400/300`}
                    alt={order.product.title}
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
                      {order.product.title}
                    </div>
                    <div
                      style={{
                        margin: '8px 0 14px',
                        fontSize: 24,
                        fontWeight: 700,
                        color: PRICE_RED,
                      }}
                    >
                      ¥{order.amount}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <Tag color={ORDER_STATUS_COLOR[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Tag>
                      <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                        完成确认 {confirmProgress}/2 {bothConfirmed ? '（双方已确认）' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>订单编号 #{order.id}</div>
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
                    {renderParty('买家', order.buyer)}
                    <div
                      style={{
                        width: 1,
                        alignSelf: 'stretch',
                        background: BORDER_COLOR,
                      }}
                    />
                    {renderParty('卖家', order.seller)}
                  </div>
                  {myRole !== 'other' && (
                    <div style={{ marginTop: 16 }}>
                      <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/chat')}>
                        联系对方
                      </Button>
                    </div>
                  )}
                </div>

                {order.meetup && (
                  <div
                    style={{
                      borderTop: `1px solid ${BORDER_COLOR}`,
                      marginTop: 28,
                      paddingTop: 28,
                    }}
                  >
                    <h2 style={sectionTitleStyle}>见面约定（第 {order.meetup.version} 版）</h2>
                    <div style={{ fontSize: 14, color: TEXT_PRIMARY, lineHeight: 2 }}>
                      <div>
                        <span style={{ color: TEXT_SECONDARY }}>地点：</span>
                        {order.meetup.campusLocation}
                      </div>
                      <div>
                        <span style={{ color: TEXT_SECONDARY }}>时间：</span>
                        {order.meetup.scheduledDate} {order.meetup.timeSlotStart}-{order.meetup.timeSlotEnd}
                      </div>
                      <div>
                        <span style={{ color: TEXT_SECONDARY }}>备注：</span>
                        {order.meetup.note ?? '-'}
                      </div>
                      <div>
                        <span style={{ color: TEXT_SECONDARY }}>双方确认：</span>
                        买家 {order.meetup.buyerConfirmed ? '✅' : '⬜'} / 卖家 {order.meetup.sellerConfirmed ? '✅' : '⬜'}
                      </div>
                    </div>
                  </div>
                )}

                {orderEventList.length > 0 && (
                  <div
                    style={{
                      borderTop: `1px solid ${BORDER_COLOR}`,
                      marginTop: 28,
                      paddingTop: 28,
                    }}
                  >
                    <h2 style={sectionTitleStyle}>订单事件（不可变记录）</h2>
                    <OrderTimeline events={orderEventList} />
                  </div>
                )}
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
                  {steps.map((step, index) => (
                    <div
                      key={step.key}
                      style={{
                        display: 'flex',
                        gap: 16,
                        position: 'relative',
                        paddingBottom: index === steps.length - 1 ? 0 : 28,
                      }}
                    >
                      {/* 竖线 */}
                      {index !== steps.length - 1 && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 11,
                            top: 26,
                            width: 2,
                            height: 'calc(100% - 26px)',
                            background: step.status === 'done' ? PRIMARY_COLOR : BORDER_COLOR,
                          }}
                        />
                      )}
                      {renderStepDot(step.status)}
                      <div style={{ paddingTop: 1 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: step.status === 'pending' ? 400 : 600,
                            color:
                              step.status === 'error'
                                ? PRICE_RED
                                : step.status === 'pending'
                                  ? TEXT_SECONDARY
                                  : TEXT_PRIMARY,
                            lineHeight: 1.4,
                          }}
                        >
                          {step.title}
                          {step.status === 'error' && ' · 争议中'}
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

                {/* 底部操作按钮：全部经 <Can> 求值（参与关系 + 状态矩阵 → 显示 / 禁用 / 隐藏） */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    marginTop: 32,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {actions.map((a) => (
                    <Can key={a.key} order={order} action={a.key}>
                      {renderActionButton(a)}
                    </Can>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ReviewModal
        open={reviewOpen}
        orderId={order.id}
        peerNickname={myRole === 'buyer' ? order.seller.nickname : order.buyer.nickname}
        onClose={() => setReviewOpen(false)}
        onSubmit={(values) =>
          useMockDbStore.getState().submitReview({
            orderId: order.id,
            reviewerId: user?.id ?? 0,
            revieweeId: myRole === 'buyer' ? order.seller.id : order.buyer.id,
            ...values,
          })
        }
      />
      <ReportModal
        open={reportOpen}
        targetType="ORDER"
        targetId={order.id}
        targetLabel={order.product.title}
        onClose={() => setReportOpen(false)}
        onSubmit={(values) =>
          useMockDbStore.getState().submitReport({ targetType: 'ORDER', targetId: order.id, ...values })
        }
      />
      <Modal title={`订单 #${order.id} 的评价`} open={reviewsOpen} footer={null} onCancel={() => setReviewsOpen(false)}>
        {orderReviews.length === 0 ? (
          <Text type="secondary">暂无评价（原型简化：评价直接可见；正式版需双方都提交后互见）</Text>
        ) : (
          <List
            dataSource={orderReviews}
            renderItem={(r) => (
              <List.Item>
                <List.Item.Meta
                  title={`${mockUsers[r.reviewerId]?.nickname ?? `用户 ${r.reviewerId}`} · 总体`}
                  description={
                    <>
                      <Rate disabled value={r.overall} style={{ fontSize: 14 }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          描述 {r.descriptionAccuracy} · 沟通 {r.communication} · 守时 {r.punctuality}
                        </Text>
                      </div>
                      {r.comment && <div style={{ marginTop: 4 }}>{r.comment}</div>}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
