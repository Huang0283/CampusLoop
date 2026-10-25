import { test, expect } from '@playwright/test'
import { resolveWebSocketUrl } from '../../src/sdk/urls'

test('WebSocket deployment URLs support a separate gateway and secure API fallback', () => {
  expect(resolveWebSocketUrl('http://localhost:8000')).toBe('ws://localhost:8000/ws')
  expect(resolveWebSocketUrl('https://api.example.invalid/v1/')).toBe('wss://api.example.invalid/v1/ws')
  expect(resolveWebSocketUrl('https://api.example.invalid', ' wss://chat.example.invalid/socket ')).toBe('wss://chat.example.invalid/socket')
  expect(resolveWebSocketUrl('https://api.example.invalid', ' ')).toBe('wss://api.example.invalid/ws')
  expect(() => resolveWebSocketUrl('https://api.example.invalid', 'https://chat.example.invalid/ws')).toThrow('VITE_WS_URL')
})
