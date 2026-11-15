import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'

const stamp = '2026-11-15T00:00:00Z'
const user = { id: 501, nickname: '市场', role: 'USER', status: 'ACTIVE', email: 'buyer@example.invalid', rating: 0, transactionCount: 1 }
const seller = { ...user, id: 502, nickname: '王同学', email: 'seller@example.invalid' }
const product = { id: 601, title: '二手笔记本电脑', description: '', category: 'DIGITAL', condition: 'GOOD', campusLocation: '校内', price: 100, images: [], seller, status: 'SOLD', createdAt: stamp, updatedAt: stamp }
const order = { id: 1001, product, buyer: user, seller, status: 'COMPLETED', amount: 100, buyerConfirmedComplete: true, sellerConfirmedComplete: true, createdAt: stamp, updatedAt: stamp }
const peerReview = { id: 1, orderId: 1001, reviewerId: 502, revieweeId: 501, overall: 4, descriptionAccuracy: null, communication: 5, punctuality: 4, comment: '旧评价原文', createdAt: stamp }

for (const width of [1440, 390]) test(`saved reviews are readable after navigation and reload with original text at ${width}px`, async ({ page }) => {
  const reviews = [peerReview]
  let writes = 0
  let failReviewRead = true
  await page.setViewportSize({ width, height: 900 })
  await routeApiFixture(page, route => {
    const request = route.request(), url = new URL(request.url())
    if (url.pathname === '/auth/browser-session') return route.fulfill({ json: { data: { accessToken: 'fixture', expiresIn: 600, user } } })
    if (url.pathname === '/notifications' || url.pathname === '/orders/1001/events') return route.fulfill({ json: { data: [] } })
    if (url.pathname === '/orders/1001') return route.fulfill({ json: { data: order } })
    if (url.pathname === '/orders/1001/reviews') {
      if (failReviewRead) return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
      return route.fulfill({ json: { data: reviews } })
    }
    if (url.pathname === '/reviews') {
      writes++
      expect(request.headers()['idempotency-key']).toBeTruthy()
      reviews.push({ ...request.postDataJSON(), id: 2, reviewerId: 501, revieweeId: 502, createdAt: stamp })
      return route.fulfill({ status: 201, json: { data: reviews[1] } })
    }
    if (url.pathname === '/display-translation/translate') return route.fulfill({ json: { translations: request.postDataJSON().texts } })
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  await page.goto('/transactions/1001')
  await page.getByRole('link', { name: '查看评价', exact: true }).click()
  await expect(page.getByRole('button', { name: /^重\s*试$/ })).toBeVisible()
  failReviewRead = false
  await page.getByRole('button', { name: /^重\s*试$/ }).click()
  await expect(page.getByRole('region', { name: '对方的评价', exact: true })).toContainText('旧评价原文')
  await expect(page.getByText('未评分', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '评价交易', exact: true }).click()
  for (const field of ['overall', 'descriptionAccuracy', 'communication', 'punctuality']) await page.locator(`#${field} .ant-rate-star`).nth(4).click()
  const comment = '市场\n' + '长评价内容'.repeat(100)
  await page.getByLabel('评价内容', { exact: true }).fill(comment)
  await page.getByRole('button', { name: '提交评价', exact: true }).click()
  await expect(page.getByRole('region', { name: '我的评价', exact: true })).toContainText(comment)
  await page.reload()
  await expect(page.getByRole('region', { name: '我的评价', exact: true })).toContainText(comment)
  await expect(page.getByRole('button', { name: '提交评价', exact: true })).toHaveCount(0)
  expect(writes).toBe(1)
  await page.getByRole('link', { name: '返回订单', exact: true }).click()
  await expect(page.getByRole('heading', { name: '订单 #1001', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: '我的评价', exact: true })).toContainText(comment)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('combobox', { name: '界面语言', exact: true }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.getByRole('region', { name: 'My review', exact: true })).toContainText(comment)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('admin order filters and exports send the same multi-keyword query and reset pagination', async ({ page }) => {
  const calls: URL[] = []
  await routeApiFixture(page, route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/browser-session') return route.fulfill({ json: { data: { accessToken: 'fixture', expiresIn: 600, user: { ...user, role: 'ADMIN' } } } })
    if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
    if (url.pathname === '/admin/orders') {
      calls.push(url)
      return route.fulfill({ json: { data: { items: [order], pagination: { page: Number(url.searchParams.get('page')), pageSize: Number(url.searchParams.get('pageSize')), total: url.searchParams.get('query') ? 1 : 23 } } } })
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  await page.goto('/admin/orders')
  await page.locator('.ant-pagination-item-2').click()
  await expect.poll(() => calls.at(-1)?.searchParams.get('page')).toBe('2')
  await page.getByLabel('搜索订单', { exact: true }).fill('电脑 王同学')
  await expect.poll(() => calls.at(-1)?.searchParams.get('query')).toBe('电脑 王同学')
  expect(calls.at(-1)?.searchParams.get('page')).toBe('1')
  await page.getByLabel('订单状态', { exact: true }).click()
  await page.getByRole('option', { name: '已完成', exact: true }).click()
  await expect.poll(() => calls.at(-1)?.searchParams.get('status')).toBe('COMPLETED')
  await page.getByRole('button', { name: '其他导出格式', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: '导出 CSV', exact: true }).click()
  await download
  expect(calls.at(-1)?.searchParams.get('query')).toBe('电脑 王同学')
  expect(calls.at(-1)?.searchParams.get('status')).toBe('COMPLETED')
  expect(calls.at(-1)?.searchParams.get('pageSize')).toBe('100')
  await page.getByLabel('搜索订单', { exact: true }).fill('')
  await expect.poll(() => calls.at(-1)?.searchParams.get('query')).toBeNull()
  expect(calls.at(-1)?.searchParams.get('page')).toBe('1')
})
