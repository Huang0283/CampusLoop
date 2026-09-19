/**
 * WebSocket 客户端事件契约（前端侧草案）
 *
 * ⚠ 需与 M6（聊天后端）核对：事件名、payload 结构、鉴权方式、eventId 生成规则。
 * 设计原则（PDF 第 19 节风险表）：
 *  - 先持久化再推送：服务端落库成功后才推送，客户端收到即可信；
 *  - 断线用 HTTP 补拉兜底：WS 只负责"低延迟"，不承担"不丢消息"的正确性责任；
 *  - 智能功能不可用时只降级提示，不阻塞基础聊天。
 *
 * 幂等设计（M4 与 M10 共同验收）：
 *  - 下行事件统一带 eventId：实时推送与重连补拉可能投递同一条事件，客户端据此去重；
 *  - 上行消息统一带 clientMsgId：服务端据此去重，断线重发不产生重复消息。
 */

import type {
  AppNotification,
  Message,
  MessageKind,
  Offer,
  OrderStatus,
  WsConnectionStatus,
} from '../types/transaction'

/* ---------- 连接状态 ---------- */

/** 连接四态：与 types/transaction.ts 的 WsConnectionStatus 强制对齐 */
export const WS_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
} as const satisfies Record<string, WsConnectionStatus>

export type WsStatusValue = (typeof WS_STATUS)[keyof typeof WS_STATUS]

/* ---------- 下行事件（服务端 -> 客户端） ---------- */

/** 所有下行事件的统一信封 */
export interface WsEnvelope<TType extends string, TPayload> {
  /** 服务端生成的幂等键，客户端据此去重 */
  eventId: string
  type: TType
  payload: TPayload
  /** 服务端发出时间（ISO 8601） */
  sentAt: string
}

export type WsIncomingEvent =
  | WsEnvelope<'PONG', { serverTime: string }>
  | WsEnvelope<'MESSAGE_NEW', { sessionId: number; message: Message }>
  /**
   * 落库确认。只回 id 不回消息体：
   * 一是省带宽，二是避免客户端把"自己发的"和"服务端回显的"当成两条消息。
   * messageId 用于替换乐观消息的临时 id。
   */
  | WsEnvelope<
      'MESSAGE_ACK',
      { sessionId: number; clientMsgId: string; messageId: number; createdAt: string }
    >
  | WsEnvelope<'MESSAGE_READ', { sessionId: number; readerId: number; lastMessageId: number }>
  | WsEnvelope<'OFFER_UPDATE', { sessionId: number; offer: Offer }>
  | WsEnvelope<'ORDER_UPDATE', { orderId: number; fromStatus?: OrderStatus; toStatus: OrderStatus }>
  | WsEnvelope<'NOTIFICATION', { notification: AppNotification }>
  | WsEnvelope<'KICK', { reason: string }>

export type WsIncomingType = WsIncomingEvent['type']

/* ---------- 上行事件（客户端 -> 服务端） ---------- */

export interface WsOutgoingMap {
  PING: undefined
  TYPING: { sessionId: number }
  READ: { sessionId: number; lastMessageId: number }
  SEND_MESSAGE: {
    sessionId: number
    /** 客户端生成（UUID）。服务端据此幂等，断线重发与 HTTP 兜底共用同一个 id */
    clientMsgId: string
    kind: Extract<MessageKind, 'TEXT' | 'IMAGE'>
    content?: string
  }
}

export type WsOutgoingEvent = {
  [K in keyof WsOutgoingMap]: { type: K; payload: WsOutgoingMap[K] }
}[keyof WsOutgoingMap]

export type WsOutgoingType = WsOutgoingEvent['type']

/* ---------- 重连 / 心跳 / 补拉参数 ---------- */

export const WS_RECONNECT = {
  /** 首次重连等待 ms，指数退避 */
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  factor: 2,
  /** 退避抖动比例：避免大量客户端在同一时刻集中重连（惊群） */
  jitterRatio: 0.3,
  /** 连续重连失败达到该次数后停止自动重连，转为等待用户手动重试 */
  maxAttempts: 8,
  /** 心跳间隔 ms */
  heartbeatMs: 25000,
  /** 连续丢失该次数的 PONG 判定链路已死，主动断开交给重连逻辑接管 */
  missedPongLimit: 2,
  /** 重连期间聊天页顶部展示提示条 */
  showReconnectBanner: true,
  /** 单次补拉的最大条数（超出部分提示用户"上滑加载更早"） */
  catchUpLimit: 100,
} as const

/* ---------- 自定义关闭码 ---------- */

/**
 * 4000-4999 为应用可自定义区间。
 * 前端按关闭码决定"是否自动重连"：鉴权失败与踢下线不重连，直接引导用户处理。
 */
export const WS_CLOSE_CODE = {
  /** 被其他端登录踢下线 */
  KICKED: 4001,
  /** 心跳超时（链路已死） */
  HEARTBEAT_TIMEOUT: 4002,
  /** 鉴权失败（token 失效），需重新登录 */
  AUTH_FAILED: 4003,
} as const

/** 不触发自动重连的关闭码 */
export const WS_NO_RETRY_CODES: readonly number[] = [
  WS_CLOSE_CODE.AUTH_FAILED,
  WS_CLOSE_CODE.KICKED,
]
