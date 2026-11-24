import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

test('long product names stay inside the admin mobile viewport while the table remains scrollable', async ({ page }) => {
  const admin = { id: 501, nickname: '治理管理员', role: 'ADMIN', status: 'ACTIVE', email: 'admin@example.invalid', rating: 0, transactionCount: 0 }
  const title = 'Apple MacBook Pro 14-inch M3 Pro 18GB Memory 512GB SSD 校园自用无拆修长标题测试商品'
  const unexpected: string[] = []
  await routeApiFixture(page, route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const reply = (data: unknown) => route.fulfill({ json: { data } })
    if (request.method() === 'POST' && path === '/display-translation/translate') {
      const body = request.postDataJSON() as { texts: string[] }
      return route.fulfill({ json: { translations: body.texts } })
    }
    if (request.method() === 'POST' && path === '/auth/browser-session') return reply({ accessToken: 'admin-products-mobile', expiresIn: 600, user: admin })
    if (request.method() === 'GET' && path === '/admin/dashboard') return reply(adminDashboardFixture)
    if (request.method() === 'GET' && path === '/notifications') return reply([])
    if (request.method() === 'GET' && path === '/admin/products') return reply({
      items: [{
        product: { id: 601, seller: { id: 502, nickname: '卖家同学' }, title, category: 'DIGITAL', condition: 'GOOD', description: '', price: 2800, images: [], status: 'ON_SALE', createdAt: '2026-11-23T00:00:00Z', updatedAt: '2026-11-23T00:00:00Z' },
        moderationBlocked: false,
      }],
      pagination: { page: 1, pageSize: 20, total: 80 },
    })
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/products')
  await expect(page.getByRole('heading', { name: '商品治理', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '查看并处理商品 #601', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  const table = page.locator('.ant-table-content').first()
  expect(await table.evaluate(element => element.scrollWidth)).toBeGreaterThan(await table.evaluate(element => element.clientWidth))
  expect(unexpected).toEqual([])
})
