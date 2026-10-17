import { test, expect, type Page } from '@playwright/test'

const user = { id: 501, nickname: 'M3 acceptance', role: 'USER', status: 'ACTIVE', email: 'm3@example.invalid', rating: 0, transactionCount: 0 }
const product = { id: 601, title: '验收教材', images: [], price: 30, originalPrice: 60, category: 'BOOKS', condition: 'GOOD', campusLocation: 'Library', status: 'ON_SALE', seller: { id: 502, nickname: '卖家' } }
const pagination = { page: 1, pageSize: 12, total: 1 }

async function setup(page: Page) {
  await page.route('**/auth/browser-session', (route) => route.fulfill({ json: { data: { accessToken: 'fixture-not-real', expiresIn: 600, user } } }))
  await page.route('**/notifications', (route) => route.fulfill({ json: { data: [] } }))
}

test.beforeEach(async ({ page }) => { await setup(page) })

test('503 search fallback preserves filters and exposes actual mode, reason and version', async ({ page }) => {
  const requests: URL[] = []
  await page.route('**/search?**', (route) => {
    const url = new URL(route.request().url()); requests.push(url)
    if (url.searchParams.get('mode') !== 'keyword') return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
    return route.fulfill({ json: { data: { items: [product], pagination, mode: 'keyword', degraded: false, resultVersion: 'search-fixture-v4' } } })
  })
  await page.goto('/market?query=教材&category=BOOKS&condition=GOOD&sort=price_asc&searchMode=semantic')
  await expect(page.getByText('搜索正在使用关键词降级结果', { exact: true })).toBeVisible()
  await expect(page.getByText(/结果版本：search-fixture-v4/)).toBeVisible()
  await expect(page.getByText('当前使用：关键词检索', { exact: true })).toBeVisible()
  await expect(page.getByText(/检索说明：/)).toBeVisible()
  expect(requests.map((url) => url.searchParams.get('mode'))).toEqual(['semantic', 'keyword'])
  for (const url of requests) {
    expect(url.searchParams.get('category')).toBe('BOOKS')
    expect(url.searchParams.get('condition')).toBe('GOOD')
    expect(url.searchParams.get('sort')).toBe('price_asc')
  }
})

test('failed intelligent search offers keyword recovery; permission errors do not', async ({ page }) => {
  const modes: string[] = []
  await page.route('**/search?**', (route) => {
    const mode = new URL(route.request().url()).searchParams.get('mode')!; modes.push(mode)
    if (mode !== 'keyword') return route.fulfill({ status: 500, json: { code: 'SEARCH_FAILED' } })
    return route.fulfill({ json: { data: { items: [], pagination: { ...pagination, total: 0 }, mode, degraded: false, resultVersion: 'keyword-v4' } } })
  })
  await page.goto('/market?query=教材&searchMode=hybrid&category=BOOKS')
  await page.getByRole('button', { name: '改用关键词搜索', exact: true }).click()
  await expect(page).toHaveURL(/searchMode=keyword/)
  await expect(page.getByText('没有符合筛选条件的结果，请调整条件。', { exact: true })).toBeVisible()
  expect(modes).toEqual(['hybrid', 'keyword'])
  await page.route('**/search?**', (route) => route.fulfill({ status: 403, json: { code: 'FORBIDDEN' } }))
  await page.goto('/market?query=教材&searchMode=hybrid')
  await expect(page.getByText('无权访问', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '改用关键词搜索', exact: true })).not.toBeVisible()
})

test('search timeout has a keyword escape and keyword failure stops after one fallback', async ({ page }) => {
  const modes: string[] = []
  await page.route('**/search?**', async (route) => {
    const mode = new URL(route.request().url()).searchParams.get('mode')!; modes.push(mode)
    if (mode === 'semantic') { await new Promise((resolve) => setTimeout(resolve, 11000)); await route.abort().catch(() => {}); return }
    return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
  })
  await page.goto('/market?query=教材&searchMode=semantic')
  await expect(page.getByRole('button', { name: '改用关键词搜索', exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: '改用关键词搜索', exact: true }).click()
  await expect(page.getByText('SERVICE_UNAVAILABLE', { exact: true })).toBeVisible()
  expect(modes).toEqual(['semantic', 'keyword'])
  modes.length = 0
  await page.goto('/market?query=教材&searchMode=hybrid')
  await expect(page.getByText('SERVICE_UNAVAILABLE', { exact: true })).toBeVisible()
  expect(modes).toEqual(['hybrid', 'keyword'])
})

test('matching renders constraints/version and updates expiry while page remains open', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') })
  await page.route('http://localhost:8001/wanted/701/matches', (route) => route.fulfill({ json: { data: { items: [{ product, relevanceScore: 0.8, reasons: ['标题相关'], constraints: ['BUDGET_OK'], resultVersion: 'match-fixture-v4', expiresAt: '2030-01-01T00:01:00Z' }], degraded: false } } }))
  await page.goto('/wanted/701/matches')
  await expect(page.getByText(/硬约束：BUDGET_OK/)).toBeVisible()
  await expect(page.getByText(/结果版本：match-fixture-v4/)).toBeVisible()
  await expect(page.getByText(/不是成交概率/)).toBeVisible()
  await expect(page.getByRole('link', { name: '查看匹配通知', exact: true })).toHaveAttribute('href', '/notifications')
  await expect(page.getByText('已过期', { exact: true })).not.toBeVisible()
  await page.clock.fastForward(61000)
  await expect(page.getByText('已过期', { exact: true })).toBeVisible()
})

test('invalid matching expiry is explicitly unknown and refresh can recover', async ({ page }) => {
  let reads = 0
  await page.route('http://localhost:8001/wanted/701/matches', (route) => {
    reads += 1
    return route.fulfill({ json: { data: { items: [{ product, relevanceScore: 0.5, reasons: [], constraints: [], resultVersion: 'match-v4', expiresAt: reads === 1 ? 'bad-time' : '2020-01-01T00:00:00Z' }], degraded: true, degradationReason: 'SERVICE_DISABLED' } } })
  })
  await page.goto('/wanted/701/matches')
  await expect(page.getByText('有效期未知，请刷新确认', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '刷新匹配', exact: true }).click()
  await expect(page.getByText('已过期', { exact: true })).toBeVisible()
})

test('matching owner permission rejection does not expose results', async ({ page }) => {
  await page.route('http://localhost:8001/wanted/701/matches', (route) => route.fulfill({ status: 403, json: { code: 'FORBIDDEN' } }))
  await page.goto('/wanted/701/matches')
  await expect(page.getByText('无权访问', { exact: true })).toBeVisible()
  await expect(page.getByText(/结果版本：/)).not.toBeVisible()
})

test('price advice distinguishes model and low confidence, and clears stale success on failure', async ({ page }) => {
  let attempt = 0
  await page.route('http://localhost:8001/price-advice', (route) => {
    attempt += 1
    if (attempt === 3) return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
    return route.fulfill({ json: { data: { lower: 20, upper: 40, currency: 'CNY', status: attempt === 1 ? 'AVAILABLE' : 'LOW_CONFIDENCE', factors: ['成色因素'], method: 'model', sampleSize: 3, degraded: false, disclaimer: '仅供参考，不保证成交价。', resultVersion: 'price-model-v4' } } })
  })
  await page.goto('/publish/price-advice')
  const submit = page.locator('form button[type="submit"]')
  await submit.click()
  await expect(page.getByText('模型参考区间：¥20–¥40', { exact: true })).toBeVisible()
  await submit.click()
  await expect(page.getByText(/置信度较低/)).toBeVisible()
  await expect(page.getByText('基于 3 个样本', { exact: true })).toBeVisible()
  await submit.click()
  await expect(page.getByText('SERVICE_UNAVAILABLE', { exact: true })).toBeVisible()
  await expect(page.getByText(/¥20–¥40/)).not.toBeVisible()
  await expect(page.getByText(/手动定价/)).toBeVisible()
})

test('sample shortage, unavailable and degraded price results remain explicit', async ({ page }) => {
  const states = [
    { status: 'INSUFFICIENT_DATA', lower: 10, upper: 25, method: 'rule', sampleSize: 0 },
    { status: 'UNAVAILABLE', lower: null, upper: null, method: 'unavailable', sampleSize: 0 },
    { status: 'AVAILABLE', lower: 10, upper: 25, method: 'rule', sampleSize: 2 },
    { status: 'INSUFFICIENT_DATA', lower: 20, upper: 40, method: 'model', sampleSize: 0 },
  ]
  await page.route('http://localhost:8001/price-advice', (route) => route.fulfill({ json: { data: { ...states.shift(), currency: 'CNY', factors: ['成色因素'], degraded: true, degradationReason: 'SERVICE_DISABLED', disclaimer: '仅供参考，不保证成交价。', resultVersion: 'rule-v4' } } }))
  await page.goto('/publish/price-advice')
  const submit = page.locator('form button[type="submit"]')
  await submit.click()
  await expect(page.getByText('样本不足，以下为规则区间参考', { exact: true })).toBeVisible()
  await expect(page.getByText('基于 0 个样本', { exact: true })).toBeVisible()
  await submit.click()
  await expect(page.getByText('暂不可用，请手动定价', { exact: true })).toBeVisible()
  await expect(page.getByText(/¥10–¥25/)).not.toBeVisible()
  await submit.click()
  await expect(page.getByText(/已降级/)).toBeVisible()
  await expect(page.getByText('仅供参考，不保证成交价。', { exact: true })).toBeVisible()
  await submit.click()
  await expect(page.getByText('样本不足，请手动定价', { exact: true })).toBeVisible()
  await expect(page.getByText(/¥20–¥40/)).not.toBeVisible()
})

test('editing price inputs invalidates the old range and empty disclaimers have a safe fallback', async ({ page }) => {
  await page.route('http://localhost:8001/price-advice', (route) => route.fulfill({ json: { data: { lower: 10, upper: 25, status: 'AVAILABLE', currency: 'CNY', factors: [], method: 'rule', sampleSize: 0, degraded: false, disclaimer: '', resultVersion: 'rule-v4' } } }))
  await page.goto('/publish/price-advice')
  const price = page.getByRole('spinbutton', { name: '原价（元）', exact: true })
  await price.fill('50')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByText('规则参考区间：¥10–¥25', { exact: true })).toBeVisible()
  await expect(page.getByText('仅供参考，不保证成交价，请自主协商。', { exact: true })).toBeVisible()
  await expect(price).toBeEnabled()
  await price.fill('100')
  await expect(page.getByText(/¥10–¥25/)).not.toBeVisible()
})

test('guest can search but price advice and matching remain protected', async ({ page }) => {
  await page.route('**/auth/browser-session', (route) => route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } }))
  await page.route('**/search?**', (route) => route.fulfill({ json: { data: { items: [product], pagination, mode: 'keyword', degraded: false, resultVersion: 'keyword-v4' } } }))
  await page.goto('/market?query=教材')
  await expect(page.getByRole('link', { name: '验收教材', exact: true })).toBeVisible()
  await page.goto('/publish/price-advice')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/wanted/701/matches')
  await expect(page).toHaveURL(/\/login$/)
})
