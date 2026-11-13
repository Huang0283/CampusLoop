import { test, expect } from './fixtures'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

const user = { id: 501, nickname: '验收同学', role: 'USER', status: 'ACTIVE', email: 'student@example.invalid', rating: 0, transactionCount: 0 }
const product = { id: 601, title: '中文验收商品', description: '商品说明', images: [], price: 30, category: 'BOOKS', condition: 'GOOD', campusLocation: '校内', status: 'ON_SALE', seller: user, updatedAt: '2026-11-01T00:00:00+00:00' }
const report = { id: 701, targetType: 'PRODUCT', targetId: 601, reason: 'FAKE_PRODUCT', description: '检查商品', status: 'PENDING', createdAt: '2026-11-01T00:00:00+00:00', evidence: [] }
const pagination = { page: 1, pageSize: 20, total: 1 }

test.beforeEach(async ({ page }) => {
  await page.route('**/notifications', route => route.fulfill({ json: { data: [] } }))
  await page.route('**/auth/browser-session', route => route.fulfill({ json: { data: { accessToken: 'fixture-not-real', expiresIn: 600, user: { ...user, role: 'ADMIN' } } } }))
  await page.route('**/admin/users?**', route => route.fulfill({ json: { data: { items: [user], pagination } } }))
  await page.route('**/admin/users/501/risk-clues*', route => route.fulfill({ json: { data: { status: 'INSUFFICIENT_DATA', algorithmVersion: 'm8-risk-clue-rule-v1', sourceWindowAsOf: '2026-11-01T00:00:00+00:00', missingInputs: ['failedPaymentCount24h', 'sameDeviceAccountCount7d'], recommendedAction: 'NONE', clues: [], degraded: false } } }))
  await page.route('**/admin/reports?**', route => route.fulfill({ json: { data: [report] } }))
  await page.route('**/admin/products?**', route => route.fulfill({ json: { data: { items: [{ product, moderationBlocked: false }], pagination } } }))
  await page.route('**/admin/products/601*', route => route.fulfill({ json: { data: { product, moderationBlocked: false } } }))
  await page.route('**/admin/dashboard?**', route => route.fulfill({ json: { data: adminDashboardFixture } }))
})

for (const width of [1440, 390]) {
  test(`admin console sections, filters and detail dialogs display Chinese at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/admin/users')
    await expect(page.getByRole('button', { name: '详情与人工处理 #501', exact: true })).toBeVisible()
    await expect(page.getByText('求购', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '详情与人工处理 #501', exact: true }).click()
    const drawer = page.getByRole('dialog')
    await expect(drawer.getByText('普通用户', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '读取风险线索（记录访问审计）' }).click()
    await expect(drawer.getByText('数据不足，暂不能完整判断', { exact: true })).toBeVisible()
    await expect(drawer.getByText('暂无处理建议', { exact: true })).toBeVisible()
    await expect(drawer.getByText('暂无风险线索', { exact: true })).toBeVisible()
    await expect(drawer).not.toContainText(/INSUFFICIENT_DATA|failedPaymentCount24h|sameDeviceAccountCount7d|m8-risk|NONE|\[\]/)
    await drawer.getByRole('button', { name: '关闭', exact: true }).click()
    await page.goto('/admin/reports')
    await page.getByRole('button', { name: '举报详情 #701', exact: true }).click()
    await expect(drawer.getByText('虚假商品', { exact: true })).toBeVisible()
    await expect(drawer.getByText('待处理', { exact: true })).toBeVisible()
    await expect(drawer).not.toContainText(/PRODUCT|FAKE_PRODUCT|PENDING/)
    await drawer.getByRole('button', { name: '关闭', exact: true }).click()
    await page.goto('/admin/products')
    await page.getByLabel('筛选治理商品状态').click()
    for (const name of ['在售', '已下架', '已预订', '已售出']) await expect(page.getByRole('option', { name, exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '查看并处理商品 #601', exact: true }).click()
    await expect(drawer.getByText('在售', { exact: true })).toBeVisible()
    await expect(drawer).not.toContainText(/ON_SALE|HIDDEN|RESERVED|SOLD/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: '商品治理', exact: true })).toBeVisible()
    await expect(page.getByText('求购', { exact: true })).toHaveCount(0)
  })
}

test('admin dashboard refreshes when the browser tab returns to the foreground', async ({ page }) => {
  let reads = 0
  await page.route('**/admin/dashboard?**', route => {
    reads += 1
    return route.fulfill({ json: { data: adminDashboardFixture } })
  })
  await page.goto('/admin')
  await expect.poll(() => reads).toBeGreaterThan(0)
  const beforeReturn = reads
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => reads).toBeGreaterThan(beforeReturn)
})

test('administrator detail forms can be minimized and restored without losing drafts', async ({ page }) => {
  await page.goto('/admin/users')
  await page.getByRole('button', { name: '详情与人工处理 #501', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const facts = dialog.getByLabel('相关行为与事实', { exact: true })
  await facts.fill('待核实的事实草稿')
  await dialog.getByRole('button', { name: '最小化窗口', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: /恢复未完成的窗口/ }).click()
  await expect(facts).toHaveValue('待核实的事实草稿')
})

test('report search sends live keywords and combines them with status', async ({ page }) => {
  const queries: URL[] = []
  await page.route('**/admin/reports?**', route => {
    const url = new URL(route.request().url())
    queries.push(url)
    const items = url.searchParams.get('query') === '没有这条举报' ? [] : [report]
    return route.fulfill({ json: { data: items } })
  })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/admin/reports')
  await page.getByLabel('搜索举报', { exact: true }).fill('自行车')
  await expect.poll(() => queries.at(-1)?.searchParams.get('query')).toBe('自行车')
  await page.getByLabel('举报状态筛选').click()
  await page.getByRole('option', { name: '待处理', exact: true }).click()
  await expect.poll(() => queries.at(-1)?.searchParams.get('status')).toBe('PENDING')
  expect(queries.at(-1)?.searchParams.get('query')).toBe('自行车')
  expect(queries.at(-1)?.searchParams.get('page')).toBe('1')
  await page.getByLabel('搜索举报', { exact: true }).fill('没有这条举报')
  await expect(page.getByRole('button', { name: '举报详情 #701' })).toHaveCount(0)
  await page.getByLabel('搜索举报', { exact: true }).fill('')
  await expect(page.getByRole('button', { name: '举报详情 #701' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [1440, 390]) {
  test(`audit log defaults to seven days and paginates each selected window at ${width}px`, async ({ page }) => {
    const queries: URL[] = []
    await page.route('**/admin/audit-logs?**', route => {
      const url = new URL(route.request().url())
      queries.push(url)
      const current = Number(url.searchParams.get('page'))
      return route.fulfill({ json: { data: {
        items: [{ id: current, event: 'admin_product_read', decision: false, actor: { id: 501, nickname: '验收同学' }, subject: { type: 'PRODUCT', id: 601 }, resultStatus: 'RESERVED', reason: 'product_detail_review', createdAt: '2026-11-03T02:00:00+00:00' }],
        pagination: { page: current, pageSize: 20, total: 41 },
      } } })
    })
    await page.emulateMedia({ reducedMotion: width === 390 ? 'reduce' : 'no-preference' })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/admin/audit')
    await expect(page.getByText('已预订', { exact: true })).toBeVisible()
    expect(queries.at(-1)?.searchParams.get('days')).toBe('7')
    expect(queries.at(-1)?.searchParams.get('pageSize')).toBe('20')
    await page.locator('.ant-pagination-item-2').click()
    await expect.poll(() => queries.at(-1)?.searchParams.get('page')).toBe('2')
    await page.getByLabel('日志时间范围', { exact: true }).click()
    await page.getByRole('option', { name: '近 30 天', exact: true }).click()
    await expect.poll(() => queries.at(-1)?.searchParams.get('days')).toBe('30')
    expect(queries.at(-1)?.searchParams.get('page')).toBe('1')
    await page.locator('.ant-pagination-item-2').click()
    await expect.poll(() => queries.at(-1)?.searchParams.get('page')).toBe('2')
    await page.getByLabel('日志时间范围', { exact: true }).click()
    await page.getByRole('option', { name: '全部时间', exact: true }).click()
    await expect.poll(() => queries.at(-1)?.searchParams.has('days')).toBe(false)
    expect(queries.at(-1)?.searchParams.get('page')).toBe('1')
    await page.locator('.ant-pagination-item-2').click()
    await expect.poll(() => queries.at(-1)?.searchParams.get('page')).toBe('2')
    await page.getByRole('radio', { name: '含查看记录' }).click()
    await expect.poll(() => queries.at(-1)?.searchParams.get('scope')).toBe('all')
    expect(queries.at(-1)?.searchParams.get('page')).toBe('1')
    const beforeRefresh = queries.length
    await page.getByRole('button', { name: '刷新', exact: true }).click()
    await expect.poll(() => queries.length).toBeGreaterThan(beforeRefresh)
    await expect(page.locator('.adm-filters')).toContainText('共 41 条记录')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.reload()
    await expect(page.getByText('已预订', { exact: true })).toBeVisible()
    expect(queries.at(-1)?.searchParams.get('days')).toBe('7')
  })
}
