import { test, expect, type Page } from '@playwright/test'

// Explicit response fixtures cover failure presentation without changing daily accounts.
async function guest(page: Page) {
  await page.route('**/auth/browser-session', (route) => route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } }))
}

for (const [code, status, message] of [
  ['AUTH_INVALID_CREDENTIALS', 401, '邮箱或密码错误，请检查后重试。'],
  ['ACCOUNT_DISABLED', 423, '该账号已被禁用，请联系管理员处理。'],
  ['RATE_LIMITED', 429, '操作过于频繁，请稍后再试。'],
  ['INTERNAL_ERROR', 500, '服务暂不可用，请稍后重试。'],
  ['NETWORK_ERROR', 0, '网络连接失败，请检查网络后重试。'],
] as const) {
  test(`login translates ${code} and clears feedback when switching to registration`, async ({ page }) => {
    await guest(page)
    await page.route('**/auth/login', (route) => status === 0 ? route.abort() : route.fulfill({ status, json: { code, message: 'English backend failure.', requestId: 'internal-debug-id' } }))
    await page.goto('/login')
    await page.getByLabel('校园邮箱', { exact: true }).fill('test@example.com')
    await page.getByLabel('密码', { exact: true }).fill('WrongPassword')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(message)
    await expect(page.getByRole('alert')).not.toContainText(/English|internal-debug-id|AUTH_/)
    await page.getByRole('link', { name: '还没有账号？去注册' }).click()
    await expect(page.getByText(message, { exact: true })).toHaveCount(0)
  })
}

test('registration shows format hints and validates before submission on mobile', async ({ page }) => {
  await guest(page)
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto('/register')
  await expect(page.getByText('演示邮箱后缀：', { exact: false })).toBeVisible()
  await expect(page.getByText('密码长度为 8–128', { exact: false })).toBeVisible()
  await page.getByLabel('校园邮箱', { exact: true }).fill('not-email')
  await page.getByLabel('昵称', { exact: true }).fill('测试同学')
  await page.getByLabel('密码', { exact: true }).fill('1234567')
  await page.getByRole('button', { name: '注册并登录' }).click()
  await expect(page.getByText('请输入完整邮箱，例如 name@example.com。', { exact: true })).toBeVisible()
  await expect(page.getByText('密码长度须为 8–128 个字符。', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByLabel('校园邮箱', { exact: true }).fill('used@example.com')
  await page.getByLabel('密码', { exact: true }).fill('12345678')
  await page.route('**/auth/register', (route) => route.fulfill({ status: 409, json: { code: 'EMAIL_ALREADY_REGISTERED', message: 'Email is already registered.' } }))
  await page.getByRole('button', { name: '注册并登录' }).click()
  await expect(page.getByRole('alert')).toContainText('该邮箱已注册，请直接登录或使用其他邮箱。')
})

test('market defaults to relevant title/description search and keeps query in sync', async ({ page }) => {
  await guest(page)
  await page.route('**/products?**', (route) => route.fulfill({ json: { data: { items: [], pagination: { page: 1, pageSize: 1, total: 0 } } } }))
  const searches: URL[] = []
  await page.route('**/search?**', (route) => {
    searches.push(new URL(route.request().url()))
    return route.fulfill({ json: { data: { items: [], pagination: { page: 1, pageSize: 12, total: 0 }, mode: 'keyword', degraded: false, resultVersion: 'fixture' } } })
  })
  await page.goto('/market?query=电脑')
  await expect(page.getByRole('radio', { name: '最相关', exact: true })).toBeChecked()
  await expect.poll(() => searches.length).toBeGreaterThan(0)
  expect(searches.at(-1)!.searchParams.get('sort')).toBe('relevance')
  expect(searches.at(-1)!.searchParams.get('mode')).toBe('keyword')
  await page.getByText('价格从低到高', { exact: true }).click()
  await expect.poll(() => searches.at(-1)!.searchParams.get('sort')).toBe('price_asc')
  await page.reload()
  await expect(page.getByRole('radio', { name: '价格从低到高' })).toBeChecked()
  await page.getByRole('searchbox', { name: '搜索商品', exact: true }).fill('被子')
  await page.getByRole('searchbox', { name: '搜索商品', exact: true }).press('Enter')
  await expect(page.getByRole('heading', { name: '“被子” 的结果' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('searchbox', { name: '搜索商品', exact: true })).toHaveValue('电脑')
  await page.setViewportSize({ width: 390, height: 667 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
