/**
 * 演示用 Mock WebSocket 传输层
 *
 * ⚠ 原型阶段专用：真实后端就绪后改用 createWebSocketTransport()，本文件整体删除。
 *
 * 它实现了与真实链路相同的 WsTransport 契约，因此状态机的每一条分支
 * （建连 → 心跳 → 异常断开 → 指数退避重连 → 待发队列冲刷 → 补拉）都能被真实走一遍，
 * 而不是在页面上用 if 写死一个假状态。
 *
 * 控制器（MockWsController）只暴露"故障注入"能力，供原型演示与 M10 端到端测试使用。
 */

import { WS_CLOSE_CODE } from '../constants/websocket'
import type { WsIncomingEvent } from '../constants/websocket'
import type { WsTransportFactory, WsTransportHandlers } from './ws'

export interface MockWsOptions {
  /** 建连模拟耗时 ms */
  connectDelayMs?: number
  /** 消息落库 ACK 延迟 ms */
  ackDelayMs?: number
  /** 心跳 PONG 延迟 ms */
  pongDelayMs?: number
}

export interface MockWsController {
  /** 让下一次 SEND_MESSAGE 收不到 ACK，用于演示"发送失败 → 点击重试" */
  failNextAck(): void
  /** 立即触发链路异常断开（走真实重连路径） */
  drop(code?: number): void
  isOpen(): boolean
}

export interface MockWsResult {
  factory: WsTransportFactory
  controller: MockWsController
}

/** 模块级自增，保证跨实例的 eventId 不重复 */
let eventSeq = 0

function nextEventId(prefix: string): string {
  eventSeq += 1
  return `${prefix}-${Date.now().toString(36)}-${eventSeq.toString(36)}`
}

export function createMockWsTransport(options: MockWsOptions = {}): MockWsResult {
  const connectDelayMs = options.connectDelayMs ?? 200
  const ackDelayMs = options.ackDelayMs ?? 400
  const pongDelayMs = options.pongDelayMs ?? 20

  let handlers: WsTransportHandlers | null = null
  let open = false
  let suppressNextAck = false
  let serverMessageIdSeq = 100_000
  const timers = new Set<number>()

  const later = (fn: () => void, ms: number): void => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  const clearAllTimers = (): void => {
    timers.forEach((id) => window.clearTimeout(id))
    timers.clear()
  }

  const emit = (event: WsIncomingEvent): void => {
    handlers?.onMessage(JSON.stringify(event))
  }

  const factory: WsTransportFactory = (nextHandlers) => {
    handlers = nextHandlers
    open = false

    later(() => {
      if (handlers !== nextHandlers) return
      open = true
      nextHandlers.onOpen()
    }, connectDelayMs)

    return {
      send: (raw) => {
        if (!open) return
        let parsed: { type?: string; payload?: unknown }
        try {
          parsed = JSON.parse(raw) as { type?: string; payload?: unknown }
        } catch {
          return
        }

        if (parsed.type === 'PING') {
          later(() => {
            emit({
              eventId: nextEventId('pong'),
              type: 'PONG',
              payload: { serverTime: new Date().toISOString() },
              sentAt: new Date().toISOString(),
            })
          }, pongDelayMs)
          return
        }

        if (parsed.type === 'SEND_MESSAGE') {
          const payload = parsed.payload as {
            sessionId: number
            clientMsgId: string
          }
          if (suppressNextAck) {
            suppressNextAck = false
            return
          }
          later(() => {
            serverMessageIdSeq += 1
            emit({
              eventId: nextEventId('ack'),
              type: 'MESSAGE_ACK',
              payload: {
                sessionId: payload.sessionId,
                clientMsgId: payload.clientMsgId,
                messageId: serverMessageIdSeq,
                createdAt: new Date().toISOString(),
              },
              sentAt: new Date().toISOString(),
            })
          }, ackDelayMs)
        }

        // TYPING / READ 在原型里不产生回执
      },

      close: (code, reason) => {
        open = false
        clearAllTimers()
        const finalCode = code ?? 1000
        // 真实 WebSocket 的 close 事件是异步派发的，这里保持同样时序，
        // 避免调用方在 close() 之后仍能看到"已连接"状态
        later(() => {
          nextHandlers.onClose({ code: finalCode, reason: reason ?? '' })
        }, 0)
      },
    }
  }

  const controller: MockWsController = {
    failNextAck() {
      suppressNextAck = true
    },
    drop(code = WS_CLOSE_CODE.HEARTBEAT_TIMEOUT) {
      open = false
      const current = handlers
      later(() => current?.onClose({ code, reason: 'simulated-drop' }), 0)
    },
    isOpen() {
      return open
    },
  }

  return { factory, controller }
}
