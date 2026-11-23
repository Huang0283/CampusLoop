import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'
import { adminDashboardFixture } from '../admin-dashboard-fixture'

for (const width of [1440, 390]) test(`administrator verifies and cancels a dispute without changing completed orders at ${width}px`, async ({ page }) => {
  const stamp = '2026-11-23T08:00:00Z'
  const person = { id: 501, nickname: '同学', avatar: null, rating: 0, transactionCount: 0 }
  const user = { ...person, role: 'ADMIN', status: 'ACTIVE', email: 'admin@example.invalid' }
  const order = { id: 71, product: { id: 601, title: '台灯', description: '', category: 'DAILY', condition: 'GOOD', status: 'RESERVED', images: [], price: 50, campusLocation: '校内', createdAt: stamp, updatedAt: stamp, seller: person }, buyer: { ...person, id: 502 }, seller: person, amount: 45, status: 'DISPUTED', version: 4, participantDisabled: true, buyerConfirmedComplete: true, sellerConfirmedComplete: false, createdAt: stamp, updatedAt: stamp }
  const reason = '双方已核实物品退还和线下结算，协商取消本次订单。'
  const events = [{ id: 1, orderId: 71, toStatus: 'DISPUTED', description: '交易参与方被禁用，待人工核实', createdAt: stamp }]
  let writes = 0
  await routeApiFixture(page, route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const reply = (data: unknown) => route.fulfill({ json: { data } })
    if (path === '/auth/browser-session') return reply({ accessToken: 'dispute-fixture', expiresIn: 600, user })
    if (path === '/notifications') return reply([])
    if (path === '/admin/dashboard') return reply(adminDashboardFixture)
    if (path === '/admin/orders') return reply({ items: [order], pagination: { page: 1, pageSize: 20, total: 1 } })
    if (path === '/admin/orders/71/events') return reply(events)
    if (path === '/admin/orders/71/cancel-dispute') {
      expect(request.postDataJSON()).toEqual({ expectedVersion: 4, reason })
      writes += 1; order.status = 'CANCELLED'; order.version += 1; order.product.status = 'HIDDEN'
      events.push({ id: 2, orderId: 71, toStatus: 'CANCELLED', description: reason, createdAt: stamp })
      return reply(order)
    }
    return route.fulfill({ status: 404 })
  })
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/admin/orders')
  await page.getByRole('button', { name: '查看订单 #71', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '订单 #71', exact: true })
  await expect(dialog.getByText('交易参与方被禁用，待人工核实', { exact: true })).toBeVisible()
  const cancel = dialog.getByRole('button', { name: '核实后取消订单', exact: true })
  await expect(cancel).toBeDisabled()
  await dialog.getByLabel('核实结论与取消原因', { exact: true }).fill(reason)
  await cancel.click()
  await page.getByRole('button', { name: /^确\s*定$/ }).click()
  await expect(dialog.getByText(reason, { exact: true })).toBeVisible()
  await expect(cancel).toHaveCount(0)
  expect(writes).toBe(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await page.getByRole('button', { name: '查看订单 #71', exact: true }).click()
  await expect(dialog.getByText(reason, { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: '核实后取消订单', exact: true })).toHaveCount(0)
})
