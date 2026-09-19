/**
 * M4 实时通信客户端（前端架构子项）
 *
 * 职责边界：
 *  - 只管"链路"：建连、心跳、断线重连、事件去重、离线待发队列；
 *  - 不管"业务"：消息落库、未读计数、订单状态由 stores/realtime.ts 处理；
 *  - 不承担"不丢消息"：正确性由进入会话时的 HTTP 补拉（fetchAfter）保证。
 *
 * 传输层通过 WsTransportFactory 注入：
 *  - 生产：createWebSocketTransport()，走真实 WebSocket；
 *  - 原型/演示：createMockWsTransport()，无后端也能完整演示断线→重连→补拉→重发。
 *
 * ⚠ 待与 M6 核对：
 *  1. 鉴权方式：浏览器 WebSocket 无法自定义 header，暂用 query token；
 *  2. 心跳是应用层 PING/PONG，还是依赖协议层 ping 帧；
 *  3. eventId 的生成规则（建议服务端单调递增 + 会话维度，便于补拉定位）。
 */

import {
  WS_CLOSE_CODE,
  WS_NO_RETRY_CODES,
  WS_RECONNECT,
  WS_STATUS,
} from '../constants/websocket'
import type { WsIncomingEvent, WsOutgoingEvent } from '../constants/websocket'
import type { WsConnectionStatus } from '../types/transaction'

/* ---------- 传输层抽象 ---------- */

export interface WsTransportHandlers {
  onOpen: () => void
  onMessage: (raw: string) => void
  onClose: (info: { code: number; reason: string }) => void
  onError: (error: unknown) => void
}

export interface WsTransport {
  /** 发送一帧文本；链路不可用时静默丢弃（由 client 的 outbox 兜底） */
  send(raw: string): void
  close(code?: number, reason?: string): void
}

export type WsTransportFactory = (handlers: WsTransportHandlers) => WsTransport

/**
 * 真实 WebSocket 传输。
 * token 走 query string —— 浏览器 WebSocket 构造函数不支持自定义请求头，
 * 这是业界通行做法，需 M6 在网关侧允许并避免把 token 写进访问日志。
 */
export function createWebSocketTransport(
  url: string,
  getToken: () => string | null
): WsTransportFactory {
  return (handlers) => {
    const token = getToken()
    const separator = url.includes('?') ? '&' : '?'
    const finalUrl = token ? `${url}${separator}token=${encodeURIComponent(token)}` : url
    const socket = new WebSocket(finalUrl)

    socket.onopen = () => handlers.onOpen()
    socket.onmessage = (event) => {
      handlers.onMessage(typeof event.data === 'string' ? event.data : '')
    }
    socket.onclose = (event) => handlers.onClose({ code: event.code, reason: event.reason })
    socket.onerror = (event) => handlers.onError(event)

    return {
      send: (raw) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(raw)
      },
      close: (code, reason) => {
        // 1000 属于正常关闭，浏览器会拒绝带自定义 reason 的 1000；演示用自定义码
        socket.close(code, reason)
      },
    }
  }
}

/* ---------- 客户端 ---------- */

export interface RealtimeStatusInfo {
  /** 下一次重连等待时长（reconnecting 时有值） */
  nextRetryInMs?: number
  /** 累计重连尝试次数 */
  attempt: number
  /** 断线原因（disconnected 时有值） */
  reason?: 'manual' | 'unauthorized' | 'kicked' | 'exhausted' | 'transport'
}

export interface RealtimeClientOptions {
  transportFactory: WsTransportFactory
  /** 心跳间隔，默认取 WS_RECONNECT.heartbeatMs */
  heartbeatMs?: number
  /** 去重表容量上限（按 FIFO 淘汰），防止长时间运行内存增长 */
  maxSeenEventIds?: number
  onStatusChange?: (status: WsConnectionStatus, info: RealtimeStatusInfo) => void
  /** 通过去重的业务事件（PONG 已被内部消化，不会走到这里） */
  onEvent?: (event: WsIncomingEvent) => void
  /** 重连成功且之前确实掉过线时触发：业务层在此调用 HTTP 补拉 */
  onResume?: (info: { attempt: number; offlineMs: number }) => void
  /** 待发队列长度变化 */
  onOutboxChange?: (size: number) => void
  /** 被去重丢弃的事件（用于 M10 验证"重复投递不产生重复气泡"） */
  onDeduped?: (eventId: string) => void
  /** 传输层 / 解析层异常（不触发断连，仅上报） */
  onTransportError?: (error: unknown) => void
}

const DEFAULT_MAX_SEEN = 500

export class RealtimeClient {
  private readonly transportFactory: WsTransportFactory
  private readonly heartbeatMs: number
  private readonly maxSeenEventIds: number
  private readonly callbacks: Omit<RealtimeClientOptions, 'transportFactory' | 'heartbeatMs' | 'maxSeenEventIds'>

  private status: WsConnectionStatus = WS_STATUS.DISCONNECTED
  private transport: WsTransport | null = null

  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null

  private attempt = 0
  /** 仅由 disconnect()/destroy() 置位：区分"主动关闭"与"链路异常" */
  private manualClose = false
  private lastPongAt = 0
  private offlineSince: number | null = null

  private readonly seenEventIds = new Set<string>()
  private readonly seenOrder: string[] = []
  private outbox: WsOutgoingEvent[] = []

  constructor(options: RealtimeClientOptions) {
    const { transportFactory, heartbeatMs, maxSeenEventIds, ...callbacks } = options
    this.transportFactory = transportFactory
    this.heartbeatMs = heartbeatMs ?? WS_RECONNECT.heartbeatMs
    this.maxSeenEventIds = maxSeenEventIds ?? DEFAULT_MAX_SEEN
    this.callbacks = callbacks
  }

  /* ---------- 对外 API ---------- */

  connect(): void {
    if (this.status === WS_STATUS.CONNECTED || this.status === WS_STATUS.CONNECTING) return
    this.manualClose = false
    this.clearReconnectTimer()
    this.openTransport(this.attempt > 0 ? WS_STATUS.RECONNECTING : WS_STATUS.CONNECTING)
  }

  disconnect(code: number = 1000, reason: string = 'client-close'): void {
    this.manualClose = true
    this.clearReconnectTimer()
    this.stopHeartbeat()
    this.attempt = 0
    if (this.transport) {
      this.transport.close(code, reason)
    } else {
      this.setStatus(WS_STATUS.DISCONNECTED, { attempt: 0, reason: 'manual' })
    }
  }

  /** 页面卸载/登出时调用：清空所有定时器与缓存，防止内存泄漏 */
  destroy(): void {
    this.disconnect(1000, 'destroy')
    this.seenEventIds.clear()
    this.seenOrder.length = 0
    this.outbox = []
  }

  /**
   * 发送上行事件。
   * @returns true = 已交给链路；false = 已进入离线待发队列，连接恢复后自动补发
   */
  send(event: WsOutgoingEvent): boolean {
    if (this.status === WS_STATUS.CONNECTED && this.transport) {
      this.rawSend(event)
      return true
    }
    this.outbox.push(event)
    this.callbacks.onOutboxChange?.(this.outbox.length)
    return false
  }

  /**
   * 故障注入：把一条"服务端下行事件"直接送进客户端处理链路（含去重与分发）。
   * 用途：① 原型演示"对方来消息"；② M10 验证"同一 eventId 重复投递只渲染一条气泡"；
   * ③ 验证"断线补拉与实时推送重叠"时的幂等性。
   * @returns false 表示当前未连接，事件被丢弃
   */
  injectEvent(event: WsIncomingEvent): boolean {
    if (this.status !== WS_STATUS.CONNECTED) return false
    this.handleMessage(JSON.stringify(event))
    return true
  }

  /**
   * 演示/测试用：模拟链路异常中断（不经过主动关闭流程，因此会触发自动重连）。
   * 与真实网络抖动走同一条代码路径。
   */
  simulateDisconnect(): void {
    if (!this.transport) {
      // 无链路时直接按"掉线"处理，同样触发重连
      this.offlineSince = this.offlineSince ?? Date.now()
      this.scheduleReconnect()
      return
    }
    this.transport.close(WS_CLOSE_CODE.HEARTBEAT_TIMEOUT, 'simulated-drop')
  }

  getStatus(): WsConnectionStatus {
    return this.status
  }

  getPendingCount(): number {
    return this.outbox.length
  }

  getStats(): { attempt: number; offlineMs: number; seenEventIds: number } {
    return {
      attempt: this.attempt,
      offlineMs: this.offlineSince === null ? 0 : Date.now() - this.offlineSince,
      seenEventIds: this.seenEventIds.size,
    }
  }

  /* ---------- 内部实现 ---------- */

  private openTransport(status: WsConnectionStatus): void {
    this.setStatus(status, { attempt: this.attempt })
    try {
      this.transport = this.transportFactory({
        onOpen: this.handleOpen,
        onMessage: this.handleMessage,
        onClose: this.handleClose,
        onError: this.handleError,
      })
    } catch (error) {
      // 同步抛错（如 URL 非法）：走重连，不炸掉调用方
      this.callbacks.onTransportError?.(error)
      this.offlineSince = this.offlineSince ?? Date.now()
      this.scheduleReconnect()
    }
  }

  private handleOpen = (): void => {
    const offlineSince = this.offlineSince
    const offlineMs = offlineSince === null ? 0 : Date.now() - offlineSince
    const resumedAttempt = this.attempt

    this.lastPongAt = Date.now()
    this.offlineSince = null
    this.attempt = 0
    this.setStatus(WS_STATUS.CONNECTED, { attempt: 0 })
    this.startHeartbeat()
    this.flushOutbox()

    // 只有"掉过线又重连回来"才补拉；首次连接由业务层主动拉历史
    if (offlineSince !== null) {
      this.callbacks.onResume?.({ attempt: resumedAttempt, offlineMs })
    }
  }

  private handleMessage = (raw: string): void => {
    let event: WsIncomingEvent
    try {
      event = JSON.parse(raw) as WsIncomingEvent
    } catch (error) {
      this.callbacks.onTransportError?.(new Error(`WS 事件解析失败: ${String(error)}`))
      return
    }

    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      this.callbacks.onTransportError?.(new Error('WS 事件缺少 type 字段'))
      return
    }

    // 去重：实时推送与重连补拉可能投递同一条事件
    if (event.eventId) {
      if (this.seenEventIds.has(event.eventId)) {
        this.callbacks.onDeduped?.(event.eventId)
        return
      }
      this.rememberEventId(event.eventId)
    }

    if (event.type === 'PONG') {
      this.lastPongAt = Date.now()
      return
    }

    if (event.type === 'KICK') {
      // 被踢：不重连，交给业务层提示并跳登录
      this.manualClose = true
      this.setStatus(WS_STATUS.DISCONNECTED, { attempt: this.attempt, reason: 'kicked' })
      this.stopHeartbeat()
      return
    }

    this.callbacks.onEvent?.(event)
  }

  private handleClose = (info: { code: number; reason: string }): void => {
    this.transport = null
    this.stopHeartbeat()
    this.offlineSince = this.offlineSince ?? Date.now()

    if (this.manualClose) {
      this.setStatus(WS_STATUS.DISCONNECTED, { attempt: 0, reason: 'manual' })
      return
    }

    if (WS_NO_RETRY_CODES.includes(info.code)) {
      const reason = info.code === WS_CLOSE_CODE.AUTH_FAILED ? 'unauthorized' : 'kicked'
      this.setStatus(WS_STATUS.DISCONNECTED, { attempt: this.attempt, reason })
      return
    }

    this.scheduleReconnect()
  }

  private handleError = (error: unknown): void => {
    // onerror 之后浏览器必定再触发 onclose，因此这里只上报，不改变状态机
    this.callbacks.onTransportError?.(error instanceof Error ? error : new Error(String(error)))
  }

  private scheduleReconnect(): void {
    if (this.attempt >= WS_RECONNECT.maxAttempts) {
      this.setStatus(WS_STATUS.DISCONNECTED, { attempt: this.attempt, reason: 'exhausted' })
      return
    }

    const delay = this.backoffDelay(this.attempt)
    this.attempt += 1
    this.setStatus(WS_STATUS.RECONNECTING, { attempt: this.attempt, nextRetryInMs: delay })
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (this.manualClose) return
      this.openTransport(WS_STATUS.RECONNECTING)
    }, delay)
  }

  /** 指数退避 + 抖动：1s → 2s → 4s → 8s → 15s(封顶) */
  private backoffDelay(attempt: number): number {
    const base = Math.min(
      WS_RECONNECT.initialDelayMs * WS_RECONNECT.factor ** attempt,
      WS_RECONNECT.maxDelayMs
    )
    return Math.round(base * (1 + WS_RECONNECT.jitterRatio * Math.random()))
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      const silentMs = Date.now() - this.lastPongAt
      if (silentMs > this.heartbeatMs * WS_RECONNECT.missedPongLimit) {
        // 链路已死：主动断开，让重连逻辑接管（此时可能没有 onclose 事件）
        this.transport?.close(WS_CLOSE_CODE.HEARTBEAT_TIMEOUT, 'heartbeat-timeout')
        return
      }
      this.rawSend({ type: 'PING', payload: undefined })
    }, this.heartbeatMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /** 直接写入链路：心跳与 outbox 冲刷都走这里，避免心跳又被塞回队列 */
  private rawSend(event: WsOutgoingEvent): void {
    try {
      this.transport?.send(JSON.stringify(event))
    } catch (error) {
      this.callbacks.onTransportError?.(error)
    }
  }

  private flushOutbox(): void {
    if (this.outbox.length === 0) return
    const pending = this.outbox
    this.outbox = []
    pending.forEach((event) => this.rawSend(event))
    this.callbacks.onOutboxChange?.(0)
  }

  private rememberEventId(eventId: string): void {
    this.seenEventIds.add(eventId)
    this.seenOrder.push(eventId)
    while (this.seenOrder.length > this.maxSeenEventIds) {
      const oldest = this.seenOrder.shift()
      if (oldest !== undefined) this.seenEventIds.delete(oldest)
    }
  }

  private setStatus(next: WsConnectionStatus, info: RealtimeStatusInfo): void {
    if (this.status === next && next !== WS_STATUS.RECONNECTING) return
    this.status = next
    this.callbacks.onStatusChange?.(next, info)
  }
}
