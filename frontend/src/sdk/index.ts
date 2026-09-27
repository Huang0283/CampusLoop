import { client } from './generated/client.gen'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

client.setConfig({
  baseUrl: apiBaseUrl.replace(/\/$/, ''),
  auth: () => localStorage.getItem('token') ?? undefined,
})

export { client }
export * from './generated/sdk.gen'
export type * from './generated/types.gen'
