import React from 'react';
import { Input, Avatar, Button, Form, Rate, Alert, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar, EmptyState, NotificationBell, UserMenu } from '../../components';
import { useAuthStore } from '../../stores/auth';
import { useMockDbStore } from '../../stores/mockDb';

const PRIMARY_COLOR = '#2f6bff';
const PAGE_BG = '#f5f6f8';
const TEXT_PRIMARY = '#1f2329';
const TEXT_SECONDARY = '#646a73';
const BORDER_COLOR = '#eef0f3';
const STAR_YELLOW = '#fadb14';

interface ReviewFormValues {
  overall: number;
  accuracy: number;
  communication: number;
  punctuality: number;
  comment: string;
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

const ReviewPage: React.FC = () => {
  const [form] = Form.useForm<ReviewFormValues>();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const order = useMockDbStore((s) => s.orders.find((item) => item.id === Number(id)));
  const reviews = useMockDbStore((s) => s.reviews);
  const participant = user?.role === 'student' && order &&
    (user.id === order.buyer.id || user.id === order.seller.id);
  const alreadyReviewed = reviews.some((item) => item.orderId === Number(id) && item.reviewerId === user?.id);
  const reviewee = user?.id === order?.buyer.id ? order?.seller : order?.buyer;

  if (!order || !participant) return <EmptyState description="订单不存在或你无权评价此订单" />;
  if (order.status !== 'COMPLETED' || alreadyReviewed) return (
    <Alert type="warning" showIcon message={alreadyReviewed ? '你已评价过此订单' : '仅双方已完成的订单可以评价'}
      action={<Button onClick={() => navigate(`/transactions/${order.id}`)}>返回订单</Button>} />
  );

  const handleFinish = (values: ReviewFormValues) => {
    if (!user || !reviewee) return;
    const saved = useMockDbStore.getState().submitReview({
      orderId: order.id, reviewerId: user.id, revieweeId: reviewee.id,
      overall: values.overall, descriptionAccuracy: values.accuracy,
      communication: values.communication, punctuality: values.punctuality,
      comment: values.comment,
    });
    if (!saved) {
      message.error('评价未保存：评分须为 1–5 星，且仅限已完成订单的参与方评价一次');
      return;
    }
    message.success('评价已保存（Phase 2 Mock）');
    navigate(`/transactions/${order.id}`);
  };

  const renderRateRow = (
    label: string,
    name: keyof ReviewFormValues,
    initialValue: number,
  ) => (
    <Form.Item
      name={name}
      initialValue={initialValue}
      rules={[{ type: 'number', min: 1, max: 5, required: true, message: '请选择 1–5 星' }]}
      style={{ marginBottom: 0 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          padding: '12px 0',
        }}
      >
        <span
          style={{
            width: 100,
            textAlign: 'right',
            fontSize: 15,
            fontWeight: 500,
            color: TEXT_PRIMARY,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        <Rate
          style={{ color: STAR_YELLOW, fontSize: 24 }}
          allowClear={false}
          onChange={(value) => form.setFieldValue(name, value)}
        />
        <span style={{ fontSize: 14, color: TEXT_SECONDARY }}>
          <Form.Item noStyle shouldUpdate>
            {() => {
              const value = form.getFieldValue(name) ?? initialValue;
              return Number(value).toFixed(1);
            }}
          </Form.Item>
        </span>
      </div>
    </Form.Item>
  );

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
        <main style={{ flex: 1, padding: '40px 24px' }}>
          <div
            style={{
              maxWidth: 780,
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: 12,
              padding: '40px 48px',
              boxShadow: '0 1px 4px rgba(31, 35, 41, 0.04)',
            }}
          >
            {/* 标题 */}
            <h1
              style={{
                margin: '0 0 32px',
                fontSize: 26,
                fontWeight: 700,
                color: TEXT_PRIMARY,
              }}
            >
              评价交易
            </h1>

            {/* 被评价人信息 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 32,
              }}
            >
              <Avatar
                size={96}
                src={reviewee?.avatar}
              />
              <div
                style={{
                  marginTop: 12,
                  fontSize: 20,
                  fontWeight: 600,
                  color: TEXT_PRIMARY,
                }}
              >
                {reviewee?.nickname}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  color: TEXT_SECONDARY,
                }}
              >
                评价本次交易
              </div>
            </div>

            {/* 分割线 */}
            <div
              style={{
                borderTop: `1px solid ${BORDER_COLOR}`,
                marginBottom: 24,
              }}
            />

            {/* 表单 */}
            <Form<ReviewFormValues>
              form={form}
              layout="vertical"
              onFinish={handleFinish}
              initialValues={{
                overall: 5,
                accuracy: 5,
                communication: 5,
                punctuality: 5,
                comment: '',
              }}
            >
              {/* 评分区 */}
              <div style={{ marginBottom: 8 }}>
                {renderRateRow('总体评分', 'overall', 5)}
                {renderRateRow('描述准确', 'accuracy', 5)}
                {renderRateRow('沟通', 'communication', 5)}
                {renderRateRow('守时', 'punctuality', 5)}
              </div>

              {/* 分割线 */}
              <div
                style={{
                  borderTop: `1px solid ${BORDER_COLOR}`,
                  margin: '20px 0 24px',
                }}
              />

              {/* 交易评价 */}
              <Form.Item
                label={
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: TEXT_PRIMARY,
                    }}
                  >
                    交易评价
                  </span>
                }
                name="comment"
                rules={[{ max: 1000, message: '最多 1000 字' }]}
                style={{ marginBottom: 6 }}
              >
                <Input.TextArea
                  rows={4}
                  style={{ minHeight: 100, resize: 'vertical' }}
                  placeholder="请输入交易评价"
                />
              </Form.Item>
              <div
                style={{
                  fontSize: 13,
                  color: TEXT_SECONDARY,
                  marginBottom: 20,
                }}
              >
                评价将帮助更多同学安心交易
              </div>

              {/* 提交按钮 */}
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  style={{
                    height: 46,
                    fontSize: 16,
                    fontWeight: 500,
                    background: PRIMARY_COLOR,
                  }}
                >
                  提交评价
                </Button>
              </Form.Item>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReviewPage;
