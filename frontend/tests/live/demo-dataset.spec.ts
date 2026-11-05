import { type Page } from '@playwright/test'
import { test, expect } from './fixtures'

const site = 'http://127.0.0.1:5198'
const api = 'http://127.0.0.1:18026'
const password = 'CampusDemo@2026'

async function login(page: Page, role: 'buyer' | 'seller' | 'admin') {
  await page.context().clearCookies()
  await page.goto(site)
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto(`${site}/login`)
  await page.getByLabel('校园邮箱', { exact: true }).fill(`demo.${role}@example.invalid`)
  await page.getByLabel('密码', { exact: true }).fill(password)
  const signedIn = page.waitForResponse(response => response.url() === `${api}/auth/login` && response.request().method() === 'POST')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  const response = await signedIn
  expect(response.status()).toBe(200)
  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.locator('.demo-environment-notice')).toContainText('合成数据')
  return (await response.json()).data
}

test('demo dataset exposes buyer, seller and administrator journeys through real APIs', async ({ browser, request }, testInfo) => {
  test.skip(process.env.CAMPUSLOOP_UI_URL !== site, 'Only run against the dedicated demo site')
  const contexts = []
  for (const role of ['buyer', 'seller', 'admin'] as const) {
    const context = await browser.newContext()
    contexts.push(context)
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => { if (response.url().startsWith(api) && response.status() >= 500) errors.push(`${response.status()} ${response.url()}`) })
    const identity = await login(page, role)
    const headers = { Authorization: `Bearer ${identity.accessToken}` }
    if (role !== 'admin') {
      expect(identity.user.transactionCount).toBe(15)
      const ordersResponse = await request.get(`${api}/orders?role=${role}&status=COMPLETED&pageSize=100`, { headers })
      expect(ordersResponse.status()).toBe(200)
      expect((await ordersResponse.json()).data.pagination.total).toBe(15)
      const allOrders = await request.get(`${api}/orders?role=${role}&pageSize=100`, { headers })
      const orders = (await allOrders.json()).data.items
      expect(orders).toHaveLength(19)
      expect(new Set(orders.map((order: { product: { id: number } }) => order.product.id)).size).toBe(19)
      for (const order of orders) {
        expect(order.buyer.id).not.toBe(order.seller.id)
        expect(order.product.seller.id).toBe(order.seller.id)
        const detail = await request.get(`${api}/orders/${order.id}`, { headers })
        expect(detail.status()).toBe(200)
        expect((await detail.json()).data.meetup.campusLocation).toContain('校内')
      }
      const sessionsResponse = await request.get(`${api}/chat/sessions`, { headers })
      const sessions = (await sessionsResponse.json()).data
      expect(sessions).toHaveLength(25)
      const images = new Set<string>()
      for (const session of sessions) {
        for (const url of session.product.images) images.add(url)
        const messages = await request.get(`${api}/chat/sessions/${session.id}/messages`, { headers })
        expect(messages.status()).toBe(200)
        expect((await messages.json()).data.length).toBeGreaterThanOrEqual(6)
      }
      expect(images.size).toBe(81)
      if (role === 'buyer') {
        for (const url of images) {
          const image = await request.get(url)
          expect(image.status()).toBe(200)
          expect(image.headers()['content-type']).toContain('image/')
        }
      }
      const decisionsResponse = await request.get(`${api}/account/decisions`, { headers })
      const decisions = (await decisionsResponse.json()).data.items
      expect(decisions).toHaveLength(role === 'seller' ? 2 : 1)
      for (const decision of decisions) {
        const evidence = await request.get(api + decision.evidence[0], { headers })
        expect(evidence.status()).toBe(200)
        expect(evidence.headers()['content-type']).toContain('image/')
        const appealImage = await request.get(api + decision.appeal.evidence[0], { headers })
        expect(appealImage.status()).toBe(200)
      }
      for (const path of ['/profile', '/transactions', '/chat', '/notifications', '/account/decisions', '/report']) {
        await page.goto(site + path)
        await expect(page.locator('main h1').first()).toBeVisible()
      }
      if (role === 'buyer') {
        const priceResponse = await request.post(`${api}/price-advice`, { headers, data: { category: 'SPORTS', condition: 'GOOD', title: '羽毛球拍' } })
        expect(priceResponse.status()).toBe(200)
        const advice = (await priceResponse.json()).data
        expect(advice.sampleSize).toBe(0)
        expect(advice.marketReference.count).toBe(6)
        expect(advice.marketReference.lower).toBeLessThanOrEqual(advice.marketReference.upper)
        await page.goto(site + '/publish/price-advice')
        await page.getByLabel('分类', { exact: true }).click()
        await page.getByText('运动户外', { exact: true }).click()
        await page.getByLabel('商品关键词（可选）').fill('羽毛球拍')
        await page.getByRole('button', { name: '计算区间', exact: true }).click()
        await expect(page.getByText('已参考 6 件在售商品', { exact: true })).toBeVisible()
      }
    } else {
      for (const path of ['/admin', '/admin/users', '/admin/products', '/admin/orders', '/admin/reports', '/admin/appeals', '/admin/audit', '/admin/notifications', '/admin/profile']) {
        await page.goto(site + path)
        await expect(page.locator('#admin-main')).toBeVisible()
        await expect(page.getByText('操作失败，请重试。', { exact: true })).not.toBeVisible()
      }
      const reports = await request.get(`${api}/admin/reports`, { headers })
      expect(reports.status()).toBe(200)
      const items = (await reports.json()).data
      expect(items).toHaveLength(4)
      for (const item of items) {
        const evidence = await request.get(api + item.evidence[0], { headers })
        expect(evidence.status()).toBe(200)
        expect(evidence.headers()['content-type']).toContain('image/')
        expect((await request.get(api + item.evidence[0], { headers: { Authorization: '' } })).status()).toBe(401)
      }
      const appealsResponse = await request.get(`${api}/admin/appeals`, { headers })
      const appeals = (await appealsResponse.json()).data.items
      expect(appeals.map((item: { appeal: { status: string } }) => item.appeal.status).sort()).toEqual(['PENDING', 'REVOKED', 'UPHELD'])
      for (const { appeal } of appeals) {
        expect((await request.get(`${api}/admin/appeals/${appeal.id}/evidence/0`, { headers })).status()).toBe(200)
      }
    }
    expect(errors).toEqual([])
    await page.goto(site + (role === 'admin' ? '/admin' : '/transactions'))
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await expect(page.locator(role === 'admin' ? '.adm-dash' : '.order-card').first()).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`${role}-desktop.png`), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { localStorage.setItem('campusloop-language', 'en') })
    await page.reload()
    await expect(page.locator('.demo-environment-notice')).toContainText('synthetic')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    if (role !== 'admin') await expect(page.getByText('[Demo] White badminton racket pair', { exact: true }).first()).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${role}-mobile-en.png`), fullPage: true })
  }
  for (const context of contexts) await context.close()
})
