import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../sdk'
import type { Message, SendMessageRequest } from '../sdk'

type Pending = SendMessageRequest & { sessionId: number; failed: boolean; error?: unknown }

// Both live events and HTTP recovery reconcile against the persisted server ID.
export function useChat(sessionIds: number[]) {
  const sessionKey = [...new Set(sessionIds)].sort((a, b) => a - b).join(',')
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState<Pending[]>([])
  const [connection, setConnection] = useState('connecting')
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(true)
  const [hasOlder, setHasOlder] = useState(true)
  const cursors = useRef(new Map<number, number>())
  const first = useRef(new Map<number, number>())
  const olderSessions = useRef(new Set<number>())
  const loadingOlder = useRef(false)
  const sending = useRef(new Set<string>())
  const liveSessions = useRef(new Set<number>())
  const active = useRef(0)
  const merge = useCallback((batch: Message[]) => {
    if (!batch.length) return
    for (const item of batch) first.current.set(item.sessionId, Math.min(first.current.get(item.sessionId) ?? Infinity, item.id))
    setMessages((prior) => [...new Map([...prior, ...batch].map((item) => [item.id, item])).values()].sort((a, b) => a.id - b.id))
    setPending((prior) => prior.filter((item) => !batch.some((saved) => saved.clientMsgId === item.clientMsgId)))
  }, [])

  useEffect(() => {
    const version = ++active.current
    const ids = sessionKey.split(',').filter(Boolean).map(Number)
    liveSessions.current = new Set(ids)
    let disposed = false
    let socket: WebSocket | undefined
    let reconnect: number | undefined
    let attempts = 0
    const recovering = new Set<number>()
    const initialized = new Set<number>()
    const lastRead = new Map<number, number>()
    const failures = new Map<number, unknown>()
    const loadingSessions = new Set(ids)
    const controller = new AbortController()
    cursors.current = new Map(); first.current = new Map(); olderSessions.current = new Set(); loadingOlder.current = false
    const start = window.setTimeout(() => {
      setMessages((prior) => prior.filter((item) => ids.includes(item.sessionId)))
      setPending((prior) => prior.filter((item) => ids.includes(item.sessionId)))
      setLoading(true); setHasOlder(true)
    }, 0)
    const catchUp = async (sessionId: number) => {
      if (recovering.has(sessionId) || disposed) return
      recovering.add(sessionId)
      try {
        let batch: Message[]
        do {
          const initialPage = !initialized.has(sessionId)
          batch = await api.data(api.listMessages({ path: { sessionId }, query: { afterId: initialPage ? undefined : cursors.current.get(sessionId) ?? 0, limit: 100 }, signal: controller.signal }))
          if (disposed) return
          if (initialPage) {
            if (batch.length === 100) olderSessions.current.add(sessionId)
            setHasOlder(olderSessions.current.size > 0)
          }
          merge(batch)
          // Only an ordered HTTP page advances recovery. Live events may skip earlier IDs.
          if (batch.length) cursors.current.set(sessionId, Math.max(cursors.current.get(sessionId) ?? 0, ...batch.map((item) => item.id)))
          initialized.add(sessionId)
        } while (batch.length === 100)
        const cursor = cursors.current.get(sessionId) ?? 0
        if (cursor > (lastRead.get(sessionId) ?? 0)) {
          await api.markSessionRead({ path: { sessionId }, body: { lastMessageId: cursor }, signal: controller.signal })
          lastRead.set(sessionId, cursor)
        }
        failures.delete(sessionId)
      } catch (failure) { if (!disposed) failures.set(sessionId, failure) }
      finally {
        recovering.delete(sessionId); loadingSessions.delete(sessionId)
        if (!disposed) { setError(failures.values().next().value); setLoading(loadingSessions.size > 0) }
      }
    }
    const catchUpAll = () => { for (const id of ids) void catchUp(id) }
    const connect = () => {
      if (disposed || !api.accessToken() || !navigator.onLine || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
      setConnection('connecting')
      socket = new WebSocket(api.webSocketUrl)
      socket.onopen = () => socket?.send(JSON.stringify({ type: 'AUTH', accessToken: api.accessToken() }))
      socket.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as { type: string; payload: { sessionId?: number; message?: Message } }
          if (frame.type === 'AUTH_OK') { attempts = 0; setConnection('connected'); catchUpAll() }
          if (frame.type === 'MESSAGE_CREATED' && ids.includes(frame.payload.sessionId!) && frame.payload.message) {
            merge([frame.payload.message]); void catchUp(frame.payload.sessionId!)
          }
        } catch { setConnection('http-fallback') }
      }
      socket.onclose = () => {
        if (disposed) return
        setConnection('http-fallback')
        catchUpAll()
        reconnect = window.setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)))
      }
      socket.onerror = () => socket?.close()
    }
    const offline = () => { socket?.close(); setConnection('http-fallback') }
    const online = () => { window.clearTimeout(reconnect); catchUpAll(); connect() }
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    catchUpAll(); connect()
    // HTTP is also the repair path for missed events, expired WS tokens, or proxy failures.
    const poll = window.setInterval(catchUpAll, 5000)
    return () => {
      disposed = true; liveSessions.current.clear(); active.current = version + 1; controller.abort(); socket?.close()
      window.clearTimeout(start); window.clearTimeout(reconnect); window.clearInterval(poll)
      window.removeEventListener('offline', offline); window.removeEventListener('online', online)
    }
  }, [sessionKey, merge])

  const send = async (sessionId: number, body: SendMessageRequest) => {
    if (!sessionIds.includes(sessionId)) return
    if (sending.current.has(body.clientMsgId)) return
    sending.current.add(body.clientMsgId)
    setPending((prior) => [...prior.filter((item) => item.clientMsgId !== body.clientMsgId), { ...body, sessionId, failed: false }])
    try {
      const saved = await api.data(api.sendMessage({ path: { sessionId }, body }))
      if (liveSessions.current.has(sessionId)) merge([saved])
    } catch (failure) {
      if (liveSessions.current.has(sessionId)) setPending((prior) => prior.map((item) => item.clientMsgId === body.clientMsgId ? { ...item, failed: true, error: failure } : item))
    } finally { sending.current.delete(body.clientMsgId) }
  }
  const older = async () => {
    if (loadingOlder.current) return
    loadingOlder.current = true
    const version = active.current
    try {
      await Promise.all([...olderSessions.current].map(async (sessionId) => {
        const beforeId = first.current.get(sessionId)
        if (!beforeId) return
        const batch = await api.data(api.listMessages({ path: { sessionId }, query: { beforeId, limit: 50 } }))
        if (active.current !== version) return
        merge(batch)
        if (batch.length < 50) olderSessions.current.delete(sessionId)
      }))
      if (active.current === version) { setHasOlder(olderSessions.current.size > 0); setError(undefined) }
    } catch (failure) { if (active.current === version) setError(failure) }
    finally { if (active.current === version) loadingOlder.current = false }
  }
  return { messages, pending, connection, error, loading, hasOlder, send, older }
}
