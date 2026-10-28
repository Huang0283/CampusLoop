import { test, expect } from './fixtures'

// API fixtures exercise the live router without writing to the daily database.
const title = 'X'.repeat(100)
const place = 'L'.repeat(128)
const peer = { id: 502, nickname: 'N'.repeat(50) }
const product = { id: 601, title, images: [], price: 30, category: 'BOOKS', condition: 'GOOD', campusLocation: place, status: 'ON_SALE', seller: peer }
const wanted = { id: 701, title, owner: peer, description: 'D'.repeat(3000), budgetMin: 10, budgetMax: 50, condition: 'GOOD', location: place, status: 'OPEN', expireAt: '2030-12-31T00:00:00Z', createdAt: '2030-01-01T00:00:00Z' }
const pagination = { page: 1, pageSize: 12, total: 30 }

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/browser-session', route => route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } }))
  await page.route('**/products?**', route => route.fulfill({ json: { data: { items: [product], pagination } } }))
  await page.route('**/wanted?**', route => route.fulfill({ json: { data: { items: [wanted], pagination } } }))
})

for (const width of [375, 1440]) {
  test(`long market and wanted content wraps without clipping at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const [url, selector] of [['/market', '.catalog-card'], ['/wanted', '.wanted-card']]) {
      await page.goto(url)
      const card = page.locator(selector).first()
      await expect(card.getByRole('link', { name: title, exact: true })).toBeVisible()
      const overflow = await card.evaluate(element => [...element.querySelectorAll('h2, a, p, .catalog-seller')]
        .filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1)
        .map(node => ({ tag: node.tagName, text: node.textContent?.slice(0, 20), width: node.clientWidth, scroll: node.scrollWidth })))
      expect(overflow).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
  })
}

test('search length and failed network retry preserve the draft', async ({ page }) => {
  await page.goto('/wanted')
  await expect(page.getByRole('searchbox', { name: '搜索求购' })).toHaveAttribute('maxlength', '200')
  await page.goto('/market')
  const input = page.getByRole('searchbox', { name: '搜索商品', exact: true })
  await expect(input).toHaveAttribute('maxlength', '200')
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  await input.fill('not submitted draft')
  await page.route('**/products?**', route => route.abort('internetdisconnected'))
  await page.getByRole('button', { name: /^刷\s*新$/ }).click()
  await expect(page.getByText('NETWORK_ERROR', { exact: true })).toBeVisible()
  await expect(input).toHaveValue('not submitted draft')
  await page.route('**/products?**', route => route.fulfill({ json: { data: { items: [product], pagination } } }))
  await page.getByRole('button', { name: /^重\s*试$/ }).click()
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  await expect(page.getByText('NETWORK_ERROR', { exact: true })).toHaveCount(0)
  await expect(input).toHaveValue('not submitted draft')
})

test('pagination and reload retain all search filters', async ({ page }) => {
  const queries: URLSearchParams[] = []
  await page.route('**/search?**', route => {
    queries.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: { data: { items: [product], pagination, mode: 'keyword', degraded: false, resultVersion: 'fixture-only' } } })
  })
  await page.goto('/market?query=book&category=BOOKS&condition=GOOD&sort=price_asc&searchMode=keyword')
  await page.locator('.ant-pagination-item-2').click()
  await expect(page).toHaveURL(/page=2/)
  await page.reload()
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  for (const [key, value] of Object.entries({ query: 'book', category: 'BOOKS', condition: 'GOOD', sort: 'price_asc', page: '2', mode: 'keyword' })) {
    expect(queries.at(-1)?.get(key)).toBe(value)
  }
})

test('failed image upload can recover and a slow failed save keeps the complete draft', async ({ page }) => {
  const user = { ...peer, id: 501, nickname: 'Fixture user', role: 'USER', status: 'ACTIVE', email: 'fixture@example.invalid' }
  await page.route('**/auth/browser-session', route => route.fulfill({ json: { data: { accessToken: 'fixture-only', expiresIn: 600, user } } }))
  await page.route('**/notifications', route => route.fulfill({ json: { data: [] } }))
  let failUpload = true
  await page.route('**/uploads/images?**', route => route.fulfill(failUpload
    ? { status: 503, json: { code: 'SERVICE_UNAVAILABLE' } }
    : { json: { data: { url: 'https://fixture.invalid/image.png', key: 'fixture-image' } } }))
  const picture = { name: 'audit.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfS8AAAAASUVORK5CYII=', 'base64') }
  await page.goto('/publish')
  await page.getByLabel('商品名称', { exact: true }).fill('Retained draft')
  await page.getByLabel('出售价格（元）', { exact: true }).fill('30')
  await page.getByLabel('校内交易地点', { exact: true }).fill('Library')
  await page.locator('input[type="file"]').setInputFiles(picture)
  const remove = page.getByRole('button', { name: '移除失败图片并重新上传', exact: true })
  await expect(remove).toBeVisible()
  await expect(page.getByRole('button', { name: '保存商品', exact: true })).toBeDisabled()
  await remove.click()
  failUpload = false
  await page.locator('input[type="file"]').setInputFiles(picture)
  await expect(page.locator('.ant-upload-list-item-done')).toHaveCount(1)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let payload: Record<string, unknown> | undefined
  await page.route('**/products', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    payload = route.request().postDataJSON()
    await gate
    await route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
  })
  const sent = page.waitForRequest(request => new URL(request.url()).pathname === '/products' && request.method() === 'POST')
  await page.getByRole('button', { name: '保存商品', exact: true }).click()
  await sent
  try {
    await expect(page.getByLabel('商品名称', { exact: true })).toHaveValue('Retained draft')
    await expect(page.locator('form button[type="submit"]')).toHaveClass(/ant-btn-loading/)
  } finally { release() }
  await expect(page.getByText('SERVICE_UNAVAILABLE', { exact: true })).toBeVisible()
  await expect(page.getByLabel('商品名称', { exact: true })).toHaveValue('Retained draft')
  await expect(page.getByLabel('出售价格（元）', { exact: true })).toHaveValue('30.00')
  await expect(page.getByLabel('校内交易地点', { exact: true })).toHaveValue('Library')
  expect(payload).toMatchObject({ title: 'Retained draft', price: 30, campusLocation: 'Library', images: ['https://fixture.invalid/image.png'] })
})
