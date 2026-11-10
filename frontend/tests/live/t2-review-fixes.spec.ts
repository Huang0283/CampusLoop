import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'

const stamp = '2026-11-01T00:00:00+00:00'
const user = { id: 501, nickname: '验收同学', role: 'USER', status: 'ACTIVE', email: 'student@example.invalid', rating: 0, transactionCount: 0 }
const admin = { ...user, id: 502, role: 'ADMIN' }
const report = { id: 701, targetType: 'USER', targetId: 501, reason: 'SPAM', description: '核验举报', status: 'RESOLVED', createdAt: stamp, handledAt: stamp, handledBy: 502, resolutionNote: '原处理说明', evidence: [] }

for (const width of [1440, 390]) test(`report override keeps the version, reason and translated feedback at ${width}px`, async ({ page }) => {
  let current = { ...report }
  let stale = false
  const writes: Record<string, unknown>[] = []
  await routeApiFixture(page, route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/browser-session') return route.fulfill({ json: { data: { accessToken: 'fixture', expiresIn: 600, user: admin } } })
    if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
    if (url.pathname === '/admin/reports') return route.fulfill({ json: { data: [current] } })
    if (url.pathname === '/admin/reports/701/override') {
      writes.push(route.request().postDataJSON())
      expect(route.request().headers()['idempotency-key']).toBeTruthy()
      if (stale) return route.fulfill({ status: 409, json: { code: 'REPORT_STALE', message: 'Reload the report before overriding.' } })
      current = { ...current, status: 'REJECTED', resolutionNote: '补充证据后改判', handledAt: '2026-11-02T00:00:00+00:00' }
      return route.fulfill({ json: { data: current } })
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/admin/reports')
  await page.getByRole('button', { name: '举报详情 #701', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('原处理说明', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: '改判举报', exact: true }).click()
  await dialog.getByRole('button', { name: '确认改判并通知举报人', exact: true }).click()
  expect(writes).toHaveLength(0)
  await dialog.getByLabel('人工处理结论', { exact: true }).click()
  await page.getByRole('option', { name: '驳回', exact: true }).click()
  await dialog.getByLabel('处理说明', { exact: true }).fill('补充证据后改判')
  await dialog.getByRole('button', { name: '确认改判并通知举报人', exact: true }).click()
  await expect(dialog.getByText('补充证据后改判', { exact: true })).toBeVisible()
  expect(writes[0]).toEqual({ resolution: 'REJECTED', note: '补充证据后改判', expectedStatus: 'RESOLVED', expectedHandledAt: stamp })
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '举报详情 #701', exact: true }).click()
  await expect(dialog.getByText('补充证据后改判', { exact: true })).toBeVisible()
  stale = true
  await dialog.getByRole('button', { name: '改判举报', exact: true }).click()
  await dialog.getByLabel('人工处理结论', { exact: true }).click()
  await page.getByRole('option', { name: '处理完成', exact: true }).click()
  await dialog.getByLabel('处理说明', { exact: true }).fill('另一位管理员已更新')
  await dialog.getByRole('button', { name: '确认改判并通知举报人', exact: true }).click()
  await expect(dialog.getByText('举报处理结果已更新，请关闭详情并重新打开后再改判。', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => { localStorage.setItem('campusloop-language', 'en') })
  await page.reload()
  await page.getByRole('button', { name: /#701/ }).click()
  await expect(dialog.getByRole('button', { name: 'Override report decision', exact: true })).toBeVisible()
})

test('user search requests global results and resets pagination for keyword and status changes', async ({ page }) => {
  const requests: URL[] = []
  await routeApiFixture(page, route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/browser-session') return route.fulfill({ json: { data: { accessToken: 'fixture', expiresIn: 600, user: admin } } })
    if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
    if (url.pathname === '/admin/users') {
      requests.push(url)
      const found = url.searchParams.get('query') !== '没有这个用户'
      return route.fulfill({ json: { data: { items: found ? [user] : [], pagination: { page: Number(url.searchParams.get('page')), pageSize: 20, total: url.searchParams.get('query') ? Number(found) : 23 } } } })
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  await page.goto('/admin/users')
  await page.locator('.ant-pagination-item-2').click()
  await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('2')
  await page.getByLabel('搜索用户', { exact: true }).fill('E')
  await expect.poll(() => requests.at(-1)?.searchParams.get('query')).toBe('E')
  expect(requests.at(-1)?.searchParams.get('page')).toBe('1')
  await page.getByLabel('筛选账号状态', { exact: true }).click()
  await page.getByRole('option', { name: '正常', exact: true }).click()
  await expect.poll(() => requests.at(-1)?.searchParams.get('status')).toBe('ACTIVE')
  await page.getByLabel('搜索用户', { exact: true }).fill('没有这个用户')
  await expect(page.getByText('没有符合筛选条件的结果，请调整条件。', { exact: true })).toBeVisible()
  await page.getByLabel('搜索用户', { exact: true }).fill('')
  await expect(page.getByRole('button', { name: '详情与人工处理 #501', exact: true })).toBeVisible()
})

test('expired wanted posts and duplicate reviews show a specific Chinese reason', async ({ page }) => {
  await routeApiFixture(page, route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/browser-session') return route.fulfill({ json: { data: { accessToken: 'fixture', expiresIn: 600, user } } })
    if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
    if (url.pathname === '/reviews') return route.fulfill({ status: 409, json: { code: 'REVIEW_DUPLICATED', message: 'This order was already reviewed.' } })
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  await page.goto('/wanted/publish')
  await page.getByLabel('到期时间', { exact: true }).fill('2020-01-01T12:00')
  await page.getByLabel('到期时间', { exact: true }).blur()
  await page.getByRole('button', { name: '保存求购', exact: true }).click()
  await expect(page.getByText('到期时间必须晚于当前时间。', { exact: true })).toBeVisible()
  const message = await page.evaluate(async () => {
    const api = await import('/src/sdk/index.ts')
    try { await api.createReview({ body: { orderId: 601, overall: 5, descriptionAccuracy: 5, communication: 5, punctuality: 5 }, headers: api.idempotencyHeaders('isolated-fixture') }) }
    catch (error) { return (error as Error).message }
  })
  expect(message).toBe('你已经评价过这笔交易，不能重复评价。')
})
