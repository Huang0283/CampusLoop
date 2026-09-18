/**
 * 原型用内存版"聊天后端"
 *
 * ⚠ 原型阶段专用：真实后端就绪后删除本文件，改用 src/api/chat.ts 的 httpMessageSource。
 *
 * 为什么需要它：原型若只读静态 mock 数组，"断线补拉"永远补不到东西，
 * 这个能力就没法演示。这里维护一份"服务端侧"的可变消息表，
 * 支持在客户端掉线期间悄悄写入消息，重连后由 fetchAfter 真正补回来。
 */

import type { MessageSource } from '../api/chat'
import type { Message } from '../types/transaction'
import { mockMessages } from './transaction'

const byCreatedAt = (a: Message, b: Message): number =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

export interface MockChatBackend {
  source: MessageSource
  /**
   * 服务端侧新增一条消息但"不推送"。
   * 用于演示：断线期间对方发消息 → 客户端收不到 → 重连后靠 HTTP 补拉拿回来。
   */
  appendSilently(sessionId: number, message: Message): void
  /** 读取当前服务端侧消息（演示/断言用） */
  peek(sessionId: number): Message[]
  /** 下一次补拉强制失败，用于演示"补拉失败不阻塞聊天" */
  failNextFetch(): void
}

export function createMockChatBackend(): MockChatBackend {
  const store = new Map<number, Message[]>()
  let failNext = false

  mockMessages.forEach((message) => {
    const list = store.get(message.sessionId) ?? []
    list.push({ ...message })
    store.set(message.sessionId, list)
  })
  store.forEach((list) => list.sort(byCreatedAt))

  const source: MessageSource = {
    async fetchHistory(sessionId, limit) {
      await delay(220)
      if (failNext) {
        failNext = false
        throw new Error('mock: 历史消息加载失败（演示用）')
      }
      const list = store.get(sessionId) ?? []
      return list.slice(-limit).map((m) => ({ ...m }))
    },
    async fetchAfter(sessionId, afterId, limit) {
      await delay(200)
      const list = store.get(sessionId) ?? []
      return list
        .filter((m) => m.id > afterId)
        .slice(0, limit)
        .map((m) => ({ ...m }))
    },
  }

  return {
    source,
    appendSilently(sessionId, message) {
      const list = store.get(sessionId) ?? []
      list.push({ ...message })
      list.sort(byCreatedAt)
      store.set(sessionId, list)
    },
    peek(sessionId) {
      return (store.get(sessionId) ?? []).map((m) => ({ ...m }))
    },
    failNextFetch() {
      failNext = true
    },
  }
}
