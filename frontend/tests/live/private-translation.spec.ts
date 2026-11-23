import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

for (const width of [1440, 390]) test(`private decisions, appeal and notice text bypass translation at ${width}px`, async ({ page }) => {
  const secret = '私密处罚和申诉证据 13919127806'
  const stamp = '2026-11-23T08:00:00Z'
  const user = { id: 501, nickname: '同学', role: 'USER', status: 'ACTIVE', email: 'private@example.invalid', avatar: null, rating: 0, transactionCount: 0 }
  let role = 'USER'
  const appeal = { id: 801, decisionId: 701, explanation: secret, status: 'PENDING', evidence: [], createdAt: stamp, reviewedAt: null, reviewReason: null }
  const decision = { id: 701, userId: 501, action: 'WARNING', reason: secret, facts: secret, basis: secret, occurredAt: stamp, createdAt: stamp, reference: null, evidence: [], revokedAt: null, revocationReason: null, appeal }
  const submitted: string[] = []
  await page.addInitScript(() => localStorage.setItem('campusloop-language', 'en'))
  await routeApiFixture(page, route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const reply = (data: unknown) => route.fulfill({ json: { data } })
    if (path === '/display-translation/translate') {
      const texts = request.postDataJSON().texts as string[]
      submitted.push(...texts)
      return route.fulfill({ json: { translations: texts.map(() => 'Public catalogue translation') } })
    }
    if (path === '/auth/browser-session') return reply({ accessToken: 'private-fixture', expiresIn: 600, user: { ...user, role } })
    if (path === '/notifications') return reply([{ id: 901, type: 'ACCOUNT_ACTION', title: '账号违规警告', content: secret, link: '/account/decisions/701', read: false, createdAt: stamp }])
    if (path === '/account/decisions/701') return reply(decision)
    if (path === '/account/decisions') return reply({ items: [decision], pagination: { page: 1, pageSize: 10, total: 1 } })
    if (path === '/admin/dashboard') return reply(adminDashboardFixture)
    if (path === '/admin/appeals') return reply({ items: [{ appeal, decision, user }], pagination: { page: 1, pageSize: 20, total: 1 } })
    if (path === '/admin/appeals/801') return reply({ appeal, decision, user })
    return route.fulfill({ status: 404 })
  })
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/notifications')
  await expect(page.locator('.notification-copy')).toContainText(secret)
  await page.goto('/account/decisions/701')
  await expect(page.getByRole('heading', { name: 'Account decisions', exact: true })).toBeVisible()
  await expect(page.locator('.moderation-stack')).toContainText(secret)
  role = 'ADMIN'
  await page.goto('/admin/appeals?appeal=801')
  await expect(page.locator('.ant-modal-body')).toContainText(secret)
  expect(submitted.some(text => text.includes('13919127806'))).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
