import { test, expect, type Page } from './fixtures'

// 参照通知页的交互与光标处理，复核市场、求购、交易中心与我的举报。
// 需要真实后端：只读浏览与导航，不产生业务写请求。
async function login(page: Page, email = 'chen.demo@example.com') {
  await page.goto('/login')
  await page.getByLabel('校园邮箱', { exact: true }).fill(email)
  await page.getByLabel('密码', { exact: true }).fill('Demo@12345')
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/market$/)
}

test('catalog card opens from any area and never takes a text caret', async ({ page }) => {
  await login(page)
  const card = page.locator('.catalog-card').first()
  await expect(card).toBeVisible()

  const caret = await card.evaluate((element) => getComputedStyle(element).caretColor)
  expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(caret)

  const resting = await card.evaluate((element) => getComputedStyle(element).transform)
  await card.hover()
  await expect.poll(async () => card.evaluate((element) => getComputedStyle(element).transform)).not.toBe(resting)

  await card.locator('.catalog-title').focus()
  expect(await card.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('2px')

  // 点击价格区域（非链接元素）应命中整卡热区并进入详情。
  // 热区由标题链接的覆盖层实现，元素级 actionability 检查会被该层拦截，故按坐标点击。
  const price = card.locator('.catalog-price')
  await expect(price).toBeVisible()
  await price.click({ force: true })
  await expect(page).toHaveURL(/\/product\/\d+$/)
  const focused = await page.evaluate(() => document.activeElement?.tagName ?? '')
  expect(['INPUT', 'TEXTAREA']).not.toContain(focused)
})

test('wanted card opens from any area and keeps keyboard reachable', async ({ page }) => {
  await login(page)
  await page.goto('/wanted')
  const card = page.locator('.wanted-card').first()
  await expect(card).toBeVisible()

  const caret = await card.evaluate((element) => getComputedStyle(element).caretColor)
  expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(caret)

  const resting = await card.evaluate((element) => getComputedStyle(element).transform)
  await card.hover()
  await expect.poll(async () => card.evaluate((element) => getComputedStyle(element).transform)).not.toBe(resting)

  await card.locator('.wanted-budget').click({ force: true })
  await expect(page).toHaveURL(/\/wanted\/\d+$/)
  expect(await page.evaluate(() => document.activeElement?.tagName ?? '')).not.toBe('INPUT')
})

test('order card opens from any area and role tabs answer arrow keys', async ({ page }) => {
  await login(page)
  await page.goto('/transactions')

  const all = page.getByRole('tab', { name: '全部交易', exact: true })
  const buyer = page.getByRole('tab', { name: '我买到的', exact: true })
  await expect(all).toHaveAttribute('aria-selected', 'true')
  await all.focus()
  await page.keyboard.press('ArrowRight')
  await expect(buyer).toHaveAttribute('aria-selected', 'true')
  await expect(buyer).toBeFocused()
  await expect(page).toHaveURL(/role=buyer/)
  expect(await buyer.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('2px')
  expect(await buyer.evaluate((element) => getComputedStyle(element).fontWeight)).toBe('700')

  await page.keyboard.press('ArrowLeft')
  await expect(all).toHaveAttribute('aria-selected', 'true')

  const card = page.locator('.order-card').first()
  if (await card.count()) {
    await card.locator('.order-card-header').click()
    await expect(page).toHaveURL(/\/transactions\/\d+$/)
  }
})

test('my reports keeps records apart from paging and drops the notification shortcut', async ({ page }) => {
  // 种子账号 1002 带一条举报记录，才能验证记录与翻页栏的分区。
  await login(page, 'lin.demo@example.com')
  await page.goto('/report')

  await expect(page.getByRole('heading', { name: '我的举报记录', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '查看通知', exact: true })).toHaveCount(0)
  await expect(page.locator('.report-pager')).toBeVisible()
  await expect(page.locator('.report-pager').getByRole('button', { name: '上一页' })).toBeVisible()
  await expect(page.locator('.report-pager').getByRole('button', { name: '下一页' })).toBeVisible()

  const listBottom = await page.locator('.ant-list').first().boundingBox()
  const pagerTop = await page.locator('.report-pager').boundingBox()
  expect(listBottom && pagerTop && pagerTop.y >= listBottom.y + listBottom.height - 1).toBe(true)
})

test('notification tabs keep the same keyboard behaviour after sharing one component', async ({ page }) => {
  await login(page)
  await page.goto('/notifications')

  const all = page.getByRole('tab', { name: '全部', exact: true })
  const message = page.getByRole('tab', { name: '消息', exact: true })
  await expect(all).toHaveAttribute('aria-selected', 'true')
  await all.focus()
  await page.keyboard.press('ArrowRight')
  await expect(message).toHaveAttribute('aria-selected', 'true')
  await expect(message).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(all).toHaveAttribute('aria-selected', 'true')
})
