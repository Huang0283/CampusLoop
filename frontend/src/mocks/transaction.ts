/**
 * M4 原型 mock 数据
 *
 * ⚠ 原型阶段专用：页面评审通过后接入真实接口（M6），此文件整体删除。
 * 数据结构即接口契约示例，可直接作为与 M6 对接的字段基线。
 */

import type {
  AppNotification,
  ChatSession,
  Meetup,
  Message,
  Offer,
  Order,
  OrderEventBrief,
  ProductBrief,
  UserBrief,
} from '../types/transaction'

export const CURRENT_USER_ID = 1

export const mockUsers: Record<number, UserBrief> = {
  1: { id: 1, nickname: '我', avatar: undefined, rating: 4.9, transactionCount: 12 },
  2: { id: 2, nickname: '李同学', avatar: undefined, rating: 4.8, transactionCount: 23 },
  3: { id: 3, nickname: '王学姐', avatar: undefined, rating: 5.0, transactionCount: 8 },
}

export const mockProducts: Record<number, ProductBrief> = {
  101: {
    id: 101,
    title: 'ThinkBook 14+ R7 7840H 16G 512G',
    price: 4200,
    status: 'RESERVED',
  },
  102: { id: 102, title: '二手显示器 24英寸 75Hz', price: 550, status: 'ON_SALE' },
  103: { id: 103, title: '高等数学教材 第七版（近九成新）', price: 18, status: 'ON_SALE' },
}

const now = Date.now()
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString()
const later = (hours: number) => new Date(now + hours * 3_600_000).toISOString()

/* ---------- 报价 ---------- */

export const mockOffers: Offer[] = [
  {
    id: 9001,
    sessionId: 5001,
    buyerId: 1,
    sellerId: 2,
    productId: 101,
    originalPrice: 4200,
    amount: 3800,
    status: 'COUNTERED',
    expireAt: later(40),
    createdAt: ago(120),
  },
  {
    id: 9002,
    sessionId: 5001,
    buyerId: 1,
    sellerId: 2,
    productId: 101,
    originalPrice: 4200,
    amount: 4000,
    status: 'PENDING',
    expireAt: later(46),
    createdAt: ago(30),
  },
  {
    id: 9003,
    sessionId: 5002,
    buyerId: 3,
    sellerId: 1,
    productId: 102,
    originalPrice: 550,
    amount: 500,
    status: 'PENDING',
    expireAt: later(0.8), // 不到 1 小时，演示倒计时置红
    createdAt: ago(10),
  },
]

/* ---------- 会话与消息 ---------- */

export const mockSessions: ChatSession[] = [
  {
    id: 5001,
    type: 'PRODUCT',
    peer: mockUsers[2],
    product: mockProducts[101],
    unreadCount: 1,
    lastMessage: {
      id: 2,
      clientMsgId: 'm2',
      sessionId: 5001,
      senderId: 2,
      kind: 'TEXT',
      content: '4000 的话今天就可以交易',
      createdAt: ago(30),
    },
  },
  {
    id: 5002,
    type: 'PRODUCT',
    peer: mockUsers[3],
    product: mockProducts[102],
    unreadCount: 2,
    lastMessage: {
      id: 6,
      clientMsgId: 'm6',
      sessionId: 5002,
      senderId: 3,
      kind: 'OFFER',
      offer: mockOffers[2],
      createdAt: ago(10),
    },
  },
  {
    id: 5003,
    type: 'WANTED',
    peer: mockUsers[3],
    wanted: { id: 301, title: '求购：24 英寸以上显示器', budgetMin: 400, budgetMax: 700 },
    unreadCount: 0,
    lastMessage: {
      id: 9,
      clientMsgId: 'm9',
      sessionId: 5003,
      senderId: 3,
      kind: 'TEXT',
      content: '我出了一台 24 英寸的，你看下求购匹配',
      createdAt: ago(600),
    },
  },
]

export const mockMessages: Message[] = [
  { id: 1, clientMsgId: 'm1', sessionId: 5001, senderId: 1, kind: 'TEXT', content: '你好，电脑还在吗？成色怎么样？', createdAt: ago(180), sendStatus: 'SENT' },
  { id: 2, clientMsgId: 'm2', sessionId: 5001, senderId: 2, kind: 'TEXT', content: '在的，用了两年，一直贴膜带包，无明显划痕', createdAt: ago(170) },
  { id: 3, clientMsgId: 'm3', sessionId: 5001, senderId: 1, kind: 'OFFER', offer: mockOffers[0], createdAt: ago(120), sendStatus: 'SENT' },
  { id: 4, clientMsgId: 'm4', sessionId: 5001, senderId: 2, kind: 'TEXT', content: '3800 有点低了，最少 4000', createdAt: ago(60) },
  {
    id: 5, clientMsgId: 'm5', sessionId: 5001, senderId: 2, kind: 'ORDER_EVENT',
    orderEvent: { id: 1, orderId: 8001, toStatus: 'PENDING_CONFIRM', description: '订单已创建，请双方确认见面约定', createdAt: ago(31) },
    createdAt: ago(31),
  },
  { id: 6, clientMsgId: 'm6', sessionId: 5001, senderId: 1, kind: 'OFFER', offer: mockOffers[1], createdAt: ago(30), sendStatus: 'SENT' },
  // 发送失败的演示消息
  { id: 7, clientMsgId: 'm7', sessionId: 5001, senderId: 1, kind: 'TEXT', content: '那 4000 成交，可以走平台订单', createdAt: ago(2), sendStatus: 'FAILED' },

  { id: 8, clientMsgId: 'm8', sessionId: 5002, senderId: 3, kind: 'TEXT', content: '同学，显示器 550 挂的，你要吗', createdAt: ago(11) },
  { id: 9, clientMsgId: 'm9', sessionId: 5002, senderId: 3, kind: 'OFFER', offer: mockOffers[2], createdAt: ago(10) },
]

/* ---------- 订单 ---------- */

export const mockMeetup: Meetup = {
  id: 7001,
  orderId: 8001,
  version: 2,
  campusLocation: '东区图书馆正门',
  scheduledDate: '2026-09-21',
  timeSlotStart: '16:00',
  timeSlotEnd: '17:00',
  note: '带好充电器，现场验机',
  buyerConfirmed: true,
  sellerConfirmed: false,
  createdAt: ago(25),
}

export const mockOrderEvents: OrderEventBrief[] = [
  { id: 1, orderId: 8001, toStatus: 'PENDING_CONFIRM', description: '订单已创建（报价 ¥4000 被接受）', createdAt: ago(31) },
  { id: 2, orderId: 8001, fromStatus: 'PENDING_CONFIRM', toStatus: 'PENDING_CONFIRM', description: '买家提交见面约定（第 1 版）', operatorId: 1, createdAt: ago(28) },
  { id: 3, orderId: 8001, fromStatus: 'PENDING_CONFIRM', toStatus: 'PENDING_CONFIRM', description: '卖家修改见面约定（第 2 版），旧确认已失效', operatorId: 2, createdAt: ago(26) },
  { id: 4, orderId: 8004, toStatus: 'PENDING_CONFIRM', description: '订单已创建（报价 ¥4200 被接受）', createdAt: ago(6000) },
  { id: 5, orderId: 8004, fromStatus: 'PENDING_CONFIRM', toStatus: 'MEETUP_ARRANGED', description: '双方已确认见面约定（2/2）', createdAt: ago(5900) },
  { id: 6, orderId: 8004, fromStatus: 'MEETUP_ARRANGED', toStatus: 'DISPUTED', description: '买家举报已受理，订单转入争议处理，等待管理员裁决', operatorId: 1, createdAt: ago(120) },
]

export const mockOrders: Order[] = [
  {
    id: 8001,
    productId: 101,
    product: mockProducts[101],
    buyer: mockUsers[1],
    seller: mockUsers[2],
    status: 'PENDING_CONFIRM',
    amount: 4000,
    meetup: mockMeetup,
    buyerConfirmedComplete: false,
    sellerConfirmedComplete: false,
    createdAt: ago(31),
    updatedAt: ago(26),
  },
  {
    id: 8002,
    productId: 103,
    product: mockProducts[103],
    buyer: mockUsers[3],
    seller: mockUsers[1],
    status: 'COMPLETED',
    amount: 18,
    buyerConfirmedComplete: true,
    sellerConfirmedComplete: true,
    createdAt: ago(8000),
    updatedAt: ago(7000),
  },
  {
    id: 8003,
    productId: 102,
    product: mockProducts[102],
    buyer: mockUsers[1],
    seller: mockUsers[3],
    status: 'MEETUP_ARRANGED',
    amount: 550,
    meetup: {
      id: 7002,
      orderId: 8003,
      version: 1,
      campusLocation: '南门快递驿站旁',
      scheduledDate: '2026-09-19',
      timeSlotStart: '10:00',
      timeSlotEnd: '11:00',
      buyerConfirmed: true,
      sellerConfirmed: true,
      createdAt: ago(200),
    },
    buyerConfirmedComplete: false,
    sellerConfirmedComplete: false,
    createdAt: ago(300),
    updatedAt: ago(200),
  },
  {
    id: 8004,
    productId: 101,
    product: mockProducts[101],
    buyer: mockUsers[1],
    seller: mockUsers[2],
    status: 'DISPUTED',
    amount: 4200,
    meetup: {
      id: 7003,
      orderId: 8004,
      version: 1,
      campusLocation: '图书馆北门',
      scheduledDate: '2026-09-18',
      timeSlotStart: '14:00',
      timeSlotEnd: '15:00',
      buyerConfirmed: true,
      sellerConfirmed: true,
      createdAt: ago(5950),
    },
    buyerConfirmedComplete: false,
    sellerConfirmedComplete: false,
    createdAt: ago(6000),
    updatedAt: ago(120),
  },
]

/* ---------- 通知 ---------- */

export const mockNotifications: AppNotification[] = [
  { id: 1, type: 'OFFER_RECEIVED', title: '王学姐 向你发起报价', content: '「二手显示器 24英寸 75Hz」报价 ¥500（原价 ¥550）', link: '/chat/5002', read: false, createdAt: ago(10) },
  { id: 2, type: 'ORDER_STATUS_CHANGED', title: '订单待确认', content: '订单 #8001 见面约定已更新到第 2 版，请重新确认', link: '/transactions/8001', read: false, createdAt: ago(26) },
  { id: 3, type: 'MATCH_FOUND', title: '求购匹配 92 分', content: '你的求购「24英寸显示器」匹配到新商品：二手显示器 24英寸 75Hz（¥550，在预算内）', link: '/wanted/301', read: false, createdAt: ago(120) },
  { id: 4, type: 'MESSAGE', title: '李同学 发来新消息', content: '4000 的话今天就可以交易', link: '/chat/5001', read: true, createdAt: ago(30) },
  { id: 5, type: 'REVIEW_REQUEST', title: '交易已完成，去评价', content: '订单 #8002（高等数学教材）已完成，评价对方前可查看本次交易', link: '/transactions/8002', read: true, createdAt: ago(7000) },
  { id: 6, type: 'MEETUP_REMINDER', title: '明天有见面约定', content: '订单 #8003 明天 10:00 南门快递驿站旁，记得带好商品', link: '/transactions/8003', read: true, createdAt: ago(400) },
]
