import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'

test('audit register, reload, login and new product description search persist', async ({ page }) => {
  test.skip(process.env.CAMPUSLOOP_AUTH_SEARCH_AUDIT !== '1', 'Requires a dedicated audit API/database and Redis14/15.')
  const email = `search-${randomUUID()}@example.invalid`
  const title = `搜索验收${randomUUID().slice(0, 8)}`
  await page.goto('/register')
  await page.getByLabel('校园邮箱', { exact: true }).fill(email)
  await page.getByLabel('昵称', { exact: true }).fill('搜索验收同学')
  await page.getByLabel('密码', { exact: true }).fill('Valid@12345')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await expect(page).toHaveURL(/\/market$/)
  await page.reload()
  await page.goto('/publish')
  await page.getByLabel('商品名称', { exact: true }).fill(title)
  await page.locator('input[type=file]').setInputFiles({
    name: 'audit.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYPjPwMDAxMDAwMDAAAALHwEDmIWXfgAAAABJRU5ErkJggg==', 'base64'),
  })
  await page.getByLabel('出售价格（元）', { exact: true }).fill('50')
  await page.getByLabel('校内交易地点', { exact: true }).fill('校内')
  await page.getByLabel('描述', { exact: true }).fill('验收电脑，正常使用')
  await expect(page.getByRole('button', { name: '保存商品' })).toBeEnabled()
  await page.getByRole('button', { name: '保存商品' }).click()
  await expect(page).toHaveURL(/\/product\/\d+$/)
  await page.goto(`/market?query=${encodeURIComponent(title + ' 电脑')}`)
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  await expect.poll(() => page.locator('.product-card img').first().evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  // A new browser context clears the HttpOnly cookie without editing the account.
  const guest = await page.context().browser()!.newContext()
  const login = await guest.newPage()
  await login.goto(new URL('/login', page.url()).href)
  await login.getByLabel('校园邮箱', { exact: true }).fill(email)
  await login.getByLabel('密码', { exact: true }).fill('WrongPassword')
  await login.getByRole('button', { name: '登录', exact: true }).click()
  await expect(login.getByRole('alert')).toContainText('邮箱或密码错误，请检查后重试。')
  await mkdir('../.codex-tmp/auth-search-evidence', { recursive: true })
  // Redact the random audit email; no daily account data is captured.
  await login.screenshot({ path: '../.codex-tmp/auth-search-evidence/login.png', mask: [login.getByLabel('校园邮箱', { exact: true })] })
  await login.getByLabel('密码', { exact: true }).fill('Valid@12345')
  await login.getByRole('button', { name: '登录', exact: true }).click()
  await expect(login).toHaveURL(/\/market$/)
  await login.reload()
  await login.goto(new URL('/profile', page.url()).href)
  await expect(login.getByRole('heading', { name: '搜索验收同学', exact: true })).toBeVisible()
  await guest.close()
  await page.setViewportSize({ width: 390, height: 667 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '../.codex-tmp/auth-search-evidence/search-mobile.png', fullPage: true })
})
