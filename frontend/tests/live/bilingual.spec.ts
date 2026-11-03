import { test, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

// Isolated display fixtures. These requests never reach the daily account DB.
const now = '2030-01-01T10:00:00Z'
const peer = { id: 502, nickname: '王同学', avatar: null, rating: 4.5, transactionCount: 6 }
// A name identical to an interface label must still remain the original name.
const user = { ...peer, id: 501, nickname: '市场', role: 'USER', status: 'ACTIVE', email: 'bilingual@example.invalid', bio: '', school: '测试学校', college: '', major: '', campusVerified: false }
const picture = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23dbe7f5"/%3E%3C/svg%3E'
const product = { id: 601, seller: peer, title: 'Apple MacBook Pro 笔记本电脑', description: '使用正常，含充电器。', category: 'DIGITAL', condition: 'GOOD', campusLocation: '校内', price: 899, originalPrice: 1299, images: [picture], status: 'ON_SALE', createdAt: now, updatedAt: now }
const wanted = { id: 701, owner: peer, title: '求购笔记本电脑', description: '希望校内交易。', budgetMin: 500, budgetMax: 900, condition: 'GOOD', location: '校内', status: 'OPEN', expireAt: '2030-12-31T00:00:00Z', createdAt: now }
const session = { id: 801, type: 'PRODUCT', peer, product, unreadCount: 1, lastMessage: { id: 901, clientMsgId: 'bilingual-fixture', sessionId: 801, senderId: peer.id, kind: 'TEXT', content: '你好，可以校内交易吗？', createdAt: now } }
const order = { id: 1001, product, buyer: user, seller: peer, status: 'BOOKED', amount: 850, buyerConfirmedComplete: false, sellerConfirmedComplete: false, createdAt: now, updatedAt: now, meetup: { id: 1, version: 1, campusLocation: '校内', scheduledDate: '2030-12-01', timeSlotStart: '15:00', timeSlotEnd: '16:00', note: '请带充电器。', buyerConfirmed: false, sellerConfirmed: false } }
const pagination = { page: 1, pageSize: 12, total: 1 }
const translations: Record<string, string> = {
  [product.title]: 'Apple MacBook Pro laptop', [product.description]: 'Works normally, charger included.',
  [wanted.title]: 'Wanted: laptop', [wanted.description]: 'Prefer trading on campus.',
  [session.lastMessage.content]: 'Hello, can we meet on campus?', '测试学校': 'Test university',
  '请带充电器。': 'Please bring the charger.', '双方达成报价': 'Offer agreed by both parties',
  '请确认最新见面约定。': 'Please confirm the latest meetup.',
}

async function setup(page: Page, language: 'zh' | 'en' = 'en', guest = false) {
  const unexpected: string[] = []
  await page.addInitScript((language) => {
    if (!localStorage.getItem('campusloop-language')) localStorage.setItem('campusloop-language', language)
  }, language)
  await page.routeWebSocket('**/ws', (socket) => socket.close())
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const pathname = new URL(request.url()).pathname
    let data: unknown
    if (pathname === '/display-translation/translate' || new URL(request.url()).port === '18790') {
      const { texts, target } = request.postDataJSON() as { texts: string[]; target: string }
      return route.fulfill({ json: { translations: texts.map((text) => target === 'en' ? translations[text] ?? 'Translated fixture text' : text) } })
    }
    if (pathname === '/auth/browser-session') {
      if (guest) return route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
      data = { accessToken: 'fixture-not-a-real-token', expiresIn: 600, user }
    } else if (pathname === '/users/me') data = user
    else if (pathname === '/notifications') data = [{ id: 1, type: 'ORDER_STATUS_CHANGED', title: '订单状态已更新', content: '请确认最新见面约定。', read: false, link: '/transactions/1001', createdAt: now }]
    else if (pathname === '/reports/mine') data = [{ id: 701, targetType: 'PRODUCT', targetId: 601, reason: 'DESCRIPTION_MISMATCH', description: product.description, status: 'RESOLVED', createdAt: now, handledAt: now, resolutionNote: '商品已下架' }]
    else if (pathname === '/products/601') data = product
    else if (['/products', '/products/mine', '/favorites'].includes(pathname)) data = { items: [product], pagination }
    else if (pathname === '/wanted/701') data = wanted
    else if (pathname === '/wanted') data = { items: [wanted], pagination }
    else if (pathname === '/wanted/701/matches') data = { items: [{ product, relevanceScore: 0.9, reasons: ['TEXT_MATCH', 'BUDGET_MATCH'], constraints: ['CATEGORY_MATCH', 'CONDITION_MATCH'], resultVersion: 'fixture-v1', expiresAt: '2030-12-31T00:00:00Z' }], degraded: false }
    else if (pathname === '/price-advice') data = { lower: 20, upper: 30, currency: 'CNY', status: 'AVAILABLE', method: 'rule', factors: ['CATEGORY_MATCH', 'CONDITION_MATCH'], sampleSize: 5, disclaimer: '仅供参考，不保证成交价，请自主协商。', resultVersion: 'fixture-v1' }
    else if (pathname === '/chat/sessions') data = [session]
    else if (pathname === '/chat/sessions/801/messages') data = [session.lastMessage]
    else if (pathname === '/chat/sessions/801/offers') data = []
    else if (pathname === '/orders/1001') data = order
    else if (pathname === '/orders/1001/events') data = [{ id: 1, orderId: 1001, toStatus: 'BOOKED', description: '双方达成报价', createdAt: now }]
    else if (pathname === '/orders') data = { items: [order], pagination }
    else if (pathname.endsWith('/read')) data = {}
    else { unexpected.push(pathname); return route.fulfill({ status: 404, json: { code: 'TEST_UNHANDLED_API' } }) }
    return route.fulfill({ json: { code: 0, data } })
  })
  return unexpected
}

async function switchTo(page: Page, language: 'zh' | 'en') {
  await page.locator('.language-select').click()
  await page.getByRole('option', { name: language === 'zh' ? '简体中文' : 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', language === 'zh' ? 'zh-CN' : 'en')
}

test('language persists, all landing demo cards translate, and names stay original', async ({ page }) => {
  await setup(page, 'zh')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CampusLoop', exact: true })).toBeVisible()
  await switchTo(page, 'en')
  await expect(page.locator('.hello')).toContainText('市场')
  await expect(page.locator('.hello')).not.toContainText('Market')
  await expect(page.locator('.sheet')).toHaveCount(6)
  for (const card of await page.locator('.sheet').all()) {
    expect(await card.innerText()).not.toMatch(/[\u3400-\u9fff]/)
  }
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await switchTo(page, 'zh')
  await expect(page.locator('.sheet').first()).toContainText('二手市场')
})

test('translated product and report dialog preserve original names, form drafts and saved payloads', async ({ page }) => {
  await setup(page)
  await page.goto('/product/601')
  await expect(page.getByRole('heading', { name: translations[product.title], exact: true })).toBeVisible()
  await expect(page.getByText(translations[product.description], { exact: true })).toBeVisible()
  await expect(page.locator('.seller-card')).toContainText(peer.nickname)
  await page.getByRole('button', { name: 'Report item', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toContainText('Report reason')
  await modal.getByRole('textbox').fill('未提交的原始举报说明')
  await modal.getByRole('combobox').click()
  await expect(page.locator('.ant-select-dropdown').getByText('Fake listing', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  // Changing the shared preference in another tab must update the open dialog.
  const control = await page.context().newPage()
  await setup(control)
  await control.goto('/profile')
  await switchTo(control, 'zh')
  await expect(modal).toContainText('举报原因')
  await expect(modal.getByRole('textbox')).toHaveValue('未提交的原始举报说明')
  await modal.getByRole('button', { name: '关闭', exact: true }).click()
  await control.close()
  await switchTo(page, 'en')
  let payload: Record<string, unknown> | undefined
  await page.route('**/products/601', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback()
    payload = route.request().postDataJSON()
    return route.fulfill({ json: { data: product } })
  })
  await page.goto('/product/601/edit')
  await expect(page.getByLabel('Item name', { exact: true })).toHaveValue(product.title)
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue(product.description)
  await page.getByRole('button', { name: 'Save item', exact: true }).click()
  await expect.poll(() => payload?.title).toBe(product.title)
  expect(payload?.description).toBe(product.description)
})

test('existing validation and login errors switch language without losing credentials', async ({ page }) => {
  await setup(page, 'zh', true)
  await page.goto('/login')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByText('请输入密码。', { exact: true }).first()).toBeVisible()
  await switchTo(page, 'en')
  await expect(page.getByText('Enter your password.', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Campus email', { exact: true }).fill('bilingual@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('NeverSentToDailyDB42')
  await page.route('**/auth/login', (route) => route.fulfill({ status: 401, json: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } }))
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Incorrect email or password. Please try again.', { exact: true })).toBeVisible()
  await switchTo(page, 'zh')
  await expect(page.getByText('邮箱或密码错误，请检查后重试。', { exact: true })).toBeVisible()
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('NeverSentToDailyDB42')
})

test('student routes fit desktop and mobile and have no untranslated interface text in English', async ({ page }) => {
  test.setTimeout(240000)
  const unexpected = await setup(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const routes = ['/', '/market', '/product/601', '/my-products', '/favorites', '/publish', '/product/601/edit', '/wanted', '/wanted/701', '/wanted/publish', '/wanted/701/edit', '/wanted/701/matches', '/publish/price-advice', '/chat', '/chat/801', '/transactions', '/transactions/1001', '/transactions/1001/meetup', '/transactions/1001/review', '/notifications', '/report', '/profile', '/login', '/register', '/missing-test-page']
  const findings: unknown[] = []
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 })
    for (const url of routes) {
      await page.goto(url)
      if (url === '/missing-test-page') await expect(page.getByText('Page not found', { exact: true })).toBeVisible()
      else if (url === '/chat/801') await expect(page.getByRole('region', { name: 'Current conversation', exact: true })).toBeVisible()
      else await expect(page.getByRole('heading').first(), `${width} ${url}`).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.locator('[data-task-phase="running"]')).toHaveCount(0)
      await expect(page.locator('[aria-busy="true"][data-original-text]')).toHaveCount(0)
      // Input values, protected user names and brands are deliberately original.
      const leaks = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        const found: string[] = []
        while (walker.nextNode()) {
          const node = walker.currentNode
          const parent = node.parentElement
          if (!parent || parent.closest('[data-original-text],input,textarea,script,style,.ant-select-dropdown')) continue
          if (!parent.getClientRects().length || getComputedStyle(parent).visibility === 'hidden') continue
          const text = node.textContent?.trim() || ''
          if (/[\u3400-\u9fff]/.test(text)) found.push(text)
        }
        return [...new Set(found)]
      })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      if (leaks.length || overflow) findings.push({ width, url, leaks, overflow })
    }
  }
  await mkdir('../.codex-tmp/i18n-preview', { recursive: true })
  await writeFile('../.codex-tmp/i18n-preview/route-audit.json', JSON.stringify({ findings, errors, unexpected }, null, 2))
  expect(findings).toEqual([])
  expect(errors).toEqual([])
  expect(unexpected).toEqual([])
})

test('translation failure retains original item and switching to Chinese recovers', async ({ page }) => {
  await setup(page)
  await page.route('**/display-translation/translate', (route) => route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } }))
  await page.goto('/product/601')
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  await expect(page.getByTitle('Translation unavailable; original text shown.').first()).toBeVisible()
  await switchTo(page, 'zh')
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '联系卖家', exact: true })).toBeEnabled()
})

test('late English translations cannot overwrite the Chinese view', async ({ page }) => {
  await setup(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/display-translation/translate', async (route) => {
    const { target, texts } = route.request().postDataJSON() as { target: string; texts: string[] }
    if (target === 'en') await gate
    return route.fulfill({ json: { translations: texts.map((text) => target === 'en' ? translations[text] ?? 'Translated fixture text' : text) } })
  })
  await page.goto('/product/601')
  await expect(page.locator('h1 [aria-busy="true"]')).toBeVisible()
  await expect(page.locator('h1')).not.toContainText('Translating')
  await switchTo(page, 'zh')
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  const received = page.waitForResponse((response) => response.url().includes('/display-translation/translate') && response.request().postDataJSON().target === 'en')
  release()
  await received
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  await expect(page.getByText(translations[product.description], { exact: true })).toHaveCount(0)
})

test('order confirmation popovers and calculated pricing panels follow the selected language', async ({ page }) => {
  await setup(page)
  await page.goto('/transactions/1001')
  await page.getByRole('textbox', { name: 'Cancellation reason', exact: true }).fill('原始取消说明')
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  await expect(page.getByText('Cancel this order? Available items return to sale. Deleted or hidden listings stay hidden.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await switchTo(page, 'zh')
  await page.getByRole('button', { name: '取消订单', exact: true }).click()
  await expect(page.getByText('取消这笔订单？正常商品将恢复在售，已删除或下架的商品保持下架。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^取\s*消$/ }).click()
  await expect(page.getByRole('textbox', { name: '取消原因', exact: true })).toHaveValue('原始取消说明')
  await switchTo(page, 'en')
  await page.goto('/publish/price-advice')
  await page.getByRole('button', { name: 'Calculate range', exact: true }).click()
  await expect(page.locator('.price-advice-result')).toContainText('Rules reference range: ¥20–¥30')
  await expect(page.locator('.price-advice-result')).toContainText('Matching category · Meets condition requirements')
  await switchTo(page, 'zh')
  await expect(page.locator('.price-advice-result')).toContainText('规则参考区间：¥20–¥30')
})

test('administrator language switches and student permissions are preserved', async ({ page }) => {
  await setup(page)
  await page.route('**/auth/browser-session', (route) => route.fulfill({ json: { data: { accessToken: 'admin-language-fixture', expiresIn: 600, user: { ...user, role: 'ADMIN' } } } }))
  await page.route('**/admin/users?**', (route) => route.fulfill({ json: { data: { items: [user], pagination } } }))
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('.adm-top .language-select')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('campusloop-language'))).toBe('en')
  await switchTo(page, 'zh')
  await expect(page.getByRole('heading', { name: '用户管理', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: '用户管理', exact: true })).toBeVisible()
  await switchTo(page, 'en')
  await page.goto('/profile')
  await expect(page.getByText('Your account cannot access this page', { exact: true })).toBeVisible()
})

for (const width of [1440, 390]) {
  test(`admin pages and review dialogs follow language without changing drafts at ${width}px`, async ({ page }) => {
    test.setTimeout(120000)
    await setup(page)
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const admin = { ...user, role: 'ADMIN' }
    const decision = { ...adminDashboardFixture.recentDecisions[0], actor: admin, reason: product.description }
    await page.route('**/auth/browser-session', route => route.fulfill({ json: { data: { accessToken: 'admin-language-fixture', expiresIn: 600, user: admin } } }))
    await page.route('**/admin/dashboard?**', route => route.fulfill({ json: { data: { ...adminDashboardFixture, recentDecisions: [decision] } } }))
    await page.route('**/admin/users?**', route => route.fulfill({ json: { data: { items: [user], pagination } } }))
    await page.route('**/admin/users/501/risk-clues*', route => route.fulfill({ json: { data: { status: 'INSUFFICIENT_DATA', algorithmVersion: 'm8-risk-clue-rule-v1', sourceWindowAsOf: now, missingInputs: ['failedPaymentCount24h', 'sameDeviceAccountCount7d'], recommendedAction: 'NONE', clues: [], degraded: false } } }))
    await page.route('**/admin/reports?**', route => route.fulfill({ json: { data: [{ id: 701, targetType: 'PRODUCT', targetId: product.id, reason: 'FAKE_PRODUCT', description: product.description, status: 'PENDING', createdAt: now, evidence: [] }] } }))
    await page.route('**/admin/products?**', route => route.fulfill({ json: { data: { items: [{ product, moderationBlocked: false }], pagination } } }))
    await page.route('**/admin/products/601*', route => route.fulfill({ json: { data: { product, moderationBlocked: false } } }))
    await page.route('**/admin/orders?**', route => route.fulfill({ json: { data: { items: [order], pagination } } }))
    await page.route('**/admin/audit-logs?**', route => route.fulfill({ json: { data: { items: [decision], pagination } } }))
    const leaks: unknown[] = []
    const inspect = async (url: string) => {
      const nodes = await page.locator('body').evaluate((body) => {
        const result: string[] = [], walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
        let node: Node | null
        while ((node = walker.nextNode())) {
          const el = node.parentElement
          if (!el || !el.getClientRects().length || el.closest('[data-original-text], [translate="no"], input, textarea, script, style, .ant-select-selection-item')) continue
          if (/[\u3400-\u9fff]/u.test(node.textContent ?? '')) result.push(node.textContent!.trim())
        }
        return [...new Set(result)]
      })
      if (nodes.length) leaks.push({ url, nodes })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), url).toBe(true)
    }
    for (const [url, title] of [['/admin', 'Good'], ['/admin/users', 'Users'], ['/admin/reports', 'Reports'], ['/admin/products', 'Listings'], ['/admin/orders', 'Orders'], ['/admin/audit', 'Audit log'], ['/admin/profile', 'My decisions']]) {
      await page.goto(url)
      await expect(page.getByRole('heading', { name: new RegExp(title) }).first()).toBeVisible()
      await expect(page.locator('.adm-top .language-select')).toBeVisible()
      await inspect(url)
      if (['/admin/users', '/admin/reports', '/admin/products', '/admin/orders'].includes(url)) {
        await page.locator('.ant-table-tbody button').first().click()
        const modal = page.getByRole('dialog')
        await expect(modal).toBeVisible()
        if (url === '/admin/users') {
          await modal.getByRole('button', { name: 'Load risk indicators (access logged)', exact: true }).click()
          await expect(modal).toContainText('Not enough data for a full assessment')
          await expect(modal).toContainText('No recommendation')
        }
        await inspect(url + '#dialog')
        if (url === '/admin/reports') {
          await modal.getByRole('textbox').fill('原始说明不会被修改')
          // A preference changed in another tab updates the open form in place.
          await page.evaluate(() => { localStorage.setItem('campusloop-language', 'zh'); window.dispatchEvent(new StorageEvent('storage', { key: 'campusloop-language', newValue: 'zh' })) })
          await expect(modal).toContainText('处理说明')
          await expect(modal.getByRole('textbox')).toHaveValue('原始说明不会被修改')
          await page.evaluate(() => { localStorage.setItem('campusloop-language', 'en'); window.dispatchEvent(new StorageEvent('storage', { key: 'campusloop-language', newValue: 'en' })) })
          await expect(modal).toContainText('Decision reason')
          await expect(modal.getByRole('textbox')).toHaveValue('原始说明不会被修改')
        }
        await modal.getByRole('button', { name: 'Close', exact: true }).click()
      }
      if (url === '/admin') {
        await page.screenshot({ path: `../.codex-tmp/i18n-preview/admin-en-${width}.png`, fullPage: true })
        await page.getByRole('button', { name: 'Resolved', exact: true }).first().click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await inspect(url + '#quick-review')
      }
    }
    expect(leaks).toEqual([])
  })
}

test('English demo cards have sufficient internal space at desktop and mobile sizes', async ({ page }) => {
  await setup(page, 'en', true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const out = path.resolve('../.codex-tmp/i18n-preview')
  await mkdir(out, { recursive: true })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect(page.locator('.sheet')).toHaveCount(6)
    const overflow = await page.locator('.sheet').evaluateAll((cards) => cards.flatMap((card) => {
      const body = card.querySelector('.sheet-body') as HTMLElement
      return body.scrollHeight > body.clientHeight + 2 || body.scrollWidth > body.clientWidth + 2 ? [(card as HTMLElement).dataset.k] : []
    }))
    expect(overflow).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    expect((await page.locator('.lp-header .brand').boundingBox())!.height).toBeLessThan(45)
    await page.screenshot({ path: path.join(out, `landing-en-${width}.png`) })
  }
})
