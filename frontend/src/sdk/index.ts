import { client } from './generated/client.gen'
import type { BrowserAuthResult } from './generated/types.gen'
import { restoreBrowserSession } from './generated/sdk.gen'
import { resolveWebSocketUrl } from './urls'

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001').replace(/\/$/, '')
export const webSocketUrl = resolveWebSocketUrl(apiBaseUrl, import.meta.env.VITE_WS_URL)
let tokens: Pick<BrowserAuthResult, 'accessToken' | 'expiresIn'> | null = null
let refreshFlight: { generation: number; promise: Promise<void> } | null = null
let generation = 0
let tokenUserId: number | null = null

export function setTokens(pair: BrowserAuthResult) { tokens = { accessToken: pair.accessToken, expiresIn: pair.expiresIn }; tokenUserId = pair.user.id; generation += 1 }
export function clearTokens() { tokens = null; tokenUserId = null; generation += 1 }
export function accessToken() { return tokens?.accessToken ?? null }

export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  details?: { appealToken?: string; expiresIn?: number }
  constructor(status: number, code: string, text: string, requestId?: string, details?: ApiError['details']) {
    super(text); this.status = status; this.code = code; this.requestId = requestId
    this.details = details
  }
}

async function nativeRequest(request: Request): Promise<Response> {
  const target = new URL(request.url)
  const browserAuth = target.origin === new URL(apiBaseUrl).origin && target.pathname.startsWith('/auth/')
  if (browserAuth) request.headers.set('X-CampusLoop-Browser', '1')
  const timeout = AbortSignal.timeout(10000)
  const signal = AbortSignal.any([request.signal, timeout])
  try { return await globalThis.fetch(request, { signal, credentials: browserAuth ? 'include' : 'omit' }) }
  catch {
    throw new ApiError(0, signal.aborted ? 'REQUEST_CANCELLED_OR_TIMEOUT' : 'NETWORK_ERROR',
      signal.aborted ? '请求取消或超时，请重试。' : '无法连接服务，请检查网络后重试。')
  }
}

async function refreshOnce(): Promise<void> {
  if (refreshFlight?.generation === generation) return refreshFlight.promise
  const current = tokens
  const started = generation
  const expectedUserId = tokenUserId
  if (!current) throw new ApiError(401, 'AUTH_UNAUTHORIZED', '请重新登录。')
  const promise = (async () => {
    const response = await nativeRequest(new Request(apiBaseUrl + '/auth/browser-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    }))
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { code?: string; details?: ApiError['details'] }
      throw new ApiError(response.status, body.code || 'REFRESH_UNAVAILABLE', response.status === 401 ? '会话已失效，请重新登录。' : '会话刷新暂不可用，请稍后重试。', undefined, body.details)
    }
    const result = await response.json() as { data: BrowserAuthResult }
    if (generation !== started) throw new ApiError(401, 'SESSION_CHANGED', '登录状态已变更。')
    if (result.data.user.id !== expectedUserId) throw new ApiError(401, 'SESSION_CHANGED', '另一个页面已切换账号，请刷新后重新操作。')
    tokens = { accessToken: result.data.accessToken, expiresIn: result.data.expiresIn }
  })().finally(() => { if (refreshFlight?.generation === started) refreshFlight = null })
  refreshFlight = { generation: started, promise }
  return promise
}

async function transport(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init)
  const started = generation
  const retry = request.clone()
  let response = await nativeRequest(request)
  const scopedAppeal = new URL(request.url).pathname.startsWith('/account/') && !tokens
  if (response.status === 401 && request.headers.has('Authorization') && !request.url.endsWith('/auth/logout') && !scopedAppeal) {
    try {
      if (generation !== started) throw new ApiError(401, 'SESSION_CHANGED', '登录状态已变更，请重新操作。')
      await refreshOnce()
      retry.headers.set('Authorization', 'Bearer ' + accessToken())
      response = await nativeRequest(retry)
    } catch (error) {
      if (generation === started && error instanceof ApiError && [401, 403, 423].includes(error.status)) {
        clearTokens()
        window.dispatchEvent(new Event('campusloop-session-expired'))
        if (error.status === 423 && error.details?.appealToken) window.dispatchEvent(new CustomEvent('campusloop-account-disabled', { detail: error.details }))
      }
      throw error
    }
  }
  if (!response.ok) {
    let body: { code?: string; message?: string; requestId?: string; details?: ApiError['details'] } = {}
    try { body = await response.clone().json() } catch { /* Safe fallback. */ }
    if ((response.status === 401 || response.status === 423) && generation === started) {
      clearTokens(); window.dispatchEvent(new Event('campusloop-session-expired'))
      if (response.status === 423 && body.details?.appealToken) window.dispatchEvent(new CustomEvent('campusloop-account-disabled', { detail: body.details }))
    }
    const messages: Record<number, string> = { 401: '请重新登录。', 403: '你无权执行此操作。', 404: '内容不存在或已不可见。', 409: '状态已变化，请刷新后重试。', 422: '请检查填写内容。', 429: '请求过于频繁，请稍后重试。', 500: '服务出错，请稍后重试。', 503: '服务暂不可用，请稍后重试。' }
    const codeMessages: Record<string, string> = {
      AUTH_INVALID_CREDENTIALS: '邮箱或密码错误，请检查后重试。', AUTH_EMAIL_EXISTS: '该邮箱已注册，请直接登录。',
      PRODUCT_STATE_CONFLICT: '商品状态已变化，当前不能操作，请刷新后确认。', PRODUCT_STALE: '商品已更新，请刷新后重新处理。',
      PRODUCT_MODERATION_HOLD: '商品已被管理员下架，请等待人工复核。', OFFER_STATE_CONFLICT: '报价状态已变化，请刷新后重试。',
      WANTED_INACTIVE: '这条求购已关闭或已过期。', SEARCH_CAPACITY_EXCEEDED: '当前搜索繁忙，请稍后重试。',
      IMAGE_TOO_LARGE: '图片不能超过 5MiB。', UNSUPPORTED_IMAGE: '图片无效，请选择 JPG 或 PNG 图片。',
      STORAGE_UNAVAILABLE: '图片存储服务暂不可用，请稍后重试。', INVALID_IMAGE_REFERENCE: '图片引用无效，请重新上传。',
    }
    const chineseMessage = body.message && /[\u3400-\u9fff]/u.test(body.message) ? body.message : undefined
    throw new ApiError(response.status, body.code || 'HTTP_ERROR', codeMessages[body.code || ''] || chineseMessage || messages[response.status] || '请求失败，请稍后重试。', body.requestId, body.details)
  }
  return response
}

client.setConfig({ baseUrl: apiBaseUrl, auth: (scheme) => scheme.in === 'cookie' ? undefined : accessToken() ?? undefined, fetch: transport, throwOnError: true })

export async function data<T>(promise: Promise<{ data: T } | undefined>): Promise<T> {
  const result = await promise
  if (!result) throw new ApiError(500, 'INVALID_RESPONSE', '服务未返回数据。')
  return result.data
}

export function idempotencyHeaders(key: string) { return { 'Idempotency-Key': key } }
export async function restoreIdentity() { return data(restoreBrowserSession({ body: {}, headers: { 'X-CampusLoop-Browser': '1' } })) }
export { client }
export * from './generated/sdk.gen'
export type * from './generated/types.gen'
