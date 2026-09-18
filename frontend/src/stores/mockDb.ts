/**
 * 原型可变数据层（mockDb）
 *
 * 作用：把"按钮点击"从 toast 演示升级为真实的状态机流转——
 *   报价 PENDING → ACCEPTED → 订单 PENDING_CONFIRM → MEETUP_ARRANGED → COMPLETED
 *   全链路可以在双账号视角下点出来，且状态/事件/通知/会话消息同步变化。
 *
 * 设计约束（与 M6 联调时整体替换用）：
 * - 每个 action 对应一个后端接口；页面只订阅本 store 的数据，
 *   接入真实后端时把"action 改数据"换成"调接口 + WS 推送刷新"，页面不动。
 * - 状态迁移遵守 docs/frontend/m4/01-transaction-state-machine.md：
 *   修改约定 → version+1 + 双方确认失效 + 订单回到待确认。
 * - 产生的会话内消息通过 realtime store 的 injectMessage 走完整去重分发链路。
 *
 * ⚠ 原型阶段专用：与 mocks/ 一起在 M6 联调时整体删除。
 */

import { create } from 'zustand'
import { OFFER_EXPIRE_HOURS } from '../constants/offer'
import {
  CURRENT_USER_ID,
  mockNotifications,
  mockOffers,
  mockOrderEvents,
  mockOrders,
  mockProducts,
  mockUsers,
} from '../mocks/transaction'
import type {
  AppNotification,
  NotificationType,
  Offer,
  Order,
  OrderEventBrief,
  OrderStatus,
  ProductBrief,
  Report,
  ReportReason,
  ReportTargetType,
  Review,
} from '../types/transaction'
import type { Message } from '../types/transaction'
import { useAuthStore } from './auth'
import { useRealtimeStore } from './realtime'

/* ---------- 种子（深拷贝，避免污染模块常量） ---------- */

function seed() {
  return {
    orders: structuredClone(mockOrders),
    events: structuredClone(mockOrderEvents),
    offers: structuredClone(mockOffers),
    notifications: structuredClone(mockNotifications),
    products: structuredClone(mockProducts) as Record<number, ProductBrief>,
    reviews: [] as Review[],
    reports: [] as Report[],
  }
}

const initial = seed()

/* id 续发器：从种子最大值继续，resetDemo 不重置以保证唯一 */
const seq = {
  order: Math.max(...initial.orders.map((o) => o.id)),
  event: Math.max(...initial.events.map((e) => e.id)),
  offer: Math.max(...initial.offers.map((o) => o.id)),
  meetup: Math.max(...initial.orders.map((o) => o.meetup?.id ?? 0)),
  notification: Math.max(...initial.notifications.map((n) => n.id)),
  message: 10000,
  review: 0,
  report: 0,
}
const nextId = (k: keyof typeof seq): number => (seq[k] += 1)

/** 当前操作者：登录态优先，原型回退到 mock 主账号 */
function operatorId(): number {
  return useAuthStore.getState().user?.id ?? CURRENT_USER_ID
}

function genClientMsgId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* ---------- 对外输入类型 ---------- */

export interface MeetupInput {
  campusLocation: string
  scheduledDate: string
  timeSlotStart: string
  timeSlotEnd: string
  note?: string
}

export interface ReviewInput {
  orderId: number
  reviewerId: number
  revieweeId: number
  overall: number
  descriptionAccuracy: number
  communication: number
  punctuality: number
  comment?: string
}

export interface ReportInput {
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  description?: string
}

interface MockDbState {
  orders: Order[]
  events: OrderEventBrief[]
  offers: Offer[]
  notifications: AppNotification[]
  products: Record<number, ProductBrief>
  reviews: Review[]
  reports: Report[]

  /* 见面约定 */
  saveMeetup: (orderId: number, input: MeetupInput) => void
  confirmMeetup: (orderId: number) => void
  /* 订单 */
  confirmComplete: (orderId: number) => void
  cancelOrder: (orderId: number) => void
  /* 报价 */
  createOffer: (sessionId: number, peerId: number, product: ProductBrief, amount: number) => Offer
  acceptOffer: (offerId: number) => void
  rejectOffer: (offerId: number) => void
  counterOffer: (offerId: number, amount: number) => void
  withdrawOffer: (offerId: number) => void
  /* 评价 / 举报 */
  submitReview: (input: ReviewInput) => void
  submitReport: (input: ReportInput) => void
  /* 通知 */
  markNotificationRead: (id: number) => void
  markAllNotificationsRead: () => void
  /* 演示 */
  resetDemo: () => void
}

export const useMockDbStore = create<MockDbState>()((set, get) => {
  const now = () => new Date().toISOString()

  const pushEvent = (
    orderId: number,
    from: OrderStatus | undefined,
    to: OrderStatus,
    description: string,
    operatorId?: number
  ): OrderEventBrief => {
    const event: OrderEventBrief = {
      id: nextId('event'),
      orderId,
      fromStatus: from,
      toStatus: to,
      description,
      operatorId,
      createdAt: now(),
    }
    set((s) => ({ events: [...s.events, event] }))
    return event
  }

  const notify = (type: NotificationType, title: string, content: string, link?: string): void => {
    const n: AppNotification = {
      id: nextId('notification'),
      type,
      title,
      content,
      link,
      read: false,
      createdAt: now(),
    }
    set((s) => ({ notifications: [n, ...s.notifications] }))
  }

  /** 会话内注入消息：走实时链路去重分发，断线时退回"服务端已存、补拉取回" */
  const inject = (message: Message): void => {
    useRealtimeStore.getState().injectMessage(message)
  }

  const msgBase = (sessionId: number, senderId: number) => ({
    id: nextId('message'),
    clientMsgId: genClientMsgId(),
    sessionId,
    senderId,
    createdAt: now(),
  })

  const patchOrder = (orderId: number, patch: Partial<Order>): void => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, ...patch, updatedAt: now() } : o)),
    }))
  }

  const patchProduct = (productId: number, status: ProductBrief['status']): void => {
    set((s) => {
      const p = s.products[productId]
      if (!p) return {}
      return { products: { ...s.products, [productId]: { ...p, status } } }
    })
  }

  const getOrder = (orderId: number): Order | undefined =>
    get().orders.find((o) => o.id === orderId)

  return {
    ...initial,

    /* ---------- 见面约定 ---------- */

    /** 保存/修改约定：version+1，双方确认失效，订单回到待确认 */
    saveMeetup: (orderId, input) => {
      const order = getOrder(orderId)
      if (!order || ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(order.status)) return
      const op = operatorId()
      const who = op === order.buyer.id ? '买家' : '卖家'
      const prev = order.meetup
      const meetup = {
        id: prev?.id ?? nextId('meetup'),
        orderId,
        version: (prev?.version ?? 0) + 1,
        ...input,
        buyerConfirmed: false,
        sellerConfirmed: false,
        createdAt: now(),
      }
      patchOrder(orderId, { meetup, status: 'PENDING_CONFIRM' })
      pushEvent(
        orderId,
        order.status,
        'PENDING_CONFIRM',
        `${who}修改见面约定（第 ${meetup.version} 版），旧确认已失效`,
        op
      )
      notify(
        'ORDER_STATUS_CHANGED',
        '见面约定已更新',
        `订单 #${orderId} 约定更新到第 ${meetup.version} 版，请重新确认`,
        `/transactions/${orderId}`
      )
    },

    /** 确认当前版本约定：双方都确认 → 订单进入「见面已安排」 */
    confirmMeetup: (orderId) => {
      const order = getOrder(orderId)
      if (!order?.meetup) return
      const op = operatorId()
      const role = op === order.buyer.id ? 'buyer' : op === order.seller.id ? 'seller' : 'other'
      if (role === 'other') return
      const meetup = {
        ...order.meetup,
        buyerConfirmed: order.meetup.buyerConfirmed || role === 'buyer',
        sellerConfirmed: order.meetup.sellerConfirmed || role === 'seller',
      }
      const both = meetup.buyerConfirmed && meetup.sellerConfirmed
      const who = role === 'buyer' ? '买家' : '卖家'
      patchOrder(orderId, { meetup, status: both ? 'MEETUP_ARRANGED' : order.status })
      if (both) {
        pushEvent(orderId, order.status, 'MEETUP_ARRANGED', '双方已确认见面约定（2/2）', op)
        notify(
          'MEETUP_REMINDER',
          '见面已安排',
          `订单 #${orderId} 双方已确认：${meetup.campusLocation} ${meetup.scheduledDate} ${meetup.timeSlotStart}`,
          `/transactions/${orderId}`
        )
      } else {
        pushEvent(orderId, order.status, order.status, `${who}已确认见面约定（1/2），等待对方`, op)
        notify(
          'ORDER_STATUS_CHANGED',
          '等待你确认约定',
          `订单 #${orderId} 对方已确认见面约定，等待你确认`,
          `/transactions/${orderId}`
        )
      }
    },

    /* ---------- 订单 ---------- */

    /** 双方独立确认完成：都确认后订单完成、商品下架为已售出 */
    confirmComplete: (orderId) => {
      const order = getOrder(orderId)
      if (!order) return
      const op = operatorId()
      const role = op === order.buyer.id ? 'buyer' : op === order.seller.id ? 'seller' : 'other'
      if (role === 'other') return
      const who = role === 'buyer' ? '买家' : '卖家'
      const buyerDone = order.buyerConfirmedComplete || role === 'buyer'
      const sellerDone = order.sellerConfirmedComplete || role === 'seller'
      const patch: Partial<Order> =
        role === 'buyer' ? { buyerConfirmedComplete: true } : { sellerConfirmedComplete: true }
      if (buyerDone && sellerDone) {
        patchOrder(orderId, { ...patch, status: 'COMPLETED' })
        patchProduct(order.productId, 'SOLD')
        pushEvent(orderId, order.status, 'COMPLETED', '双方已确认完成（2/2），订单完成', op)
        notify(
          'REVIEW_REQUEST',
          '交易已完成，去评价',
          `订单 #${orderId}（${order.product.title}）已完成，评价对方前可查看本次交易`,
          `/transactions/${orderId}`
        )
      } else {
        patchOrder(orderId, patch)
        pushEvent(orderId, order.status, order.status, `${who}已确认完成（1/2），等待对方`, op)
        notify(
          'ORDER_STATUS_CHANGED',
          '等待你确认完成',
          `订单 #${orderId} 对方已确认交易完成，等待你确认`,
          `/transactions/${orderId}`
        )
      }
    },

    cancelOrder: (orderId) => {
      const order = getOrder(orderId)
      if (!order || ['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(order.status)) return
      const op = operatorId()
      patchOrder(orderId, { status: 'CANCELLED' })
      patchProduct(order.productId, 'ON_SALE')
      pushEvent(orderId, order.status, 'CANCELLED', '订单已取消，商品重新释放为在售', op)
      notify('ORDER_STATUS_CHANGED', '订单已取消', `订单 #${orderId} 已取消，商品重新上架`, `/transactions/${orderId}`)
    },

    /* ---------- 报价 ---------- */

    /** 发起报价：新报价进会话（走完整注入链路），并产生一条通知 */
    createOffer: (sessionId, peerId, product, amount) => {
      const op = operatorId()
      const offer: Offer = {
        id: nextId('offer'),
        sessionId,
        buyerId: op,
        sellerId: peerId,
        productId: product.id,
        originalPrice: product.price,
        amount,
        status: 'PENDING',
        expireAt: new Date(Date.now() + OFFER_EXPIRE_HOURS * 3_600_000).toISOString(),
        createdAt: now(),
      }
      set((s) => ({ offers: [...s.offers, offer] }))
      inject({ ...msgBase(sessionId, op), kind: 'OFFER', offer })
      notify(
        'OFFER_RECEIVED',
        '收到新报价',
        `「${product.title}」报价 ¥${amount}（原价 ¥${product.price}）`,
        `/chat/${sessionId}`
      )
      return offer
    },

    /** 接受报价：报价转已接受 + 创建订单（待确认）+ 商品转已预约 + 会话内系统消息 */
    acceptOffer: (offerId) => {
      const offer = get().offers.find((o) => o.id === offerId)
      if (!offer || offer.status !== 'PENDING') return
      const op = operatorId()
      const product = get().products[offer.productId]
      const orderId = nextId('order')
      const order: Order = {
        id: orderId,
        productId: offer.productId,
        product,
        buyer: mockUsers[offer.buyerId],
        seller: mockUsers[offer.sellerId],
        status: 'PENDING_CONFIRM',
        amount: offer.amount,
        meetup: undefined,
        buyerConfirmedComplete: false,
        sellerConfirmedComplete: false,
        createdAt: now(),
        updatedAt: now(),
      }
      set((s) => ({
        orders: [...s.orders, order],
        offers: s.offers.map((o) => (o.id === offerId ? { ...o, status: 'ACCEPTED' as const, orderId } : o)),
      }))
      patchProduct(offer.productId, 'RESERVED')
      const event = pushEvent(orderId, undefined, 'PENDING_CONFIRM', `订单已创建（报价 ¥${offer.amount} 被接受）`, op)
      inject({ ...msgBase(offer.sessionId, op), kind: 'ORDER_EVENT', orderEvent: event })
      notify(
        'OFFER_ACCEPTED',
        '报价被接受',
        `订单 #${orderId} 已创建，请确认见面约定`,
        `/transactions/${orderId}`
      )
    },

    rejectOffer: (offerId) => {
      const offer = get().offers.find((o) => o.id === offerId)
      if (!offer || offer.status !== 'PENDING') return
      set((s) => ({
        offers: s.offers.map((o) => (o.id === offerId ? { ...o, status: 'REJECTED' as const } : o)),
      }))
      notify(
        'OFFER_REJECTED',
        '报价被拒绝',
        `「${offer.productId} 号商品」报价 ¥${offer.amount} 被拒绝，可继续协商或重新出价`,
        `/chat/${offer.sessionId}`
      )
    },

    /** 还价：旧报价转已还价，新报价挂到还价链上并注入会话 */
    counterOffer: (offerId, amount) => {
      const offer = get().offers.find((o) => o.id === offerId)
      if (!offer || offer.status !== 'PENDING') return
      const op = operatorId()
      const newOffer: Offer = {
        id: nextId('offer'),
        sessionId: offer.sessionId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        productId: offer.productId,
        originalPrice: offer.originalPrice,
        amount,
        status: 'PENDING',
        counteredByOfferId: offer.id,
        expireAt: new Date(Date.now() + OFFER_EXPIRE_HOURS * 3_600_000).toISOString(),
        createdAt: now(),
      }
      set((s) => ({
        offers: [
          ...s.offers.map((o) => (o.id === offerId ? { ...o, status: 'COUNTERED' as const } : o)),
          newOffer,
        ],
      }))
      inject({ ...msgBase(offer.sessionId, op), kind: 'OFFER', offer: newOffer })
      notify(
        'OFFER_RECEIVED',
        '收到还价',
        `还价 ¥${amount}（原报价 ¥${offer.amount}），请在有效期内处理`,
        `/chat/${offer.sessionId}`
      )
    },

    withdrawOffer: (offerId) => {
      const offer = get().offers.find((o) => o.id === offerId)
      if (!offer || offer.status !== 'PENDING') return
      set((s) => ({
        offers: s.offers.map((o) => (o.id === offerId ? { ...o, status: 'CANCELLED' as const } : o)),
      }))
      notify(
        'OFFER_REJECTED',
        '报价已撤回',
        `对方撤回了 ¥${offer.amount} 的报价`,
        `/chat/${offer.sessionId}`
      )
    },

    /* ---------- 评价 / 举报 ---------- */

    submitReview: (input) => {
      const review: Review = { id: nextId('review'), ...input, createdAt: now() }
      set((s) => ({ reviews: [...s.reviews, review] }))
    },

    submitReport: (input) => {
      const report: Report = { id: nextId('report'), ...input, status: 'PENDING', createdAt: now() }
      set((s) => ({ reports: [...s.reports, report] }))
      notify(
        'REPORT_RESULT',
        '举报已提交',
        '管理员会在 48 小时内处理，结果将在通知中心告知',
      )
    },

    /* ---------- 通知 ---------- */

    markNotificationRead: (id) => {
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))
    },

    markAllNotificationsRead: () => {
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
    },

    /* ---------- 演示 ---------- */

    /** 重置为初始种子数据（演示前一键复位；id 续发器不回退，保证唯一） */
    resetDemo: () => set(seed()),
  }
})
