import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../sdk'
import type { Message, SendMessageRequest } from '../sdk'

type Pending = SendMessageRequest & { failed: boolean; error?: unknown }

// Both live events and HTTP recovery reconcile against the persisted server ID.
export function useChat(sessionId: number) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [connection, setConnection] = useState('connecting')
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(true)
  const [hasOlder, setHasOlder] = useState(true)
  const cursor = useRef(0)
  const first = useRef<number | undefined>(undefined)
  const sending = useRef(new Set<string>())
  const active = useRef(0)
  const merge = useCallback((batch: Message[]) => {
    if (!batch.length) return
    first.current = Math.min(first.current ?? Infinity, ...batch.map((item) => item.id))
    setMessages((prior) => [...new Map([...prior, ...batch].map((item) => [item.id, item])).values()].sort((a, b) => a.id - b.id))
    setPending((prior) => prior.filter((item) => !batch.some((saved) => saved.clientMsgId === item.clientMsgId)))
  }, [])

  useEffect(() => {
    const version = ++active.current
    let disposed = false
    let socket: WebSocket | undefined
    let reconnect: number | undefined
    let attempts = 0
    let recovering = false
    let initialized = false
    let lastRead = 0
    const controller = new AbortController()
    cursor.current = 0; first.current = undefined
    const start = window.setTimeout(() => { setMessages([]); setPending([]); setLoading(true); setHasOlder(true) }, 0)
    const catchUp = async () => {
      if (recovering || disposed) return
      recovering = true
      try {
        let batch: Message[]
        do {
          batch = await api.data(api.listMessages({ path: { sessionId }, query: { afterId: initialized ? cursor.current : undefined, limit: 100 }, signal: controller.signal }))
          if (disposed) return
          merge(batch)
          // Only an ordered HTTP page advances recovery. Live events may skip earlier IDs.
          if (batch.length) cursor.current = Math.max(cursor.current, ...batch.map((item) => item.id))
          initialized = true
        } while (batch.length === 100)
        setError(undefined); setLoading(false)
        if (cursor.current > lastRead) {
          await api.markSessionRead({ path: { sessionId }, body: { lastMessageId: cursor.current }, signal: controller.signal })
          lastRead = cursor.current
        }
      } catch (failure) { if (!disposed) { setError(failure); setLoading(false) } }
      finally { recovering = false }
    }
    const connect = () => {
      if (disposed || !api.accessToken() || !navigator.onLine || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
      setConnection('connecting')
      socket = new WebSocket(api.apiBaseUrl.replace(/^http/, 'ws') + '/ws')
      socket.onopen = () => socket?.send(JSON.stringify({ type: 'AUTH', accessToken: api.accessToken() }))
      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as { type: string; payload: { sessionId?: number; message?: Message } }
          if (frame.type === 'AUTH_OK') { attempts = 0; setConnection('connected'); void catchUp() }
          if (frame.type === 'MESSAGE_CREATED' && frame.payload.sessionId === sessionId && frame.payload.message) {
            merge([frame.payload.message]); void catchUp()
          }
        } catch { setConnection('http-fallback') }
      }
      socket.onclose = () => {
        if (disposed) return
        setConnection('http-fallback')
        void catchUp()
        reconnect = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)))
      }
      socket.onerror = () => socket?.close()
    }
    const offline = () => { socket?.close(); setConnection('http-fallback') }
    const online = () => { window.clearTimeout(reconnect); void catchUp(); connect() }
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    void catchUp(); connect()
    // HTTP is also the repair path for missed events, expired WS tokens, or proxy failures.
    const poll = window.setInterval(() => { void catchUp() }, 5000)
    return () => {
      disposed = true; active.current = version + 1; controller.abort(); socket?.close()
      window.clearTimeout(start); window.clearTimeout(reconnect); window.clearInterval(poll)
      window.removeEventListener('offline', offline); window.removeEventListener('online', online)
    }
  }, [sessionId, merge])

  const send = async (body: SendMessageRequest) => {
    if (sending.current.has(body.clientMsgId)) return
    sending.current.add(body.clientMsgId)
    const version = active.current
    setPending((prior) => [...prior.filter((item) => item.clientMsgId !== body.clientMsgId), { ...body, failed: false }])
    try {
      const saved = await api.data(api.sendMessage({ path: { sessionId }, body }))
      if (active.current === version) merge([saved])
    } catch (failure) {
      if (active.current === version) setPending((prior) => prior.map((item) => item.clientMsgId === body.clientMsgId ? { ...item, failed: true, error: failure } : item))
    } finally { sending.current.delete(body.clientMsgId) }
  }
  const older = async () => {
    if (!first.current) return
    const version = active.current
    try {
      const batch = await api.data(api.listMessages({ path: { sessionId }, query: { beforeId: first.current, limit: 50 } }))
      if (active.current !== version) return
      merge(batch); setHasOlder(batch.length === 50); setError(undefined)
    } catch (failure) { if (active.current === version) setError(failure) }
  }
  return { messages, pending, connection, error, loading, hasOlder, send, older }
}
