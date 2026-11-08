import { test, expect } from '@playwright/test'
import { routeApiFixture } from '../api-fixture'

test('notifications share one poller and synchronize read actions with the header (contract fixture)', async ({ page }) => {
  const user = {
    id: 501, nickname: 'Notification fixture', role: 'USER',
    status: 'ACTIVE', email: 'notification@example.invalid',
  }
  const notifications = [
    { id: 601, type: 'SYSTEM', title: '通知样例一', content: '第一条测试通知', read: false, createdAt: '2026-10-23T00:00:00Z' },
    { id: 602, type: 'SYSTEM', title: '通知样例二', content: '第二条测试通知', read: false, createdAt: '2026-10-23T00:00:00Z' },
  ]
  let notificationReads = 0
  let reportReads = 0
  const writes: string[] = []
  const unexpected: string[] = []
  const errors: string[] = []

  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await routeApiFixture(page, async route => {
    const request = route.request()

    const url = new URL(request.url())
    const method = request.method()
    const key = `${method} ${url.pathname}`
    if (method === 'OPTIONS') return route.fulfill({ status: 204 })

    let data: unknown
    if (method === 'POST' && url.pathname === '/auth/browser-session') {
      data = { accessToken: 'fixture-not-real', expiresIn: 600, user }
    } else if (method === 'GET' && url.pathname === '/notifications') {
      notificationReads += 1
      data = notifications
    } else if (method === 'GET' && url.pathname === '/reports/mine') {
      reportReads += 1
      data = []
    } else if (method === 'POST' && url.pathname === '/notifications/601/read') {
      writes.push(key)
      notifications[0].read = true
      data = {}
    } else if (method === 'POST' && url.pathname === '/notifications/read-all') {
      writes.push(key)
      notifications.forEach(item => { item.read = true })
      data = {}
    } else {
      unexpected.push(key)
      return route.fulfill({ status: 501, json: { code: 'TEST_UNEXPECTED_API' } })
    }
    return route.fulfill({ json: { code: 0, message: 'ok', data } })
  })

  await page.goto('/notifications')
  const first = page.locator('.notification-row').filter({
    has: page.getByRole('heading', { name: '通知样例一', exact: true }),
  })
  const second = page.locator('.notification-row').filter({
    has: page.getByRole('heading', { name: '通知样例二', exact: true }),
  })
  const badge = page.locator('.app-notification-bell .ant-badge-count')

  await expect(first).toBeVisible()
  await expect(second).toBeVisible()
  await expect(badge).toHaveAttribute('title', '2')
  await expect.poll(() => reportReads).toBeGreaterThan(0)
  expect(notificationReads).toBe(1)

  // Observe one real polling interval, including a short duplicate-request window.
  await expect.poll(() => notificationReads, { timeout: 8000 }).toBe(2)
  await page.waitForTimeout(350)
  expect(notificationReads).toBe(2)

  await first.getByRole('button', { name: '标为已读', exact: true }).click()
  await expect(first.getByRole('button', { name: '标为已读', exact: true })).toBeDisabled()
  await expect(badge).toHaveAttribute('title', '1')
  await expect(second.getByRole('button', { name: '标为已读', exact: true })).toBeEnabled()

  await page.getByRole('button', { name: '全部已读', exact: true }).click()
  await expect(second.getByRole('button', { name: '标为已读', exact: true })).toBeDisabled()
  await expect(badge).toBeHidden()

  expect(writes).toEqual([
    'POST /notifications/601/read',
    'POST /notifications/read-all',
  ])
  expect(unexpected).toEqual([])
  expect(errors).toEqual([])
})
