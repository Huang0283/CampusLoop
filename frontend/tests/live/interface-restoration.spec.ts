import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

// Network fixtures exercise the production router/components without writing to
// the developer's database. The separate live journey covers persistence.
const now = '2030-01-01T10:00:00Z'
const peer = { id: 502, nickname: '王同学', avatar: null, rating: 4.5, transactionCount: 6 }
const user = { ...peer, id: 501, nickname: '验收同学', role: 'USER', status: 'ACTIVE', email: 'restore@example.invalid', campusVerified: false, bio: '物尽其用', school: '测试学校', college: '计算机学院', major: '软件工程', tradeCount: 6, creditLevel: null }
const pictures = ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23dbe7f5"/%3E%3C/svg%3E', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23d7ecdd"/%3E%3C/svg%3E']
const product = { id: 601, seller: peer, title: '戴尔 27 英寸显示器', category: 'DIGITAL', condition: 'GOOD', description: '显示正常，附电源线。\n可校内当面验货。', price: 899, originalPrice: 1299, campusLocation: '图书馆门口', images: pictures, status: 'ON_SALE', createdAt: now, updatedAt: now }
const wanted = { id: 701, owner: peer, title: '求购显示器', description: '希望无坏点，校内交易。', budgetMin: 500, budgetMax: 900, condition: 'GOOD', location: '图书馆', status: 'OPEN', expireAt: '2030-12-31T00:00:00Z', createdAt: now }
const session = { id: 801, type: 'PRODUCT', peer, product, unreadCount: 2, lastMessage: { id: 901, clientMsgId: 'fixture-message', sessionId: 801, senderId: peer.id, kind: 'TEXT', content: '你好，这件商品还在吗？', createdAt: now } }
const order = { id: 1001, product, buyer: user, seller: peer, status: 'BOOKED', amount: 850, buyerConfirmedComplete: false, sellerConfirmedComplete: false, createdAt: now, updatedAt: now }
const pagination = { page: 1, pageSize: 12, total: 1 }

async function setup(page: Page, guest = false) {
  await page.routeWebSocket('**/ws', (socket) => socket.close())
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const path = new URL(request.url()).pathname
    const method = request.method()
    let data: unknown
    if (path === '/auth/browser-session') {
      if (guest) return route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
      data = { accessToken: 'fixture-not-real', expiresIn: 600, user }
    } else if (path === '/notifications') data = []
    else if (path === '/reports/mine') data = []
    else if (path === '/users/me') data = user
    else if (path === '/products/601') data = product
    else if (path === '/products' || path === '/products/mine' || path === '/favorites') data = { items: [product], pagination }
    else if (path === '/wanted/701') data = wanted
    else if (path === '/wanted') data = { items: [wanted], pagination }
    else if (path === '/wanted/701/matches') data = { items: [], degraded: false }
    else if (path === '/chat/sessions') data = [session]
    else if (path === '/chat/sessions/801/messages' && method === 'GET') data = [session.lastMessage]
    else if (path === '/chat/sessions/801/offers') data = []
    else if (path === '/orders/1001') data = order
    else if (path === '/orders/1001/events') data = [{ id: 1, orderId: 1001, toStatus: 'BOOKED', description: '双方达成报价', createdAt: now }]
    else if (path === '/orders') data = { items: [order], pagination }
    else if (path.endsWith('/read')) data = {}
    else return route.fulfill({ status: 404, json: { code: 'TEST_UNHANDLED_API', message: path } })
    return route.fulfill({ json: { code: 0, message: 'ok', data } })
  })
}

test('product gallery switches one main photo and keeps the seller/location/description layout', async ({ page }) => {
  await setup(page)
  let favorite = true
  await page.route('**/favorites?**', (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page'))
    return route.fulfill({ json: { data: { items: requestedPage === 2 && favorite ? [product] : [], pagination: { page: requestedPage, pageSize: 100, total: favorite ? 101 : 0 } } } })
  })
  // A full first page forces the production lookup to check subsequent pages.
  await page.route('**/favorites?page=1&**', (route) => route.fulfill({ json: { data: { items: favorite ? Array.from({ length: 100 }, (_, index) => ({ ...product, id: 2000 + index })) : [], pagination: { page: 1, pageSize: 100, total: favorite ? 101 : 0 } } } }))
  await page.route('**/favorites/601', (route) => { favorite = route.request().method() !== 'DELETE'; return route.fulfill({ json: { data: {} } }) })
  await page.goto('/product/601')
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '查看第 2 张图片' })).toBeVisible()
  await page.getByRole('button', { name: '查看第 2 张图片' }).click()
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '商品描述', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '交易地点', exact: true })).toBeVisible()
  await expect(page.getByText('八成新', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('GOOD', { exact: true })).toHaveCount(0)
  const gallery = await page.getByRole('region', { name: '商品图片' }).boundingBox()
  const seller = await page.getByRole('region', { name: '卖家信息' }).boundingBox()
  expect(gallery!.x + gallery!.width).toBeLessThanOrEqual(seller!.x)
  // The fixture product is already in this account's persisted favorites.
  await expect(page.getByRole('button', { name: '取消收藏', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消收藏', exact: true }).click()
  await expect(page.getByRole('button', { name: '收藏', exact: true })).toBeEnabled()
  expect(favorite).toBe(false)
  await page.reload()
  await expect(page.getByRole('button', { name: '收藏', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消收藏', exact: true })).toBeEnabled()
  await page.reload()
  await expect(page.getByRole('button', { name: '取消收藏', exact: true })).toBeEnabled()
})

test('chat restores the session pane, message bubbles and real send/session switching', async ({ page }) => {
  await setup(page)
  let sent: unknown
  await page.route('**/chat/sessions/801/messages', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    sent = route.request().postDataJSON()
    return route.fulfill({ json: { data: { ...sent as object, id: 902, sessionId: 801, senderId: 501, createdAt: now } } })
  })
  await page.goto('/chat/801')
  const pane = page.getByRole('region', { name: '聊天会话' })
  const conversation = page.getByRole('region', { name: '当前聊天' })
  await expect(pane).toBeVisible()
  await expect(conversation).toBeVisible()
  expect((await pane.boundingBox())!.x).toBeLessThan((await conversation.boundingBox())!.x)
  await expect(conversation.getByText('你好，这件商品还在吗？', { exact: true })).toBeVisible()
  await expect(conversation.getByRole('link', { name: /戴尔/ })).toBeVisible()
  await page.getByRole('textbox', { name: '消息内容' }).fill('请问可以校内验货吗？')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(conversation.getByText('请问可以校内验货吗？', { exact: true })).toBeVisible()
  expect(sent).toMatchObject({ kind: 'TEXT', content: '请问可以校内验货吗？' })
  await page.getByRole('textbox', { name: '消息内容' }).fill('尚未发送的草稿')
  let releaseRefresh!: () => void
  const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve })
  await page.route('**/chat/sessions', async (route) => {
    await refreshGate
    return route.fulfill({ json: { data: [session] } })
  })
  const refreshing = page.waitForRequest((request) => new URL(request.url()).pathname === '/chat/sessions')
  await page.getByRole('button', { name: '刷新会话', exact: true }).click()
  await refreshing
  await expect(page.getByRole('textbox', { name: '消息内容' })).toHaveValue('尚未发送的草稿')
  releaseRefresh()
  await expect(pane.getByRole('link', { name: /王同学/ })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '消息内容' })).toHaveValue('尚未发送的草稿')
  await page.goto('/chat')
  await page.getByRole('link', { name: /王同学/ }).click()
  await expect(page).toHaveURL(/\/chat\/801$/)
})

test('chat matches the original proportions and compact offer/composer while keeping emoji and quote actions', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 1720, height: 960 })
  await page.routeWebSocket('**/ws', (socket) => {
    if (process.env.CAMPUSLOOP_EXPECT_WS_URL) expect(socket.url()).toBe(process.env.CAMPUSLOOP_EXPECT_WS_URL)
    socket.onMessage(() => socket.send(JSON.stringify({ type: 'AUTH_OK', payload: {} })))
  })
  await page.route('**/chat/sessions/801/messages?**', (route) => route.fulfill({ json: { data: [
    session.lastMessage,
    { ...session.lastMessage, id: 902, senderId: user.id, content: '还在的，成色很好，可以在校内交易。', createdAt: '2030-01-01T10:02:00Z' },
    { ...session.lastMessage, id: 903, content: '可以便宜一点吗？', createdAt: '2030-01-01T10:04:00Z' },
    { ...session.lastMessage, id: 904, senderId: user.id, content: '可以，¥850 可以吗？', createdAt: '2030-01-01T10:05:00Z' },
  ] } }))
  await page.route('**/chat/sessions/801/offers', (route) => route.fulfill({ json: { data: [
    { id: 1101, sessionId: 801, proposerId: peer.id, amount: 850, status: 'PENDING', createdAt: '2030-01-01T10:06:00Z', expireAt: '2030-01-02T10:06:00Z' },
  ] } }))
  await page.goto('/chat/801')
  await expect(page.getByText('实时连接已建立', { exact: true })).toBeVisible()
  const pane = (await page.getByRole('region', { name: '聊天会话' }).boundingBox())!
  const conversation = (await page.getByRole('region', { name: '当前聊天' }).boundingBox())!
  expect(pane.width / (pane.width + conversation.width)).toBeGreaterThan(0.27)
  expect(pane.width / (pane.width + conversation.width)).toBeLessThan(0.32)
  const quote = page.getByRole('region', { name: '报价 ¥850.00', exact: true })
  await expect(quote.getByRole('button', { name: '接受报价', exact: true })).toBeVisible()
  await expect(quote.getByRole('button', { name: '拒绝报价', exact: true })).toBeVisible()
  expect((await quote.boundingBox())!.height).toBeLessThan(150)
  const composer = page.getByRole('textbox', { name: '消息内容' })
  await composer.fill('好的')
  await page.getByRole('button', { name: '插入表情', exact: true }).click()
  await page.getByRole('button', { name: '插入 😊', exact: true }).click()
  await expect(composer).toHaveValue('好的😊')
  await expect(page.getByRole('button', { name: '插入 😊', exact: true })).toBeHidden()
  await page.getByRole('button', { name: '报价', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: '报价金额', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '报价', exact: true }).click()
  if (process.env.CAMPUSLOOP_VISUAL_OUTPUT) await page.screenshot({ path: path.join(process.env.CAMPUSLOOP_VISUAL_OUTPUT, '1720-chat-original-comparison.png'), fullPage: true })
  for (const height of [667, 568]) {
    await page.setViewportSize({ width: 390, height })
    const send = (await page.getByRole('button', { name: '发送消息', exact: true }).boundingBox())!
    const navigation = (await page.getByRole('navigation', { name: '移动导航', exact: true }).boundingBox())!
    expect(send.y + send.height, `composer hidden at 390x${height}`).toBeLessThanOrEqual(navigation.y)
  }
})

test('profile restores summary beside editable data; wanted and transactions retain rich cards', async ({ page }) => {
  await setup(page)
  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: '编辑资料', exact: true })).toBeVisible()
  const summary = await page.getByRole('region', { name: '个人资料概览' }).boundingBox()
  const edit = await page.getByRole('region', { name: '编辑资料' }).boundingBox()
  expect(summary!.x + summary!.width).toBeLessThanOrEqual(edit!.x)
  await page.goto('/wanted')
  await expect(page.getByText('最低成色：八成新')).toBeVisible()
  await page.goto('/transactions')
  await expect(page.getByRole('tab', { name: '我买到的' })).toBeVisible()
  await expect(page.getByRole('img', { name: product.title, exact: true })).toBeVisible()
})

test('restored views fit mobile, preserve guest action protection and never fall back to mock products', async ({ page }) => {
  await setup(page, true)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/product/601')
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '联系卖家', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.route('**/products/601', (route) => route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } }))
  await page.goto('/product/601')
  await expect(page.getByText('内容不存在或已不可见', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toHaveCount(0)
})

test('all student routes render on desktop and mobile without overflow or runtime errors', async ({ page }) => {
  await setup(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const screens = [
    ['/market', '校园市场'], ['/product/601', product.title], ['/my-products', '我的发布'], ['/favorites', '我的收藏'],
    ['/publish', '发布商品'], ['/product/601/edit', '编辑商品'], ['/wanted', '求购广场'], ['/wanted/701', '求购详情'],
    ['/wanted/publish', '发布求购'], ['/wanted/701/edit', '编辑求购'], ['/wanted/701/matches', '规则匹配结果'],
    ['/publish/price-advice', '价格建议'], ['/chat', '聊天'], ['/chat/801', '王同学'], ['/transactions', '交易中心'],
    ['/transactions/1001', '订单 #1001'], ['/transactions/1001/meetup', '安排见面'], ['/transactions/1001/review', '评价交易'],
    ['/notifications', '通知'], ['/report', '我的举报记录'], ['/profile', '个人资料'], ['/login', '登录'], ['/register', '创建账号'],
  ]
  const folder = process.env.CAMPUSLOOP_VISUAL_OUTPUT
  if (folder) await mkdir(folder, { recursive: true })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 })
    for (const [url, heading] of screens) {
      await page.goto(url)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
      await expect(page.getByText('TEST_UNHANDLED_API', { exact: true })).toHaveCount(0)
      await expect(page.getByText('正在处理，请稍候。', { exact: true })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${url} overflow`).toBe(true)
      if (folder) await page.screenshot({ path: path.join(folder, `${width}-${url.replace(/\//g, '_')}.png`), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})

test('admin keeps management tabs and tables on desktop and mobile', async ({ page }) => {
  await setup(page)
  await page.route('**/auth/browser-session', (route) => route.fulfill({ json: { data: { accessToken: 'fixture-not-real', expiresIn: 600, user: { ...user, role: 'ADMIN' } } } }))
  await page.route('**/admin/users?**', (route) => route.fulfill({ json: { data: { items: [user], pagination } } }))
  await page.route('**/admin/reports?**', (route) => route.fulfill({ json: { data: [] } }))
  await page.route('**/admin/products?**', (route) => route.fulfill({ json: { data: { items: [{ product, moderationBlocked: false }], pagination } } }))
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1080 })
    await page.goto('/admin')
    await expect(page.getByRole('button', { name: '详情与人工处理 #501', exact: true })).toBeVisible()
    await page.getByRole('tab', { name: '商品治理', exact: true }).click()
    await expect(page.getByRole('button', { name: '查看并处理商品 #601', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (process.env.CAMPUSLOOP_VISUAL_OUTPUT) await page.screenshot({ path: path.join(process.env.CAMPUSLOOP_VISUAL_OUTPUT, `${width}-admin.png`), fullPage: true })
  }
})

test('M2 form controls have accessible names', async ({ page }) => {
  await setup(page)
  await page.route('**/orders/1001', route => route.fulfill({
    json: { data: { ...order, status: 'COMPLETED' } },
  }))

  const paths = [
    '/login',
    '/register',
    '/publish',
    '/wanted/publish',
    '/profile',
    '/transactions/1001/meetup',
    '/transactions/1001/review',
    '/publish/price-advice',
  ]
  const missing: Array<{
    path: string
    tag: string
    id: string
    role: string | null
  }> = []
  const counts: Array<{ path: string; checked: number }> = []

  for (const path of paths) {
    await page.goto(path)
    await expect(page.locator('.ant-form').first()).toBeVisible()

    const controls = page.locator(
      '.ant-form input:not([type="hidden"]), .ant-form textarea, ' +
      '.ant-form select, .ant-form [role="combobox"], ' +
      '.ant-form [role="spinbutton"], .ant-form [role="radiogroup"], .ant-form .ant-rate',
    )
    let checked = 0
    for (let index = 0; index < await controls.count(); index++) {
      const control = controls.nth(index)
      if (!await control.isVisible() || !await control.isEnabled()) continue

      checked += 1
      try {
        await expect(control).toHaveAccessibleName(/\S/, { timeout: 300 })
      } catch {
        missing.push({
          path,
          ...await control.evaluate(element => ({
            tag: element.tagName,
            id: element.id,
            role: element.getAttribute('role'),
          })),
        })
      }
    }
    expect(checked, path + ' must contain visible form controls').toBeGreaterThan(0)
    counts.push({ path, checked })
  }

  console.table(counts)
  console.log('Missing accessible names:', JSON.stringify(missing, null, 2))
  expect(missing).toEqual([])
})

test('M2 sampled text contrast', async ({ page }) => {
  await setup(page)

  const screens = [
    ['/login', '登录'],
    ['/register', '创建账号'],
    ['/publish', '发布商品'],
    ['/wanted/publish', '发布求购'],
    ['/profile', '个人资料'],
    ['/product/601', product.title],
    ['/chat/801', peer.nickname],
    ['/transactions/1001', '订单 #1001'],
    ['/publish/price-advice', '价格建议'],
    ['/notifications', '通知'],
    ['/admin', '管理后台'],
  ]
  const violations: unknown[] = []
  const manualReview: unknown[] = []

  for (const [url, heading] of screens) {
    if (url === '/admin') {
      await page.route('**/auth/browser-session', route => route.fulfill({
        json: { data: {
          accessToken: 'fixture-not-real', expiresIn: 600,
          user: { ...user, role: 'ADMIN' },
        } },
      }))
      await page.route('**/admin/users?**', route => route.fulfill({
        json: { data: { items: [user], pagination } },
      }))
    }

    await page.goto(url)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expect(page.getByText('正在处理，请稍候。', { exact: true })).toHaveCount(0)
    await expect(page.getByText('TEST_UNHANDLED_API', { exact: true })).toHaveCount(0)

    const result = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    for (const violation of result.violations) {
      for (const node of violation.nodes) {
        violations.push({
          page: url,
          rule: violation.id,
          target: node.target,
          html: node.html,
          details: node.failureSummary,
        })
      }
    }

    const reviewDirectory = process.env.CAMPUSLOOP_A11Y_REVIEW_OUTPUT
    if (reviewDirectory && result.incomplete.length) {
      await mkdir(reviewDirectory, { recursive: true })
      const filename = url.replace(/[^a-zA-Z0-9_-]/g, '_')
      await page.screenshot({
        path: path.join(reviewDirectory, filename + '.png'),
        fullPage: true,
      })

      const details: unknown[] = []
      for (const item of result.incomplete) {
        for (const node of item.nodes) {
          let rendered: unknown = null
          const selector = node.target[0]
          if (node.target.length === 1 && typeof selector === 'string') {
            const locator = page.locator(selector)
            if (await locator.count() === 1) {
              rendered = await locator.evaluate(element => {
                const style = getComputedStyle(element)
                const backgrounds = []
                let current: Element | null = element
                while (current) {
                  const parentStyle = getComputedStyle(current)
                  backgrounds.push({
                    tag: current.tagName,
                    classes: [...current.classList],
                    backgroundColor: parentStyle.backgroundColor,
                    backgroundImage: parentStyle.backgroundImage,
                    opacity: parentStyle.opacity,
                  })
                  current = current.parentElement
                }
                return {
                  text: element.textContent?.trim(),
                  color: style.color,
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  backgrounds,
                }
              })
            }
          }
          details.push({
            rule: item.id,
            target: node.target,
            html: node.html,
            checks: [...node.any, ...node.all, ...node.none].map(check => ({
              id: check.id,
              message: check.message,
              data: check.data,
            })),
            rendered,
          })
        }
      }

      const { writeFile } = await import('node:fs/promises')
      await writeFile(
        path.join(reviewDirectory, filename + '.json'),
        JSON.stringify({ page: url, details }, null, 2) + '\n',
        'utf8',
      )
    }

    for (const item of result.incomplete) {
      manualReview.push({
        page: url,
        rule: item.id,
        targets: item.nodes.map(node => node.target),
      })
    }
  }

  console.log('Contrast violations:', JSON.stringify(violations, null, 2))
  console.log('Contrast requires manual review:', JSON.stringify(manualReview, null, 2))
  expect(violations).toEqual([])
})

test('M2 short text and image overlays', async ({ page }) => {
  await setup(page)

  const parse = (value: string) => {
    const parts = value.match(/[\d.]+/g)?.map(Number)
    if (!value.startsWith('rgb') || !parts || parts.length < 3) {
      throw new Error('Unsupported computed color: ' + value)
    }
    return [parts[0], parts[1], parts[2], parts[3] ?? 1]
  }
  const over = (color: number[], background: number[]) =>
    color.slice(0, 3).map((channel, index) =>
      channel * color[3] + background[index] * (1 - color[3]),
    )
  const luminance = (rgb: number[]) => {
    const linear = rgb.map(channel => {
      const value = channel / 255
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4
    })
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
  }
  const measurements: Array<{ name: string; ratio: number }> = []
  const check = async (
    name: string,
    textSelector: string,
    backgroundSelector: string,
    index = 0,
  ) => {
    const text = page.locator(textSelector).nth(index)
    const background = page.locator(backgroundSelector).nth(index)
    await expect(text).toBeVisible()

    const foregroundColor = await text.evaluate(element =>
      getComputedStyle(element).color,
    )
    const backgroundColor = await background.evaluate(element =>
      getComputedStyle(element).backgroundColor,
    )

    // A white image is the worst case for white text on a black overlay.
    const backdrop = over(parse(backgroundColor), [255, 255, 255])
    const foreground = over(parse(foregroundColor), backdrop)
    const [dark, light] = [
      luminance(foreground), luminance(backdrop),
    ].sort((a, b) => a - b)

    const ratio = (light + 0.05) / (dark + 0.05)
    measurements.push({ name, ratio: Number(ratio.toFixed(2)) })
    expect.soft(ratio, name).toBeGreaterThanOrEqual(4.5)
  }

  await page.goto('/product/601')
  await expect(page.getByRole('heading', { name: product.title, exact: true })).toBeVisible()
  await check('卖家头像首字', '.person .ant-avatar-string', '.person .ant-avatar')

  const gallery = page.locator('.gallery-count')
  await expect(gallery).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(gallery).toHaveCSS('background-image', 'none')
  const overlay = parse(await gallery.evaluate(element =>
    getComputedStyle(element).backgroundColor,
  ))
  expect(overlay.slice(0, 3)).toEqual([0, 0, 0])
  await check('图片计数：白色图片最不利背景', '.gallery-count', '.gallery-count')

  await page.goto('/chat/801')
  await expect(page.getByRole('heading', { name: peer.nickname, exact: true })).toBeVisible()
  await check('会话头像首字', '.chat-session .ant-avatar-string', '.chat-session .ant-avatar')
  await check('消息头像首字', '.message-row .ant-avatar-string', '.message-row .ant-avatar')
  await expect(page.locator('.chat-session .ant-badge-count')).toHaveAttribute('title', '2')
  await check(
    '未读数字',
    '.chat-session .ant-badge-count .current',
    '.chat-session .ant-badge-count',
  )

  await page.goto('/transactions/1001')
  await expect(page.getByRole('heading', { name: '订单 #1001', exact: true })).toBeVisible()
  await expect(page.locator('.order-persons .ant-avatar-string')).toHaveCount(2)
  for (let index = 0; index < 2; index++) {
    await check(
      '订单参与者头像 ' + (index + 1),
      '.order-persons .ant-avatar-string',
      '.order-persons .ant-avatar',
      index,
    )
  }

  await page.route('**/auth/browser-session', route => route.fulfill({
    json: { data: {
      accessToken: 'fixture-not-real', expiresIn: 600,
      user: { ...user, role: 'ADMIN' },
    } },
  }))
  await page.route('**/admin/users?**', route => route.fulfill({
    json: { data: { items: [user], pagination } },
  }))
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: '管理后台', exact: true })).toBeVisible()
  await check('管理员列表头像首字', '.person .ant-avatar-string', '.person .ant-avatar')

  console.table(measurements)
})
