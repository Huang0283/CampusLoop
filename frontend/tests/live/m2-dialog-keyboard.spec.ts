import { test, expect, type Page } from '@playwright/test'

async function setup(page: Page, role: 'USER' | 'ADMIN') {
  const unexpected: string[] = []
  const writes: string[] = []
  const errors: string[] = []
  const now = '2030-01-01T10:00:00Z'
  const user = {
    id: 501, nickname: 'Keyboard fixture', role, status: 'ACTIVE',
    email: 'keyboard@example.invalid', rating: 0, transactionCount: 0,
  }
  const peer = {
    ...user, id: 502, nickname: 'Peer fixture', role: 'USER',
    email: 'peer@example.invalid',
  }
  const product = {
    id: 601, seller: peer, title: 'Keyboard fixture product',
    category: 'DIGITAL', condition: 'GOOD', description: 'Fixture only',
    price: 30, originalPrice: 50, campusLocation: 'Library',
    images: [], status: 'RESERVED', createdAt: now, updatedAt: now,
  }
  const order = {
    id: 1001, product, buyer: user, seller: peer,
    status: 'MEETUP_ARRANGED', amount: 30,
    buyerConfirmedComplete: false, sellerConfirmedComplete: false,
    createdAt: now, updatedAt: now,
    meetup: {
      id: 1101, orderId: 1001, version: 1,
      campusLocation: 'Library', scheduledDate: '2030-01-02',
      timeSlotStart: '14:00', timeSlotEnd: '15:00', note: '',
      buyerConfirmed: true, sellerConfirmed: true,
    },
  }

  page.on('pageerror', error => errors.push(error.name))
  await page.route(url => url.origin === 'http://localhost:8001', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const reply = (data: unknown) => route.fulfill({ json: { data } })

    if (path === '/auth/browser-session' && method === 'POST') {
      return reply({ accessToken: 'fixture-not-real', expiresIn: 600, user })
    }
    if (method !== 'GET') writes.push(`${method} ${path}`)
    if (method === 'GET') {
      if (path === '/notifications') return reply([])
      if (path === '/orders/1001') return reply(order)
      if (path === '/orders/1001/events') return reply([])
      if (path === '/admin/users') {
        return reply({
          items: [peer],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }
    }
    unexpected.push(`${method} ${path}`)
    return route.fulfill({
      status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' },
    })
  })
  return { unexpected, writes, errors }
}

test('transaction confirmation supports keyboard cancellation and Escape without writes (contract fixture)', async ({ page }) => {
  const observed = await setup(page, 'USER')
  await page.goto('/transactions/1001')
  const trigger = page.getByRole('button', { name: '我已完成交易', exact: true })
  await expect(trigger).toBeEnabled()
  await trigger.focus()
  await page.keyboard.press('Enter')

  const popup = page.locator('.ant-popconfirm:visible').filter({
    hasText: '确认已实际完成这次交易？',
  })
  await expect(popup).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  await expect(trigger).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(popup).toBeVisible()
  const cancel = popup.getByRole('button', { name: /^(Cancel|取\s*消)$/i })
  for (let step = 0; step < 12; step++) {
    if (await cancel.evaluate(element => element === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(popup).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(observed.writes).toEqual([])
  expect(observed.unexpected).toEqual([])
  expect(observed.errors).toEqual([])
})

test('admin drawer keeps keyboard focus inside and Escape returns to its opener without writes (contract fixture)', async ({ page }) => {
  const observed = await setup(page, 'ADMIN')
  await page.goto('/admin')
  const trigger = page.getByRole('button', {
    name: '详情与人工处理 #502', exact: true,
  })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const drawer = page.getByRole('dialog', {
    name: '用户详情与风险复核', exact: true,
  })
  await expect(drawer).toBeVisible()

  for (const key of ['Tab', 'Shift+Tab']) {
    for (let step = 0; step < 12; step++) {
      await page.keyboard.press(key)
      await expect.poll(() => drawer.evaluate(element =>
        element.contains(document.activeElement),
      )).toBe(true)
    }
  }
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(observed.writes).toEqual([])
  expect(observed.unexpected).toEqual([])
  expect(observed.errors).toEqual([])
})
