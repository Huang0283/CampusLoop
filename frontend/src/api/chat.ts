/**
 * M4 交易域 HTTP 接口层（与 M6 共同维护的契约落点）
 *
 * ⚠ 路径、字段名、错误码需与 M6 核对后再冻结。
 * 原型模式下 stores/realtime.ts 会整体替换为 mock 数据源，不会走到本文件。
 *
 * 分工原则：
 *  - 实时性要求高的（发消息、正在输入、已读）走 WebSocket；
 *  - 一致性要求高的（议价、订单状态迁移、约定版本变更）走 HTTP：
 *    这些操作需要服务端做版本校验与并发控制，用 HTTP 的状态码表达冲突最清晰。
 */

import request from './request'
import type { ApiResponse } from '../types/api'
import type {
  AppNotification,
  ChatSession,
  Meetup,
  Message,
  Offer,
  Order,
  OrderEventBrief,
  Report,
  ReportReason,
  ReportTargetType,
  Review,
} from '../types/transaction'

/**
 * 响应拦截器已把 AxiosResponse 解包成 body，但 axios 的类型仍标注为 AxiosResponse。
 * 这里统一收敛一次，避免每个调用点都写 as。
 */
function unwrap<T>(promise: Promise<unknown>): Promise<T> {
  return promise.then((body) => (body as ApiResponse<T>).data)
}

/* ---------- 会话与消息 ---------- */

export function fetchSessions(): Promise<ChatSession[]> {
  return unwrap<ChatSession[]>(request.get('/chat/sessions'))
}

/** 进入会话时的首屏历史 */
export function fetchHistory(sessionId: number, limit = 30): Promise<Message[]> {
  return unwrap<Message[]>(
    request.get(`/chat/sessions/${sessionId}/messages`, { params: { limit } })
  )
}

/**
 * 断线补拉：只取 id 大于 afterId 的消息。
 * 这是"不丢消息"的正确性保证 —— WebSocket 只负责低延迟。
 */
export function fetchMessagesAfter(
  sessionId: number,
  afterId: number,
  limit = 100
): Promise<Message[]> {
  return unwrap<Message[]>(
    request.get(`/chat/sessions/${sessionId}/messages`, { params: { afterId, limit } })
  )
}

/**
 * HTTP 兜底发送：WebSocket 长时间不可用时改用。
 * 与 WS 发送共用同一个 clientMsgId，服务端据此幂等，不会产生重复消息。
 */
export function sendMessageViaHttp(
  sessionId: number,
  body: { clientMsgId: string; kind: 'TEXT' | 'IMAGE'; content?: string }
): Promise<Message> {
  return unwrap<Message>(request.post(`/chat/sessions/${sessionId}/messages`, body))
}

export function markSessionRead(sessionId: number, lastMessageId: number): Promise<null> {
  return unwrap<null>(request.post(`/chat/sessions/${sessionId}/read`, { lastMessageId }))
}

/* ---------- 议价 ---------- */

/** 发起报价。服务端需校验：报价有效期、商品在售状态、金额范围 */
export function createOffer(
  sessionId: number,
  amount: number
): Promise<Offer> {
  return unwrap<Offer>(request.post(`/chat/sessions/${sessionId}/offers`, { amount }))
}

/**
 * 接受报价 → 服务端创建订单。
 * 并发生效：同一报价被双方同时接受时，服务端以订单唯一约束保证只创建一次，
 * 前端收到 409 应提示"该报价已被处理"并刷新。
 */
export function acceptOffer(offerId: number): Promise<{ offer: Offer; order: Order }> {
  return unwrap<{ offer: Offer; order: Order }>(request.post(`/offers/${offerId}/accept`))
}

export function rejectOffer(offerId: number, reason?: string): Promise<Offer> {
  return unwrap<Offer>(request.post(`/offers/${offerId}/reject`, { reason }))
}

/** 还价：生成新报价并把原报价置为 COUNTERED（还价链） */
export function counterOffer(offerId: number, amount: number): Promise<Offer> {
  return unwrap<Offer>(request.post(`/offers/${offerId}/counter`, { amount }))
}

export function cancelOffer(offerId: number): Promise<Offer> {
  return unwrap<Offer>(request.post(`/offers/${offerId}/cancel`))
}

/* ---------- 订单与见面约定 ---------- */

export function fetchOrder(orderId: number): Promise<Order> {
  return unwrap<Order>(request.get(`/orders/${orderId}`))
}

export function fetchOrderTimeline(orderId: number): Promise<OrderEventBrief[]> {
  return unwrap<OrderEventBrief[]>(request.get(`/orders/${orderId}/events`))
}

/**
 * 提交见面约定。
 * 版本号由服务端递增；修改会使双方已有确认失效，
 * 前端必须显式提示"对方已修改，请重新确认"，不能静默覆盖。
 */
export function submitMeetup(
  orderId: number,
  body: {
    campusLocation: string
    scheduledDate: string
    timeSlotStart: string
    timeSlotEnd: string
    note?: string
  }
): Promise<Meetup> {
  return unwrap<Meetup>(request.post(`/orders/${orderId}/meetup`, body))
}

/** 确认当前版本的见面约定 */
export function confirmMeetup(orderId: number, meetupId: number, version: number): Promise<Meetup> {
  return unwrap<Meetup>(
    request.post(`/orders/${orderId}/meetup/confirm`, { meetupId, version })
  )
}

/**
 * 单方确认交易完成。
 * 服务端必须校验：确认的是同一个约定版本；双方都确认后才流转到 COMPLETED。
 */
export function confirmComplete(
  orderId: number,
  meetupVersion: number
): Promise<{ order: Order; completed: boolean }> {
  return unwrap<{ order: Order; completed: boolean }>(
    request.post(`/orders/${orderId}/confirm-complete`, { meetupVersion })
  )
}

export function cancelOrder(orderId: number, reason: string): Promise<Order> {
  return unwrap<Order>(request.post(`/orders/${orderId}/cancel`, { reason }))
}

/* ---------- 评价 ---------- */

/** 仅已完成订单的非参与者可评价；服务端按 orderId 限制一人一次 */
export function createReview(body: {
  orderId: number
  overall: number
  descriptionAccuracy: number
  communication: number
  punctuality: number
  comment?: string
}): Promise<Review> {
  return unwrap<Review>(request.post('/reviews', body))
}

/* ---------- 举报 ---------- */

/** 重复举报同一对象应返回 409，前端提示"你已举报过，正在处理中" */
export function createReport(body: {
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  description?: string
  /** 证据图片 URL（先上传拿到 URL 再随举报提交） */
  evidence?: string[]
}): Promise<Report> {
  return unwrap<Report>(request.post('/reports', body))
}

export function fetchMyReports(): Promise<Report[]> {
  return unwrap<Report[]>(request.get('/reports/mine'))
}

/* ---------- 通知 ---------- */

export function fetchNotifications(): Promise<AppNotification[]> {
  return unwrap<AppNotification[]>(request.get('/notifications'))
}

export function markNotificationRead(id: number): Promise<null> {
  return unwrap<null>(request.post(`/notifications/${id}/read`))
}

export function markAllNotificationsRead(): Promise<null> {
  return unwrap<null>(request.post('/notifications/read-all'))
}

/* ---------- 数据源抽象 ---------- */

/**
 * 消息数据源：由 stores/realtime.ts 依赖。
 * 真实实现走上面的 HTTP 接口；原型模式替换为内存 mock（src/mocks/chatBackend.ts），
 * 两者接口同形，页面与状态机代码不需要任何 if 分支。
 */
export interface MessageSource {
  fetchHistory(sessionId: number, limit: number): Promise<Message[]>
  fetchAfter(sessionId: number, afterId: number, limit: number): Promise<Message[]>
}

export const httpMessageSource: MessageSource = {
  fetchHistory,
  fetchAfter: fetchMessagesAfter,
}
