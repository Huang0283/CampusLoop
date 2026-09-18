/**
 * M4 交易域类型定义
 *
 * ⚠ 与 M6（市场与交易后端）共同维护。
 * 任何字段变更必须同步：接口文档、mock 数据、页面渲染、M10 测试场景。
 */

/* ---------- 状态类型（前端契约源头，与 M6 核对） ---------- */

export type OrderStatus =
  | 'PENDING_CONFIRM'
  | 'BOOKED'
  | 'MEETUP_ARRANGED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'

export type OfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTERED'
  | 'EXPIRED'
  | 'CANCELLED'

export type NotificationType =
  | 'MESSAGE'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'MATCH_FOUND'
  | 'ORDER_STATUS_CHANGED'
  | 'MEETUP_REMINDER'
  | 'REVIEW_REQUEST'
  | 'REPORT_RESULT'

/* ---------- 用户 ---------- */

export interface UserBrief {
  id: number
  nickname: string
  avatar?: string
  /** 聚合评分（仅已完成订单参与计算） */
  rating?: number
  transactionCount?: number
}

/* ---------- 商品 / 求购上下文（聊天与订单中的引用卡片） ---------- */

export interface ProductBrief {
  id: number
  title: string
  coverUrl?: string
  price: number
  status: 'ON_SALE' | 'RESERVED' | 'SOLD' | 'HIDDEN'
}

export interface WantedBrief {
  id: number
  title: string
  budgetMin: number
  budgetMax: number
}

/* ---------- 聊天 ---------- */

export type ChatSessionType = 'PRODUCT' | 'WANTED'

export interface ChatSession {
  id: number
  type: ChatSessionType
  peer: UserBrief
  /** 商品上下文（type = PRODUCT 时存在） */
  product?: ProductBrief
  /** 求购上下文（type = WANTED 时存在） */
  wanted?: WantedBrief
  lastMessage?: Message
  unreadCount: number
}

export type MessageKind = 'TEXT' | 'IMAGE' | 'OFFER' | 'ORDER_EVENT' | 'SYSTEM'

export interface Message {
  id: number
  /** 客户端生成，用于断线补拉去重（UUID） */
  clientMsgId: string
  sessionId: number
  senderId: number
  kind: MessageKind
  content?: string
  /** kind = OFFER 时存在 */
  offer?: Offer
  /** kind = ORDER_EVENT 时存在：订单状态变化系统消息 */
  orderEvent?: OrderEventBrief
  createdAt: string
  /** 发送状态（仅自己发出的消息）：发送中 / 失败可重发 */
  sendStatus?: 'SENDING' | 'SENT' | 'FAILED'
}

/* ---------- 议价 ---------- */

export interface Offer {
  id: number
  orderId?: number
  sessionId: number
  buyerId: number
  sellerId: number
  productId: number
  /** 卖家当前标价 */
  originalPrice: number
  /** 本次出价金额 */
  amount: number
  status: OfferStatus
  /** 还价链：被本次还价替代的上一次报价 */
  counteredByOfferId?: number
  /** 报价有效期，过期自动 EXPIRED */
  expireAt: string
  createdAt: string
}

/* ---------- 订单与见面约定 ---------- */

export interface Order {
  id: number
  productId: number
  product: ProductBrief
  buyer: UserBrief
  seller: UserBrief
  status: OrderStatus
  amount: number
  /** 当前生效的见面约定 */
  meetup?: Meetup
  /** 买方是否已确认完成（双方独立确认后才进入已完成） */
  buyerConfirmedComplete: boolean
  /** 卖方是否已确认完成 */
  sellerConfirmedComplete: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderEventBrief {
  id: number
  orderId: number
  /** 状态迁移，如 PENDING_CONFIRM -> BOOKED */
  fromStatus?: OrderStatus
  toStatus: OrderStatus
  operatorId?: number
  description: string
  createdAt: string
}

export interface Meetup {
  id: number
  orderId: number
  /** 版本号：每次修改 +1，旧版本确认自动失效 */
  version: number
  campusLocation: string
  scheduledDate: string
  timeSlotStart: string
  timeSlotEnd: string
  note?: string
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  createdAt: string
}

/* ---------- 评价 ---------- */

export interface Review {
  id: number
  orderId: number
  reviewerId: number
  revieweeId: number
  overall: number
  descriptionAccuracy: number
  communication: number
  punctuality: number
  comment?: string
  createdAt: string
}

/* ---------- 举报 ---------- */

export type ReportTargetType = 'USER' | 'PRODUCT' | 'ORDER' | 'CHAT_MESSAGE'

export type ReportReason =
  | 'FAKE_PRODUCT'
  | 'DESCRIPTION_MISMATCH'
  | 'SPAM'
  | 'ABNORMAL_PRICE'
  | 'HARASSMENT'
  | 'VIOLATION'

export interface Report {
  id: number
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  description?: string
  /** 提交成功后平台返回的处理状态，前端只读展示 */
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED'
  createdAt: string
}

/* ---------- 通知 ---------- */

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  content: string
  /** 点击跳转目标，如 /chat/12、/transactions/88 */
  link?: string
  read: boolean
  createdAt: string
}

/* ---------- WebSocket ---------- */

export type WsConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
