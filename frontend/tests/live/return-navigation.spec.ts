import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

const now = '2026-11-24T10:00:00Z'
const user = { id: 501, nickname: 'Campus tester', role: 'USER', status: 'ACTIVE', email: 'return@example.invalid', rating: 0, transactionCount: 0 }
const seller = { id: 502, nickname: 'Seller', rating: 0, transactionCount: 0 }
const product = { id: 601, title: '教材', description: '教材', images: [], price: 20, category: 'BOOKS', condition: 'GOOD', campusLocation: '校内', status: 'ON_SALE', seller, createdAt: now, updatedAt: now }
const wanted = { id: 701, owner: user, title: '求购教材', description: '教材', category: 'BOOKS', condition: 'GOOD', budgetMin: 10, budgetMax: 40, location: 'ANY', status: 'OPEN', expireAt: '2030-01-01T00:00:00Z', createdAt: now }
const order = { id: 1001, product, buyer: user, seller, amount: 20, status: 'BOOKED', createdAt: now, buyerConfirmedComplete: false, sellerConfirmedComplete: false }
const notices = [
  { id: 1, type: 'MATCH_FOUND', title: '找到匹配商品', content: '匹配记录', read: true, link: '/wanted/701/matches', createdAt: now },
  { id: 2, type: 'ORDER_STATUS_CHANGED', title: '订单状态已更新', content: '订单记录', read: true, link: '/transactions/1001', createdAt: now },
]

async function setup(page: Page, language = 'zh', admin = false) {
  await page.addInitScript(language => localStorage.setItem('campusloop-language', language), language)
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const reply = (data: unknown) => route.fulfill({ json: { data } })
    if (path.startsWith('/auth/') && path.endsWith('session')) return reply({ accessToken: 'navigation-fixture', expiresIn: 600, user: admin ? { ...user, role: 'ADMIN' } : user })
    if (path === '/admin/dashboard') return reply(adminDashboardFixture)
    if (path === '/users/me') return reply(user)
    if (path === '/notifications') return reply(notices)
    if (path === '/wanted/701/matches') return reply({ items: [{ product, relevanceScore: 0.8, reasons: ['TEXT_MATCH'], constraints: ['BUDGET_OK'], resultVersion: 'navigation-fixture', expiresAt: '2030-01-01T00:00:00Z' }], degraded: false })
    if (path === '/wanted/701') return reply(wanted)
    if (path === '/wanted') return reply({ items: [wanted], pagination: { page: 2, pageSize: 12, total: 13 } })
    if (path === '/products/601') return reply(product)
    if (path === '/orders/1001') return reply(order)
    if (path === '/orders/1001/events' || path === '/orders/1001/reviews') return reply([])
    if (path === '/reports/mine') return reply([{ id: 1, targetType: 'PRODUCT', targetId: 601, reason: 'DESCRIPTION_MISMATCH', description: '举报记录', status: 'PENDING', createdAt: now }])
    if (path === '/account/decisions') return reply({ items: [], pagination: { page: 1, pageSize: 10, total: 0 } })
    if (['/products', '/products/mine', '/favorites', '/orders'].includes(path)) return reply({ items: path === '/orders' ? [order] : [product], pagination: { page: 1, pageSize: 12, total: 1 } })
    if (path === '/display-translation/translate') {
      const body = request.postDataJSON() as { texts: string[]; target: string }
      return route.fulfill({ json: { translations: body.texts.map(text => body.target === 'en' ? 'Textbook' : text) } })
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
}

for (const width of [1440, 390]) {
  test(`wanted matches and notifications return through the full journey at ${width}px`, async ({ page }) => {
    await setup(page)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/wanted?query=textbook&page=2')
    await page.getByRole('link', { name: '查看匹配', exact: true }).click()
    await expect(page).toHaveURL(/\/wanted\/701\/matches$/)
    await page.getByRole('link', { name: '查看匹配通知', exact: true }).click()
    await expect(page.getByRole('tab', { name: /^匹配/ })).toHaveAttribute('aria-selected', 'true')
    await page.reload()
    await expect(page.locator('.page-back-link')).toBeVisible()
    await page.getByRole('tab', { name: /^全部/ }).click()
    await page.getByRole('listitem').filter({ hasText: '订单记录' }).click()
    await expect(page).toHaveURL(/\/transactions\/1001$/)
    await expect(page.getByRole('heading', { name: '订单 #1001', exact: true })).toBeVisible()
    await expect(page.locator('.page-back-link')).toHaveAttribute('href', '/notifications')
    await page.locator('.page-back-link').click()
    await expect(page).toHaveURL(/\/notifications$/)
    await expect(page.getByRole('tab', { name: /^全部/ })).toHaveAttribute('aria-selected', 'true')
    await page.locator('.page-back-link').click()
    await expect(page).toHaveURL(/\/wanted\/701\/matches$/)
    await page.locator('.catalog-title').click()
    await expect(page).toHaveURL(/\/product\/601$/)
    await expect(page.locator('.product-info h1')).toBeVisible()
    await expect(page.locator('.page-back-link')).toHaveAttribute('href', '/wanted/701/matches')
    await page.locator('.page-back-link').click()
    await expect(page).toHaveURL(/\/wanted\/701\/matches$/)
    await page.locator('.page-back-link').click()
    await expect(page).toHaveURL(/\/wanted\?query=textbook&page=2$/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('notification bell preserves filtered market URL and English return text after reload', async ({ page }) => {
  await setup(page, 'en')
  await page.goto('/market?category=BOOKS&sort=price_asc&page=3')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  await expect(page.locator('.page-back-link')).toHaveText(/Back to previous page/)
  await page.getByRole('tab', { name: /^Matches/ }).click()
  await page.reload()
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/market\?category=BOOKS&sort=price_asc&page=3$/)
})

test('secondary pages opened directly provide an in-site default return', async ({ page }) => {
  await setup(page)
  for (const [path, fallback] of [
    ['/notifications', '/market'], ['/profile', '/market'], ['/my-products', '/market'], ['/favorites', '/market'],
    ['/report', '/market'], ['/publish', '/market'], ['/product/601/edit', '/product/601'],
    ['/wanted/publish', '/wanted'], ['/publish/price-advice', '/publish'], ['/account/decisions', '/notifications'],
    ['/transactions/1001', '/transactions'], ['/transactions/1001/meetup', '/transactions/1001'],
  ]) {
    await page.goto(path)
    await expect(page.locator('.page-heading .page-back-link')).toHaveAttribute('href', fallback)
    await expect(page.locator('.page-heading .page-back-link')).toBeVisible()
  }
})

test('external and self return destinations use a safe fallback', async ({ page }) => {
  await setup(page)
  for (const returnTo of ['https://example.invalid', '//example.invalid', '/notifications', '/market\\evil']) {
    await page.goto('/notifications')
    await page.evaluate(returnTo => {
      history.replaceState({ ...history.state, usr: { returnTo } }, '')
    }, returnTo)
    await page.reload()
    await expect(page.locator('.page-back-link')).toHaveAttribute('href', '/market')
  }
})

test('order and report detail returns preserve list filters and page', async ({ page }) => {
  await setup(page)
  await page.goto('/transactions?role=buyer&status=BOOKED&page=2')
  await page.getByRole('button', { name: '查看订单', exact: true }).click()
  await expect(page).toHaveURL(/\/transactions\/1001$/)
  await expect(page.getByRole('heading', { name: '订单 #1001', exact: true })).toBeVisible()
  await page.locator('.product-summary a').click()
  await expect(page).toHaveURL(/\/product\/601$/)
  await expect(page.locator('.product-info h1')).toBeVisible()
  await expect(page.locator('.page-back-link')).toHaveAttribute('href', '/transactions/1001')
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/transactions\/1001$/)
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/transactions\?role=buyer&status=BOOKED&page=2$/)
  await page.goto('/report?page=2')
  await page.locator('.report-target').click()
  await expect(page).toHaveURL(/\/product\/601$/)
  await expect(page.locator('.product-info h1')).toBeVisible()
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/report\?page=2$/)
  await expect(page.locator('.report-pager-label')).toHaveText('第 2 页')
})

test('administrator notifications return to the console and direct access has a fallback', async ({ page }) => {
  await setup(page, 'zh', true)
  await page.goto('/admin')
  await page.getByRole('button', { name: '通知', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/notifications$/)
  await page.reload()
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/notifications')
  await expect(page.locator('.page-back-link')).toHaveAttribute('href', '/admin')
})

test('repeated matches and notification navigation keeps a bounded return chain without a loop', async ({ page }) => {
  await setup(page)
  await page.goto('/wanted?query=textbook&page=2')
  await page.getByRole('link', { name: '查看匹配', exact: true }).click()
  for (let index = 0; index < 12; index++) {
    await page.getByRole('link', { name: '查看匹配通知', exact: true }).click()
    await page.getByRole('listitem').filter({ hasText: '匹配记录' }).click()
    await expect(page).toHaveURL(/\/wanted\/701\/matches$/)
  }
  const paths = await page.evaluate(() => {
    const paths: string[] = []
    let state = history.state?.usr
    while (state?.returnTo && paths.length < 30) { paths.push(state.returnTo); state = state.returnState }
    return paths
  })
  expect(paths.length).toBeLessThanOrEqual(8)
  expect(new Set(paths).size).toBe(paths.length)
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/notifications\?group=/)
  await page.locator('.page-back-link').click()
  await expect(page).toHaveURL(/\/wanted\?query=textbook&page=2$/)
})
