import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

const self = { id: 501, nickname: '当前管理员', role: 'ADMIN', status: 'ACTIVE', email: 'self@example.invalid', rating: 0, transactionCount: 0 }
const users = [self,
  { ...self, id: 502, nickname: '其他管理员', email: 'peer@example.invalid' },
  { ...self, id: 503, nickname: '普通同学', role: 'USER', email: 'student@example.invalid' },
  { ...self, id: 504, nickname: '停用同学', role: 'USER', status: 'DISABLED', email: 'disabled@example.invalid' },
]

for (const width of [1440, 390]) {
  test(`administrator profiles are read-only while student moderation remains available at ${width}px`, async ({ page }) => {
    const unexpected: string[] = []
    await routeApiFixture(page, route => {
      const request = route.request(), path = new URL(request.url()).pathname
      const reply = (data: unknown) => route.fulfill({ json: { data } })
      if (request.method() === 'POST' && path === '/auth/browser-session') return reply({ accessToken: 'protection-fixture', expiresIn: 600, user: self })
      if (request.method() === 'GET' && path === '/admin/dashboard') return reply(adminDashboardFixture)
      if (request.method() === 'GET' && path === '/notifications') return reply([])
      if (request.method() === 'GET' && path === '/admin/users') return reply({ items: users, pagination: { page: 1, pageSize: 20, total: users.length } })
      unexpected.push(`${request.method()} ${path}`)
      return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
    })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/admin/users')
    for (const id of [501, 502]) {
      await expect(page.getByRole('button', { name: `详情与人工处理 #${id}`, exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: `查看资料 #${id}`, exact: true }).click()
      const dialog = page.getByRole('dialog', { name: '管理员资料', exact: true })
      await expect(dialog.getByText('管理员账号受保护，不能在用户管理中禁用自己或其他管理员。', { exact: true })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /禁用账号|恢复账号|读取风险线索/ })).toHaveCount(0)
      await expect(dialog.getByRole('textbox')).toHaveCount(0)
      await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    }
    for (const [id, action] of [[503, '禁用账号并撤销会话'], [504, '恢复账号']] as const) {
      await page.getByRole('button', { name: `详情与人工处理 #${id}`, exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('button', { name: action, exact: true })).toBeEnabled()
      await expect(dialog.getByLabel('状态变更原因')).toBeVisible()
      await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    }
    await page.getByLabel('界面语言', { exact: true }).click()
    await page.getByRole('option', { name: 'English', exact: true }).click()
    await page.getByRole('button', { name: 'View profile #501', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Administrator profile', exact: true })).toContainText('Administrator accounts are protected.')
    await page.reload()
    await expect(page.getByRole('button', { name: 'View profile #501', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Details and review #501', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(unexpected).toEqual([])
  })
}
