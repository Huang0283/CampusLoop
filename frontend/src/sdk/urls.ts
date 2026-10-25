export function resolveWebSocketUrl(apiUrl: string, configuredUrl?: string) {
  const explicit = configuredUrl?.trim()
  const url = new URL(explicit || apiUrl.replace(/\/$/, '') + '/ws')
  if (!explicit) url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  if (!['ws:', 'wss:'].includes(url.protocol)) throw new Error('VITE_WS_URL must use ws:// or wss://')
  return url.toString()
}
