import { test, expect } from './fixtures'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

const user = { id: 501, nickname: '验收同学', role: 'USER', status: 'ACTIVE', email: 'student@example.invalid', rating: 0, transactionCount: 0 }
const product = { id: 601, title: '中文验收商品', description: '商品说明', images: [], price: 30, category: 'BOOKS', condition: 'GOOD', campusLocation: '校内', status: 'ON_SALE', seller: user, updatedAt: '2026-11-01T00:00:00+00:00' }
const report = { id: 701, targetType: 'PRODUCT', targetId: 601, reason: 'FAKE_PRODUCT', description: '检查商品', status: 'PENDING', createdAt: '2026-11-01T00:00:00+00:00', evidence: [] }
const pagination = { page: 1, pageSize: 20, total: 1 }

test.beforeEach(async ({ page }) => {
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
