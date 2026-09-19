/**
 * M4 实时状态库（前端架构子项）
 *
 * 把"实时通信"拆成三层，页面只依赖最上面一层：
 *
 *   页面  ──►  stores/realtime.ts  （业务语义：消息缓存、乐观发送、补拉游标）
 *                    │
 *                    ├─►  api/ws.ts              （链路语义：建连、心跳、重连、去重、待发队列）
 *                    └─►  api/chat.ts            （持久化语义：历史与增量补拉，HTTP 兜底）
 *
 * 三条不变量（M10 会按这个验）：
 *  1. 同一 clientMsgId 的消息在界面上只出现一次 —— 乐观消息、ACK、补拉结果都按它合并；
 *  2. 同一 eventId 的事件只被处理一次 —— 由 api/ws.ts 的去重表保证；
 *  3. 断线期间的消息不会丢 —— 重连后按会话游标（cursors）做增量补拉。
 */

import { create } from 'zustand'
import { WS_RECONNECT, WS_STATUS } from '../constants/websocket'
import type { WsIncomingEvent } from '../constants/websocket'
import { RealtimeClient, createWebSocketTransport } from '../api/ws'
import type { RealtimeStatusInfo } from '../api/ws'
import { createMockWsTransport } from '../api/mockWsTransport'
import type { MockWsController } from '../api/mockWsTransport'
import { httpMessageSource } from '../api/chat'
import type { MessageSource } from '../api/chat'
import { createMockChatBackend } from '../mocks/chatBackend'
import { CURRENT_USER_ID } from '../mocks/transaction'
import type { Message, WsConnectionStatus } from '../types/transaction'

/* ---------- 运行模式 ---------- */

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? ''

/**
 * 未配置 VITE_WS_URL → 后端未就绪 → 原型模式：mock 链路 + 内存消息源。
 * 页面上"断线 / 重连 / 补拉 / 重发"仍然真实走过完整状态机，不是写死的假状态。
 */
export const IS_REALTIME_MOCK = WS_URL.length === 0

/** ACK 超时：超过则判定发送失败并允许重发。原型模式调短，便于演示失败态 */
const ACK_TIMEOUT_MS = IS_REALTIME_MOCK ? 3000 : 8000

/* ---------- 模块级单例（刻意不放进 state，避免触发无谓渲染） ---------- */

let client: RealtimeClient | null = null
let mockController: MockWsController | null = null

const mockBackend = IS_REALTIME_MOCK ? createMockChatBackend() : null
const messageSource: MessageSource = mockBackend ? mockBackend.source : httpMessageSource

const ackTimers = new Map<string, number>()
let tempMessageSeq = 0

/* ---------- 纯函数工具 ---------- */

const byCreatedAt = (a: Message, b: Message): number =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

/** 幂等键：优先用 clientMsgId（乐观消息与服务端消息共享它） */
const messageKey = (m: Message): string => (m.clientMsgId ? `c:${m.clientMsgId}` : `i:${m.id}`)

function nextTempId(): number {
  tempMessageSeq += 1
  return -tempMessageSeq
}

function createClientMsgId(): string {
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') return cryptoObj.randomUUID()
  return `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 当前登录用户 id：真实模式由登录态写入 localStorage，原型模式回退到 mock 用户 */
export function currentUserId(): number {
  const parsed = Number(localStorage.getItem('userId'))
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return IS_REALTIME_MOCK ? CURRENT_USER_ID : 0
}

/** 合并消息：按 clientMsgId 去重，服务端字段覆盖本地，但保留本地发送态 */
function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const byKey = new Map<string, Message>()
  existing.forEach((m) => byKey.set(messageKey(m), m))
  incoming.forEach((m) => {
    const key = messageKey(m)
    const prev = byKey.get(key)
    byKey.set(key, prev ? { ...prev, ...m, sendStatus: prev.sendStatus ?? m.sendStatus } : m)
  })
  return [...byKey.values()].sort(byCreatedAt)
}

function maxMessageId(list: Message[]): number {
  return list.reduce((max, m) => (m.id > max ? m.id : max), 0)
}

function clearAckTimer(sessionId: number, clientMsgId: string): void {
  const key = `${sessionId}:${clientMsgId}`
  const timer = ackTimers.get(key)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    ackTimers.delete(key)
  }
}

/* ---------- State / Actions ---------- */

export interface RealtimeState {
  status: WsConnectionStatus
  reconnectAttempt: number
  nextRetryInMs: number | null
  /** 上次断线原因：鉴权失败要引导重新登录，与普通抖动文案不同 */
  disconnectReason: RealtimeStatusInfo['reason'] | null
  /** 离线待发队列长度 */
  pendingOutbox: number
  /** 被去重丢弃的事件数（M10 可拿它做断言） */
  dedupedEvents: number
  messagesBySession: Record<number, Message[]>
  /** 会话 -> 已同步到的最大消息 id，断线补拉的游标 */
  cursors: Record<number, number>
  loadingSessions: Record<number, boolean>
  sessionErrors: Record<number, string | null>
  lastSyncedAt: Record<number, number>
}

export interface RealtimeActions {
  bootstrap: () => void
  shutdown: () => void
  openSession: (sessionId: number) => Promise<void>
  leaveSession: (sessionId: number) => void
  sendText: (sessionId: number, content: string) => void
  retryMessage: (sessionId: number, clientMsgId: string) => void
  markSessionRead: (sessionId: number) => void
  /* --- 以下为原型演示 / 测试用的故障与事件注入 --- */
  dropConnection: () => void
  failNextSend: () => void
  /** 在线收到对方消息（走完整去重链路） */
  receivePeerMessage: (sessionId: number, peerId: number, content: string) => void
  /** 服务端侧悄悄新增（不推送）：用于演示重连后补拉 */
  queueServerOnlyMessage: (sessionId: number, peerId: number, content: string) => void
  /** 原型：注入任意类型消息（mockDb 报价/订单动作产生会话内消息时调用），走完整去重分发链路 */
  injectMessage: (message: Message) => void
}

export const useRealtimeStore = create<RealtimeState & RealtimeActions>()((set, get) => {
  /** 已打开过的会话，重连后需要为它们补拉 */
  const openSessions = new Set<number>()

  const patchMessage = (
    sessionId: number,
    clientMsgId: string,
    patch: Partial<Message>
  ): void => {
    set((state) => {
      const list = state.messagesBySession[sessionId]
      if (!list) return {}
      return {
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: list.map((m) => (m.clientMsgId === clientMsgId ? { ...m, ...patch } : m)),
        },
      }
    })
  }

  const appendMessage = (sessionId: number, message: Message): void => {
    set((state) => {
      const list = state.messagesBySession[sessionId] ?? []
      const merged = mergeMessages(list, [message])
      // 无变化说明是重复投递（实时推送与补拉重叠），不触发更新
      if (merged.length === list.length && list.length > 0) return {}
      return {
        messagesBySession: { ...state.messagesBySession, [sessionId]: merged },
        cursors: {
          ...state.cursors,
          [sessionId]: Math.max(state.cursors[sessionId] ?? 0, message.id),
        },
      }
    })
  }

  const startAckTimer = (sessionId: number, clientMsgId: string): void => {
    const key = `${sessionId}:${clientMsgId}`
    clearAckTimer(sessionId, clientMsgId)
    const timer = window.setTimeout(() => {
      ackTimers.delete(key)
      patchMessage(sessionId, clientMsgId, { sendStatus: 'FAILED' })
    }, ACK_TIMEOUT_MS)
    ackTimers.set(key, timer)
  }

  /** 断线补拉：只拉游标之后的消息 */
  const catchUp = async (sessionId: number): Promise<void> => {
    const cursor = get().cursors[sessionId] ?? 0
    try {
      const missed = await messageSource.fetchAfter(sessionId, cursor, WS_RECONNECT.catchUpLimit)
      if (missed.length === 0) return
      set((state) => {
        const merged = mergeMessages(state.messagesBySession[sessionId] ?? [], missed)
        return {
          messagesBySession: { ...state.messagesBySession, [sessionId]: merged },
          cursors: { ...state.cursors, [sessionId]: maxMessageId(merged) },
          lastSyncedAt: { ...state.lastSyncedAt, [sessionId]: Date.now() },
        }
      })
    } catch {
      // 补拉失败不阻塞聊天：下次重连或重新进入会话时再试
    }
  }

  const applyIncoming = (event: WsIncomingEvent): void => {
    switch (event.type) {
      case 'MESSAGE_NEW': {
        appendMessage(event.payload.sessionId, event.payload.message)
        break
      }
      case 'MESSAGE_ACK': {
        const { sessionId, clientMsgId, messageId, createdAt } = event.payload
        clearAckTimer(sessionId, clientMsgId)
        set((state) => {
          const list = state.messagesBySession[sessionId]
          if (!list) return {}
          const next: Message[] = list
            .map((m) =>
              m.clientMsgId === clientMsgId
                ? { ...m, id: messageId, createdAt, sendStatus: 'SENT' as const }
                : m
            )
            .sort(byCreatedAt)
          return {
            messagesBySession: { ...state.messagesBySession, [sessionId]: next },
            cursors: {
              ...state.cursors,
              [sessionId]: Math.max(state.cursors[sessionId] ?? 0, messageId),
            },
          }
        })
        break
      }
      // 报价 / 订单 / 通知由各自模块的状态库消费，此处只做占位，
      // 避免 M4 的实时层膨胀成"什么都管"的上帝对象。
      case 'OFFER_UPDATE':
      case 'ORDER_UPDATE':
      case 'NOTIFICATION':
      case 'MESSAGE_READ':
        break
      default:
        break
    }
  }

  const ensureClient = (): RealtimeClient => {
    if (client) return client

    const callbacks = {
      onStatusChange: (status: WsConnectionStatus, info: RealtimeStatusInfo): void => {
        set({
          status,
          reconnectAttempt: info.attempt,
          nextRetryInMs: info.nextRetryInMs ?? null,
          disconnectReason: info.reason ?? null,
        })
      },
      onEvent: (event: WsIncomingEvent): void => applyIncoming(event),
      onResume: (): void => {
        // 重连成功：把所有已打开的会话补拉一遍
        openSessions.forEach((sessionId) => {
          void catchUp(sessionId)
        })
      },
      onOutboxChange: (size: number): void => set({ pendingOutbox: size }),
      onDeduped: (): void => set((state) => ({ dedupedEvents: state.dedupedEvents + 1 })),
      onTransportError: (error: unknown): void => {
        console.warn('[realtime] 链路异常：', error)
      },
    }

    if (IS_REALTIME_MOCK) {
      const mock = createMockWsTransport()
      mockController = mock.controller
      client = new RealtimeClient({ transportFactory: mock.factory, ...callbacks })
    } else {
      client = new RealtimeClient({
        transportFactory: createWebSocketTransport(WS_URL, () => localStorage.getItem('token')),
        ...callbacks,
      })
    }
    return client
  }

  /** 构造一条"对方发来的"消息（仅演示/测试注入用） */
  const peerMessage = (
    sessionId: number,
    peerId: number,
    content: string
  ): Message => ({
    id: Date.now(),
    clientMsgId: createClientMsgId(),
    sessionId,
    senderId: peerId,
    kind: 'TEXT',
    content,
    createdAt: new Date().toISOString(),
  })

  return {
    status: WS_STATUS.DISCONNECTED,
    reconnectAttempt: 0,
    nextRetryInMs: null,
    disconnectReason: null,
    pendingOutbox: 0,
    dedupedEvents: 0,
    messagesBySession: {},
    cursors: {},
    loadingSessions: {},
    sessionErrors: {},
    lastSyncedAt: {},

    bootstrap: () => {
      ensureClient().connect()
    },

    shutdown: () => {
      ackTimers.forEach((timer) => window.clearTimeout(timer))
      ackTimers.clear()
      openSessions.clear()
      client?.destroy()
      client = null
      mockController = null
      set({
        status: WS_STATUS.DISCONNECTED,
        reconnectAttempt: 0,
        nextRetryInMs: null,
        pendingOutbox: 0,
      })
    },

    openSession: async (sessionId: number) => {
      openSessions.add(sessionId)
      const cached = get().messagesBySession[sessionId]

      // 已有缓存：只做增量补拉，避免聊天记录闪烁
      if (cached && cached.length > 0) {
        await catchUp(sessionId)
        return
      }

      set((state) => ({
        loadingSessions: { ...state.loadingSessions, [sessionId]: true },
        sessionErrors: { ...state.sessionErrors, [sessionId]: null },
      }))

      try {
        const history = await messageSource.fetchHistory(sessionId, 30)
        set((state) => ({
          messagesBySession: {
            ...state.messagesBySession,
            [sessionId]: mergeMessages([], history),
          },
          cursors: { ...state.cursors, [sessionId]: maxMessageId(history) },
          loadingSessions: { ...state.loadingSessions, [sessionId]: false },
          lastSyncedAt: { ...state.lastSyncedAt, [sessionId]: Date.now() },
        }))
      } catch (error) {
        set((state) => ({
          loadingSessions: { ...state.loadingSessions, [sessionId]: false },
          sessionErrors: {
            ...state.sessionErrors,
            [sessionId]: error instanceof Error ? error.message : '消息加载失败',
          },
        }))
      }
    },

    leaveSession: (sessionId: number) => {
      openSessions.delete(sessionId)
    },

    sendText: (sessionId: number, content: string) => {
      const text = content.trim()
      if (!text) return

      const clientMsgId = createClientMsgId()
      const optimistic: Message = {
        id: nextTempId(),
        clientMsgId,
        sessionId,
        senderId: currentUserId(),
        kind: 'TEXT',
        content: text,
        createdAt: new Date().toISOString(),
        sendStatus: 'SENDING',
      }

      appendMessage(sessionId, optimistic)

      const sent = ensureClient().send({
        type: 'SEND_MESSAGE',
        payload: { sessionId, clientMsgId, kind: 'TEXT', content: text },
      })

      // 离线时不启动超时：消息进待发队列，保持"发送中"，连接恢复后自动补发
      if (sent) startAckTimer(sessionId, clientMsgId)
    },

    retryMessage: (sessionId: number, clientMsgId: string) => {
      const message = get().messagesBySession[sessionId]?.find(
        (m) => m.clientMsgId === clientMsgId
      )
      if (!message || !message.content) return

      // 复用同一 clientMsgId：即使上次其实已入库，服务端也不会产生重复消息
      patchMessage(sessionId, clientMsgId, { sendStatus: 'SENDING' })
      const sent = ensureClient().send({
        type: 'SEND_MESSAGE',
        payload: {
          sessionId,
          clientMsgId,
          kind: 'TEXT',
          content: message.content,
        },
      })
      if (sent) startAckTimer(sessionId, clientMsgId)
    },

    markSessionRead: (sessionId: number) => {
      const cursor = get().cursors[sessionId] ?? 0
      if (cursor <= 0) return
      ensureClient().send({ type: 'READ', payload: { sessionId, lastMessageId: cursor } })
    },

    dropConnection: () => {
      ensureClient().simulateDisconnect()
    },

    failNextSend: () => {
      mockController?.failNextAck()
    },

    receivePeerMessage: (sessionId: number, peerId: number, content: string) => {
      const message = peerMessage(sessionId, peerId, content)
      const injected = ensureClient().injectEvent({
        eventId: `demo-${message.clientMsgId}`,
        type: 'MESSAGE_NEW',
        payload: { sessionId, message },
        sentAt: new Date().toISOString(),
      })
      // 未连接时注入无效：退回"服务端已存，靠补拉拿回"的路径
      if (!injected) mockBackend?.appendSilently(sessionId, message)
    },

    queueServerOnlyMessage: (sessionId: number, peerId: number, content: string) => {
      mockBackend?.appendSilently(sessionId, peerMessage(sessionId, peerId, content))
    },

    injectMessage: (message: Message) => {
      const injected = ensureClient().injectEvent({
        eventId: `demo-${message.clientMsgId}`,
        type: 'MESSAGE_NEW',
        payload: { sessionId: message.sessionId, message },
        sentAt: message.createdAt,
      })
      // 未连接时注入无效：退回"服务端已存，靠补拉拿回"的路径
      if (!injected) mockBackend?.appendSilently(message.sessionId, message)
    },
  }
})
