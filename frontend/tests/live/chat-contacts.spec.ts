import { test, expect, type Page, type WebSocketRoute } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { ChatSession, Message, Offer, Product, UserProfile } from '../../src/sdk'

// Clearly isolated network fixtures; no test messages or products enter the daily DB.
const stamp = '2026-11-01T10:00:00Z'
const peer = { id: 502, nickname: '同学', rating: 0, transactionCount: 0 }
const user: UserProfile = { ...peer, id: 501, nickname: '买家', role: 'USER', status: 'ACTIVE', email: 'contact-fixture@example.invalid', campusVerified: false }
const product: Product = { id: 601, seller: peer, title: '台灯', category: 'DAILY', condition: 'GOOD', description: '测试夹具', price: 50, campusLocation: '校内', images: [], status: 'ON_SALE', createdAt: stamp, updatedAt: stamp }

async function setup(page: Page) {
  const messages = new Map<number, Message[]>([
    [801, [{ id: 901, sessionId: 801, clientMsgId: 'lamp', senderId: 502, kind: 'TEXT', content: '台灯可以校内取', createdAt: stamp }]],
    [802, [{ id: 902, sessionId: 802, clientMsgId: 'umbrella', senderId: 502, kind: 'TEXT', content: '雨伞还在', createdAt: '2026-11-01T11:00:00Z' }]],
    [803, [{ id: 903, sessionId: 803, clientMsgId: 'other', senderId: 503, kind: 'TEXT', content: '另一位同学的消息', createdAt: stamp }]],
  ])
  const sessions: ChatSession[] = [
    { id: 802, type: 'PRODUCT', peer, product: { ...product, id: 602, title: '雨伞' }, unreadCount: 3 },
    { id: 801, type: 'PRODUCT', peer, product, unreadCount: 2 },
    { id: 803, type: 'PRODUCT', peer: { ...peer, id: 503 }, product: { ...product, id: 603, title: '水杯' }, unreadCount: 1 },
  ]
  const offers: Offer[] = [{ id: 1001, sessionId: 801, proposerId: 501, buyerId: 501, sellerId: 502, productId: 601, originalPrice: 50, amount: 45, status: 'ACCEPTED', orderId: 1101, expireAt: '2030-01-01T00:00:00Z', createdAt: '2026-11-01T10:30:00Z' }]
  const writes: { sessionId: number; content?: string; clientMsgId: string }[] = []
  const reads = new Map<number, number>()
  const historyReads: number[] = []
  const sockets: WebSocketRoute[] = []
  let failNextSend = false
  let identity: UserProfile | null = user
  await page.routeWebSocket('**/ws', (socket) => {
    sockets.push(socket)
    socket.onMessage(() => socket.send(JSON.stringify({ type: 'AUTH_OK', payload: {} })))
  })
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
    const url = new URL(request.url()), method = request.method()
    const target = url.pathname
    const match = target.match(/^\/chat\/sessions\/(\d+)\/(messages|offers|read)$/)
    if (target === '/auth/browser-session') return identity ? route.fulfill({ json: { data: { accessToken: 'isolated-fixture', expiresIn: 600, user: identity } } }) : route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
    if (target === '/notifications') return route.fulfill({ json: { data: [] } })
    if (target === '/chat/sessions') return route.fulfill({ json: { data: identity?.id === user.id ? sessions.map((item) => ({ ...item, lastMessage: messages.get(item.id)?.at(-1) })) : [] } })
    if (!match) return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
    const sessionId = Number(match[1])
    if (match[2] === 'read') { reads.set(sessionId, request.postDataJSON().lastMessageId); return route.fulfill({ status: 204 }) }
    if (match[2] === 'offers') {
      if (method === 'POST') {
        const created: Offer = { ...offers[0], id: 1002, sessionId, productId: sessions.find((item) => item.id === sessionId)!.product!.id, amount: request.postDataJSON().amount, status: 'PENDING', orderId: undefined, createdAt: new Date().toISOString() }
        offers.push(created)
        return route.fulfill({ status: 201, json: { data: created } })
      }
      return route.fulfill({ json: { data: offers.filter((offer) => offer.sessionId === sessionId) } })
    }
    if (method === 'POST') {
      const body = request.postDataJSON()
      writes.push({ sessionId, ...body })
      if (failNextSend) { failNextSend = false; return route.abort() }
      const saved: Message = { ...body, id: 10000 + writes.length, sessionId, senderId: 501, createdAt: new Date().toISOString() }
      messages.set(sessionId, [...messages.get(sessionId) || [], saved])
      return route.fulfill({ status: 201, json: { data: saved } })
    }
    let result = messages.get(sessionId) || []
    if (url.searchParams.has('afterId')) result = result.filter((item) => item.id > Number(url.searchParams.get('afterId'))).slice(0, Number(url.searchParams.get('limit')))
    else {
      if (url.searchParams.has('beforeId')) { historyReads.push(sessionId); result = result.filter((item) => item.id < Number(url.searchParams.get('beforeId'))) }
      result = result.slice(-Number(url.searchParams.get('limit')))
    }
    return route.fulfill({ json: { data: result } })
  })
  return { sessions, messages, writes, reads, historyReads, sockets, offers, failSend: () => { failNextSend = true }, setIdentity: (value: UserProfile | null) => { identity = value } }
}

for (const width of [1440, 390]) test(`one contact keeps multiple products, messages, drafts and quotes together at ${width}px`, async ({ page }) => {
  const fixture = await setup(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width, height: width === 390 ? 667 : 960 })
  await page.goto('/chat')
  const links = page.locator('.chat-session-list a')
  await expect(links).toHaveCount(2) // Same nickname, different user ID remains a separate contact.
  await expect(links.first().locator('.ant-badge-count')).toHaveAttribute('title', '5')
  await page.getByRole('textbox', { name: '搜索会话' }).fill('台灯')
  await expect(links).toHaveCount(1)
  await links.first().click()
  await expect(page).toHaveURL(/\/chat\/802$/)
  const stream = page.locator('.chat-message-stream')
  await expect(stream.getByText('台灯可以校内取', { exact: true })).toBeVisible()
  await expect(stream.getByText('雨伞还在', { exact: true })).toBeVisible()
  await expect(stream.getByText('另一位同学的消息', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '查看订单', exact: true })).toHaveAttribute('href', '/transactions/1101')
  await expect.poll(() => [...fixture.reads.entries()].sort()).toEqual([[801, 901], [802, 902]])
  const connectionsBeforeSwitch = fixture.sockets.length
  await page.getByRole('textbox', { name: '消息内容' }).fill('商品切换时保留草稿')
  await page.getByRole('combobox', { name: '选择沟通商品或求购' }).click()
  await page.getByRole('option', { name: '台灯', exact: true }).click()
  await expect(page).toHaveURL(/\/chat\/801$/)
  await expect(page.getByRole('textbox', { name: '消息内容' })).toHaveValue('商品切换时保留草稿')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(stream.getByText('商品切换时保留草稿', { exact: true })).toBeVisible()
  expect(fixture.writes.at(-1)?.sessionId).toBe(801)
  expect(fixture.sockets).toHaveLength(connectionsBeforeSwitch)
  await page.getByRole('combobox', { name: '选择沟通商品或求购' }).click()
  await page.getByRole('option', { name: '雨伞', exact: true }).click()
  await expect(page).toHaveURL(/\/chat\/802$/)
  await page.getByRole('button', { name: '报价', exact: true }).click()
  await page.getByRole('spinbutton', { name: '报价金额', exact: true }).fill('42')
  await page.getByRole('button', { name: '提交报价', exact: true }).click()
  await expect(stream.getByRole('region', { name: '报价 ¥42.00', exact: true })).toBeVisible()
  expect(fixture.offers.at(-1)).toMatchObject({ sessionId: 802, productId: 602, amount: 42 })
  await page.getByRole('button', { name: '报价', exact: true }).click()
  await page.reload()
  await expect(stream.getByText('商品切换时保留草稿', { exact: true })).toBeVisible()
  await expect(page.locator('.chat-session-list a')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '发送消息', exact: true })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  expect(errors).toEqual([])
  if (process.env.CAMPUSLOOP_VISUAL_OUTPUT) {
    await mkdir(process.env.CAMPUSLOOP_VISUAL_OUTPUT, { recursive: true })
    await page.screenshot({ path: path.join(process.env.CAMPUSLOOP_VISUAL_OUTPUT, `${width}-contact-chat.png`) })
  }
})

test('merged chat keeps retry targets, real time events, history cursors and new product drafts', async ({ page }) => {
  const fixture = await setup(page)
  const history = Array.from({ length: 101 }, (_, i): Message => ({ id: 2000 + i, sessionId: 801, senderId: 502, clientMsgId: `history-${i}`, kind: 'TEXT', content: `台灯历史 ${i}`, createdAt: stamp }))
  fixture.messages.set(801, history)
  await page.goto('/chat/801')
  await expect(page.getByText('台灯历史 100', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '加载更早消息', exact: true }).click()
  await expect(page.getByText('台灯历史 0', { exact: true })).toBeAttached()
  expect(fixture.historyReads).toEqual([801])
  fixture.failSend()
  await page.getByRole('textbox', { name: '消息内容' }).fill('台灯失败重试')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(page.getByText('发送失败', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: '选择沟通商品或求购' }).click()
  await page.getByRole('option', { name: '雨伞', exact: true }).click()
  await page.getByRole('button', { name: '重试发送', exact: true }).click()
  await expect(page.getByText('发送失败', { exact: true })).toHaveCount(0)
  expect(fixture.writes.slice(-2).map((item) => item.sessionId)).toEqual([801, 801])
  expect(fixture.writes.at(-1)?.clientMsgId).toBe(fixture.writes.at(-2)?.clientMsgId)
  const incoming: Message = { id: 15000, clientMsgId: 'incoming-unselected', sessionId: 801, senderId: 502, kind: 'TEXT', content: '未选中的台灯也实时收到', createdAt: new Date().toISOString() }
  fixture.messages.get(801)!.push(incoming)
  fixture.sockets.at(-1)!.send(JSON.stringify({ type: 'MESSAGE_CREATED', payload: { sessionId: 801, message: incoming } }))
  await expect(page.getByText(incoming.content!, { exact: true })).toBeVisible()
  await expect.poll(() => fixture.reads.get(801)).toBe(15000)
  await page.getByRole('textbox', { name: '消息内容' }).fill('新商品加入时保留')
  fixture.sessions.push({ ...fixture.sessions[0], id: 804, product: undefined, type: 'WANTED', wanted: { id: 704, owner: peer, title: '求购笔记本', description: '测试夹具', budgetMin: 1, budgetMax: 10, condition: 'GOOD', location: '校内', status: 'OPEN', createdAt: stamp } })
  await page.getByRole('button', { name: '刷新会话', exact: true }).click()
  await expect(page.getByText('共 3 项，聊天记录已合并', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '消息内容' })).toHaveValue('新商品加入时保留')
  await page.getByRole('combobox', { name: '选择沟通商品或求购' }).click()
  await page.getByRole('option', { name: '求购：求购笔记本', exact: true }).click()
  await expect(page.getByRole('button', { name: '报价', exact: true })).toHaveCount(0)
  fixture.setIdentity({ ...user, id: 600, nickname: '另一个账号' })
  await page.reload()
  await expect(page.getByText('会话不存在或无权访问。', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '消息内容' })).toHaveCount(0)
  fixture.setIdentity(null)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
})

test('cancelling a removed listing explains why it stays out of the market after reload', async ({ page }) => {
  await setup(page)
  let cancelled = false
  await page.route('**/orders/1601', (route) => route.fulfill({ json: { data: {
    id: 1601, product: { ...product, status: cancelled ? 'HIDDEN' : 'RESERVED' }, buyer: user, seller: peer,
    status: cancelled ? 'CANCELLED' : 'BOOKED', amount: 45, buyerConfirmedComplete: false, sellerConfirmedComplete: false,
    createdAt: stamp, updatedAt: stamp,
  } } }))
  await page.route('**/orders/1601/events', (route) => route.fulfill({ json: { data: [] } }))
  await page.route('**/orders/1601/cancel', (route) => { cancelled = true; return route.fulfill({ json: { data: {} } }) })
  await page.goto('/transactions/1601')
  await page.getByRole('textbox', { name: '取消原因', exact: true }).fill('无需预订')
  await page.getByRole('button', { name: '取消订单', exact: true }).click()
  await expect(page.getByText('取消这笔订单？正常商品将恢复在售，已删除或下架的商品保持下架。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^确\s*定$/ }).click()
  await expect(page.getByText('订单已取消，该商品已删除或下架，仍不在商城展示。', { exact: true })).toBeVisible()
  await expect(page.locator('.product-summary').getByText('已下架', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '取消订单', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('订单已取消，该商品已删除或下架，仍不在商城展示。', { exact: true })).toBeVisible()
})
