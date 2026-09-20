import {
  Alert,
  Button,
  Card,
  Descriptions,
  List,
  Modal,
  Popconfirm,
  Rate,
  Space,
  Steps,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Can, EmptyState, PageContainer } from '../../components'
import { OrderTimeline, ReportModal, ReviewModal } from '../../components/transaction'
import { useAuthStore } from '../../stores/auth'
import { useMockDbStore } from '../../stores/mockDb'
import { mockUsers } from '../../mocks/transaction'
import { resolveOrderRole } from '../../access/permissions'
import {
  ORDER_ACTION_MATRIX,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
} from '../../constants/order'
const { Text, Title } = Typography

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  /** 订单数据来自可变 mockDb：按钮动作会真实改变状态、事件、通知 */
  const order = useMockDbStore((s) => s.orders.find((o) => o.id === Number(id)))
  const orderEvents = useMockDbStore((s) => s.events)
  const reviews = useMockDbStore((s) => s.reviews)
  const user = useAuthStore((s) => s.user)
  const switchUser = useAuthStore((s) => s.switchUser)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  if (!order) return <EmptyState description="订单不存在" />

  /** 身份不再本地 useState 模拟，而是从登录态推导参与关系 */
  const myRole = resolveOrderRole(user?.id, order)
  const actions = myRole === 'other' ? [] : ORDER_ACTION_MATRIX[order.status][myRole]
  const bothConfirmed = order.buyerConfirmedComplete && order.sellerConfirmedComplete
  const myConfirmedComplete =
    myRole === 'buyer' ? order.buyerConfirmedComplete : myRole === 'seller' ? order.sellerConfirmedComplete : false
  const confirmProgress =
    Number(order.buyerConfirmedComplete) + Number(order.sellerConfirmedComplete)
  const orderReviews = reviews.filter((r) => r.orderId === order.id)

  /** 统一写操作入口：保留 600ms 模拟延迟，演示重复提交防护（提交期间按钮 loading） */
  const runAction = (key: string, fn: () => void) => {
    setSubmitting(key)
    setTimeout(() => {
      fn()
      setSubmitting(null)
    }, 600)
  }

  /**
   * 按钮本体：只负责形态（loading / 二次确认 / 弹窗）。
   * 可见性 / 禁用统一交给 <Can>（access/permissions.ts 求值），
   * 页面内不再散落 if 判断权限。
   */
  const renderActionButton = (a: (typeof actions)[number]) => {
    const loading = submitting === a.key

    switch (a.key) {
      case 'viewMeetup':
        return (
          <Button onClick={() => navigate(`/transactions/${order.id}/meetup`)}>{a.label}</Button>
        )
      case 'confirmMeetup':
        return (
          <Button type="primary" loading={loading} onClick={() => runAction(a.key, () => useMockDbStore.getState().confirmMeetup(order.id))}>
            {a.label}
          </Button>
        )
      case 'confirmComplete':
        return myConfirmedComplete && !bothConfirmed ? (
          <Tooltip title="你已确认，等待对方确认">
            <Button disabled>等待对方确认</Button>
          </Tooltip>
        ) : (
          <Popconfirm title="确认已完成线下面交？" onConfirm={() => runAction(a.key, () => useMockDbStore.getState().confirmComplete(order.id))}>
            <Button type="primary" loading={loading}>
              {a.label}
            </Button>
          </Popconfirm>
        )
      case 'cancel':
        return (
          <Popconfirm title="确认取消该订单？" onConfirm={() => runAction(a.key, () => useMockDbStore.getState().cancelOrder(order.id))}>
            <Button danger loading={loading}>
              {a.label}
            </Button>
          </Popconfirm>
        )
      case 'writeReview':
        return <Button type="primary" onClick={() => setReviewOpen(true)}>{a.label}</Button>
      case 'viewReview':
        return <Button onClick={() => setReviewsOpen(true)}>{a.label}</Button>
      case 'report':
        return (
          <Button type="text" danger onClick={() => setReportOpen(true)}>
            {a.label}
          </Button>
        )
      default:
        return <Button onClick={() => runAction(a.key, () => {})}>{a.label}</Button>
    }
  }

  return (
    <PageContainer
      title={`订单 #${order.id}`}
      extra={
        <Space>
          {myRole !== 'other' && (
            <a
              onClick={() => {
                /** 切换全局登录身份到对方（真实环境不存在，仅演示参与关系推导） */
                const peer = myRole === 'buyer' ? order.seller : order.buyer
                switchUser({ id: peer.id, nickname: peer.nickname, role: 'student' })
              }}
            >
              [原型演示：切换为{myRole === 'buyer' ? '卖家' : '买家'}视角（当前身份 id={user?.id}）]
            </a>
          )}
          <Button onClick={() => navigate('/transactions')}>返回列表</Button>
        </Space>
      }
    >
      {/* 非订单参与方：按钮全部隐藏，仅可查看公开信息 */}
      {myRole === 'other' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="你不是该订单的买卖双方"
          description="仅可查看公开信息，无法执行任何操作。"
        />
      )}

      {/* 约定修改提示（任务 #14） */}
      {order.status === 'PENDING_CONFIRM' && (order.meetup?.version ?? 1) > 1 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`对方已修改见面约定（第 ${order.meetup!.version} 版），之前的确认已失效`}
          description="请查看新约定并重新确认；历史版本可在见面约定页查看。"
        />
      )}

      {order.status === 'DISPUTED' && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="该订单存在争议，已冻结操作"
          description="管理员正在处理，处理结果将通过通知中心告知双方。"
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Tag color={ORDER_STATUS_COLOR[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Tag>
            <Title level={4} style={{ margin: 0 }}>¥{order.amount}</Title>
            <Text type="secondary">{order.product.title}</Text>
          </Space>
          {/* 每个按钮经 <Can> 求值：参与关系 + 状态矩阵 → 显示 / 禁用 / 隐藏 */}
          <Space>
            {actions.map((a) => (
              <Can key={a.key} order={order} action={a.key}>
                {renderActionButton(a)}
              </Can>
            ))}
          </Space>
        </div>
      </Card>

      <Card title="交易进度" style={{ marginBottom: 16 }}>
        <Steps
          size="small"
          current={['PENDING_CONFIRM', 'BOOKED', 'MEETUP_ARRANGED', 'COMPLETED'].indexOf(
            order.status === 'DISPUTED' ? 'BOOKED' : order.status
          )}
          status={order.status === 'DISPUTED' ? 'error' : undefined}
          items={['待确认', '已预约', '见面已安排', '已完成'].map((t) => ({ title: t }))}
        />
        <Descriptions
          style={{ marginTop: 16 }}
          column={2}
          items={[
            { key: 'buyer', label: '买家', children: order.buyer.nickname },
            { key: 'seller', label: '卖家', children: order.seller.nickname },
            { key: 'created', label: '创建时间', children: new Date(order.createdAt).toLocaleString('zh-CN', { hour12: false }) },
            {
              key: 'confirm',
              label: '完成确认进度',
              children: `${confirmProgress}/2 ${bothConfirmed ? '✅ 双方已确认' : '（双方独立确认同一预约版本后订单完成）'}`,
            },
          ]}
        />
      </Card>

      {order.meetup && (
        <Card
          title={`见面约定（第 ${order.meetup.version} 版）`}
          extra={
            <Button type="link" onClick={() => navigate(`/transactions/${order.id}/meetup`)}>
              查看 / 修改
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions
            column={2}
            items={[
              { key: 'loc', label: '地点', children: order.meetup.campusLocation },
              {
                key: 'time',
                label: '时间',
                children: `${order.meetup.scheduledDate} ${order.meetup.timeSlotStart}-${order.meetup.timeSlotEnd}`,
              },
              { key: 'note', label: '备注', children: order.meetup.note ?? '-' },
              {
                key: 'conf',
                label: '双方确认',
                children: `买家 ${order.meetup.buyerConfirmed ? '✅' : '⬜'} / 卖家 ${order.meetup.sellerConfirmed ? '✅' : '⬜'}`,
              },
            ]}
          />
        </Card>
      )}

      <Card title="订单事件（不可变记录）">
        <OrderTimeline events={orderEvents.filter((e) => e.orderId === order.id)} />
      </Card>

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
      <Modal
        title={`订单 #${order.id} 的评价`}
        open={reviewsOpen}
        footer={null}
        onCancel={() => setReviewsOpen(false)}
      >
        {orderReviews.length === 0 ? (
          <Text type="secondary">
            暂无评价（原型简化：评价直接可见；正式版需双方都提交后互见）
          </Text>
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
    </PageContainer>
  )
}
