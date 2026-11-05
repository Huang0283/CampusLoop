import { test, expect } from './fixtures'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const picture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYPjPwMDAxMDAwMDAAAALHwEDmIWXfgAAAABJRU5ErkJggg==', 'base64')

test('administrator uploads, saves and reloads a private avatar on desktop and mobile', async ({ page, request }) => {
  const container = process.env.CAMPUSLOOP_TEST_API_CONTAINER
  test.skip(!container, 'An explicitly isolated audit API is required to create the synthetic admin')
  if (!/^campusloop-[a-z0-9-]*audit[a-z0-9-]*$/.test(container!)) throw new Error('Only an audit API may create this fixture')
  await page.goto('/register')
  const email = `privacy-admin-${randomUUID()}@example.invalid`
  await page.getByLabel('校园邮箱', { exact: true }).fill(email)
  await page.getByLabel('昵称', { exact: true }).fill('隐私测试管理员')
  await page.getByLabel('密码', { exact: true }).fill('Valid@12345')
  const registration = page.waitForResponse(response => response.url().endsWith('/auth/register'))
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  const registered = await registration
  expect(registered.status()).toBe(201)
  const actor = (await registered.json()).data
  // This fixture is confined to the dedicated audit database, never the daily account database.
  execFileSync('docker', ['exec', container!, 'python', '-c', `
import sys
from urllib.parse import urlsplit
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import User
s = get_settings()
assert s.app_env in ('test', 'ci') and 'audit' in urlsplit(s.database_url).path
assert urlsplit(s.redis_url).path in ('/14', '/15')
with SessionLocal.begin() as db:
    user = db.get(User, int(sys.argv[1]))
    assert user.email == sys.argv[2] and user.email.endswith('@example.invalid')
    user.role = 'ADMIN'
`, String(actor.user.id), email], { stdio: 'pipe', timeout: 10000 })
  await page.goto('/admin/profile')
  const editor = page.locator('#admin-profile-editor')
  await expect(editor).toBeVisible()
  const upload = page.waitForResponse(response => response.url().includes('/uploads/images') && response.request().method() === 'POST')
  await editor.locator('input[type=file]').setInputFiles({ name: 'admin.png', mimeType: 'image/png', buffer: picture })
  const uploaded = await upload
  expect(uploaded.status()).toBe(201)
  const avatar = (await uploaded.json()).data.url
  await editor.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(page.getByText('资料已保存。', { exact: true })).toBeVisible()
  expect((await request.get(`${new URL(registered.url()).origin}/avatars/image`, { params: { reference: avatar } })).status()).toBe(401)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload()
    for (const selector of ['.adm-pf-avatar img', '.adm-me img', '.profile-avatar-upload img']) {
      await expect(page.locator(selector)).toHaveAttribute('src', /^blob:/)
      await expect.poll(() => page.locator(selector).evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(512)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
})

for (const width of [1440, 390]) test(`private avatar and chat image persist without guest access at ${width}px`, async ({ page, request, browser }) => {
  await page.setViewportSize({ width, height: 900 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/register')
  await page.getByLabel('校园邮箱', { exact: true }).fill(`privacy-${randomUUID()}@example.invalid`)
  await page.getByLabel('昵称', { exact: true }).fill('隐私测试卖家')
  await page.getByLabel('密码', { exact: true }).fill('Valid@12345')
  const registration = page.waitForResponse(response => response.url().endsWith('/auth/register'))
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  const registered = await registration
  expect(registered.status()).toBe(201)
  const api = new URL(registered.url()).origin
  const seller = (await registered.json()).data
  const sellerHeaders = { Authorization: `Bearer ${seller.accessToken}` }
  await expect(page).toHaveURL(/\/market$/)
  await page.goto('/profile')
  const upload = page.waitForResponse(response => response.url().includes('/uploads/images') && response.request().method() === 'POST')
  await page.locator('input[type=file]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: picture })
  const uploaded = await upload
  expect(uploaded.status()).toBe(201)
  const avatar = (await uploaded.json()).data.url as string
  expect(avatar).toMatch(/^https:\/\/private\./)
  await expect(page.getByRole('button', { name: '保存资料', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(page.getByText('资料已保存。', { exact: true })).toBeVisible()
  await expect(page.locator('.profile-summary img')).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => page.locator('.profile-summary img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(512)
  await page.reload()
  await expect.poll(() => page.locator('.profile-summary img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(512)
  const actors = []
  for (const name of ['隐私测试买家', '无关测试用户']) {
    const response = await request.post(`${api}/auth/register`, { data: { email: `privacy-${randomUUID()}@example.invalid`, password: 'Valid@12345', nickname: name } })
    expect(response.status()).toBe(201)
    actors.push((await response.json()).data)
  }
  const [buyer, outsider] = actors
  const buyerHeaders = { Authorization: `Bearer ${buyer.accessToken}` }
  const productImage = await request.post(`${api}/uploads/images?purpose=product`, { headers: sellerHeaders, multipart: { file: { name: 'product.png', mimeType: 'image/png', buffer: picture } } })
  expect(productImage.status()).toBe(201)
  const item = await request.post(`${api}/products`, { headers: { ...sellerHeaders, 'Idempotency-Key': randomUUID() }, data: { title: '隐私验证教材', description: '校内测试商品', category: 'BOOKS', condition: 'GOOD', price: 15, campusLocation: '校内', images: [(await productImage.json()).data.url] } })
  expect(item.status()).toBe(201)
  const session = await request.post(`${api}/chat/sessions`, { headers: buyerHeaders, data: { productId: (await item.json()).data.id } })
  expect(session.status()).toBe(200)
  const sessionId = (await session.json()).data.id
  const chatUpload = await request.post(`${api}/uploads/images?purpose=chat`, { headers: buyerHeaders, multipart: { file: { name: 'chat.png', mimeType: 'image/png', buffer: picture } } })
  expect(chatUpload.status()).toBe(201)
  const sent = await request.post(`${api}/chat/sessions/${sessionId}/messages`, { headers: buyerHeaders, data: { clientMsgId: randomUUID(), kind: 'IMAGE', content: (await chatUpload.json()).data.url } })
  expect(sent.status()).toBe(201)
  const imagePath = `${api}/chat/messages/${(await sent.json()).data.id}/image`
  for (const headers of [sellerHeaders, buyerHeaders]) {
    const response = await request.get(imagePath, { headers })
    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toBe('no-store')
    expect(response.headers().location).toBeUndefined()
  }
  expect((await request.get(imagePath)).status()).toBe(401)
  expect((await request.get(imagePath, { headers: { Authorization: `Bearer ${outsider.accessToken}` } })).status()).toBe(404)
  expect((await request.get(`${api}/avatars/image`, { params: { reference: avatar } })).status()).toBe(401)
  expect((await request.get(`${api}/avatars/image`, { params: { reference: avatar }, headers: buyerHeaders })).status()).toBe(200)
  await page.goto(`/chat/${sessionId}`)
  await expect(page.locator('.message-bubble img')).toHaveAttribute('src', /^blob:/)
  await expect.poll(() => page.locator('.message-bubble img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect.poll(() => page.locator('.chat-context img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.reload()
  await expect(page.locator('.message-bubble img')).toHaveAttribute('src', /^blob:/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  if (process.env.CAMPUSLOOP_VISUAL_OUTPUT) {
    await mkdir(process.env.CAMPUSLOOP_VISUAL_OUTPUT, { recursive: true })
    await page.screenshot({ path: path.join(process.env.CAMPUSLOOP_VISUAL_OUTPUT, `${width}-private-media.png`) })
  }
  const guest = await browser.newContext({ baseURL: new URL(page.url()).origin })
  try {
    for (const image of [page.getByRole('button', { name: '账号菜单：隐私测试卖家', exact: true }).locator('img'), page.locator('.message-bubble img')]) {
      await expect(image).toHaveAttribute('src', /^blob:/)
      const copied = await image.getAttribute('src')
      const copiedPage = await guest.newPage()
      await expect(copiedPage.goto(copied!)).rejects.toThrow()
      await copiedPage.close()
    }
    const guestPage = await guest.newPage()
    await guestPage.goto('/market')
    await expect(guestPage.getByRole('link', { name: '隐私验证教材', exact: true }).first()).toBeVisible()
    await expect(guestPage.locator('.catalog-seller img')).toHaveCount(0)
  } finally { await guest.close() }
  expect(errors).toEqual([])
})
