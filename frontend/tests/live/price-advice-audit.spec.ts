import { randomUUID } from 'node:crypto'
import { test, expect } from './fixtures'

test('listing prices come from the isolated marketplace', async ({ page, request }) => {
  test.skip(process.env.CAMPUSLOOP_UI_URL !== 'http://127.0.0.1:5197' || !/audit/.test(process.env.CAMPUSLOOP_TEST_API_CONTAINER || ''), '仅在独立审计环境运行')
  const api = 'http://127.0.0.1:18016'
  const keyword = `隔离估价测试${randomUUID().slice(0, 8)}`
  const seller = await request.post(`${api}/auth/register`, { data: {
    email: `price-seller-${randomUUID()}@example.invalid`, password: 'Valid@12345', nickname: '隔离测试卖家',
  } })
  expect(seller.status()).toBe(201)
  const token = (await seller.json()).data.accessToken as string
  const headers = { Authorization: `Bearer ${token}` }
  const uploaded = await request.post(`${api}/uploads/images?purpose=product`, { headers, multipart: {
    file: { name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYPjPwMDAxMDAwMDAAAALHwEDmIWXfgAAAABJRU5ErkJggg==', 'base64') },
  } })
  expect(uploaded.status()).toBe(201)
  const image = (await uploaded.json()).data.url as string
  for (const price of [30, 50, 70]) {
    const created = await request.post(`${api}/products`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: {
      title: `${keyword} ${price}`, category: 'BOOKS', condition: 'GOOD', price,
      campusLocation: '校内', description: '仅用于隔离环境的价格测试', images: [image],
    } })
    expect(created.status()).toBe(201)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await page.getByLabel('校园邮箱', { exact: true }).fill(`price-buyer-${randomUUID()}@example.invalid`)
  await page.getByLabel('昵称', { exact: true }).fill('隔离测试买家')
  await page.getByLabel('密码', { exact: true }).fill('Valid@12345')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await expect(page).toHaveURL(/\/market$/)
  await page.goto('/publish/price-advice')
  await page.getByLabel('商品关键词（可选）').fill(keyword)
  await page.getByRole('button', { name: '计算区间', exact: true }).click()
  await expect(page.getByText('在售标价参考区间：¥30–¥70', { exact: true })).toBeVisible()
  await expect(page.getByText('已参考 3 件在售商品', { exact: true })).toBeVisible()
  await page.getByText('查看参考商品', { exact: true }).click()
  await expect(page.getByRole('link', { name: `${keyword} 50` })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await page.getByLabel('商品关键词（可选）').fill(keyword)
  await page.getByRole('button', { name: '计算区间', exact: true }).click()
  await expect(page.getByText('在售标价参考区间：¥30–¥70', { exact: true })).toBeVisible()
})
