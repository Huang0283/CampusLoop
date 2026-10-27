import { test, expect, type Page } from '@playwright/test'
import { routeApiFixture } from '../api-fixture'

// M4 补充：管理后台“举报处理”“商品治理”抽屉的独立 Tab 循环复核。
// M2 只直接覆盖“用户与风险线索”抽屉，本用例沿用同一 `keepDrawerFocus` 断言路径。
async function setup(page: Page) {
  const unexpected: string[] = []
  const writes: string[] = []
  const errors: string[] = []
  const now = '2030-01-01T10:00:00Z'
  const admin = {
    id: 501, nickname: 'Keyboard admin', role: 'ADMIN', status: 'ACTIVE',
    email: 'admin@example.invalid', rating: 0, transactionCount: 0,
  }
  const seller = {
    ...admin, id: 502, nickname: 'Seller fixture', role: 'USER',
    email: 'seller@example.invalid',
  }
  const product = {
    id: 601, seller, title: 'Keyboard fixture product',
    category: 'DIGITAL', condition: 'GOOD', description: 'Fixture only',
    price: 30, originalPrice: 50, campusLocation: 'Library',
    images: [], status: 'ON_SALE', createdAt: now, updatedAt: now,
  }
  const report = {
    id: 9001, targetType: 'PRODUCT', targetId: 601, reason: 'FAKE_PRODUCT',
    description: 'Fixture report', status: 'PENDING', createdAt: now,
    handledBy: null, handledAt: null, evidence: [],
  }

  page.on('pageerror', error => errors.push(error.name))
  await routeApiFixture(page, route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    const reply = (data: unknown) => route.fulfill({ json: { data } })

    if (path === '/auth/browser-session' && method === 'POST') {
      return reply({ accessToken: 'fixture-not-real', expiresIn: 600, user: admin })
    }
    if (method !== 'GET') writes.push(`${method} ${path}`)
    if (method === 'GET') {
      if (path === '/notifications') return reply([])
      if (path === '/admin/users') {
        return reply({
          items: [seller],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }
      if (path === '/admin/reports') return reply([report])
      if (path === '/admin/products') {
        return reply({
          items: [{ product, moderationBlocked: false }],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }
      if (path === '/admin/products/601') {
        return reply({ product, moderationBlocked: false })
      }
    }
    unexpected.push(`${method} ${path}`)
    return route.fulfill({
      status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' },
    })
  })
  return { unexpected, writes, errors }
}

async function assertTrapped(page: Page, drawerName: string, openerName: string) {
  const opener = page.getByRole('button', { name: openerName, exact: true })
  await opener.focus()
  await page.keyboard.press('Enter')
  const drawer = page.getByRole('dialog', { name: drawerName, exact: true })
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
  await expect(opener).toBeFocused()
}

test('report drawer keeps keyboard focus inside and Escape returns to its opener (contract fixture)', async ({ page }) => {
  const observed = await setup(page)
  await page.goto('/admin')
  await page.getByRole('tab', { name: '举报处理' }).click()
  await assertTrapped(page, '举报详情与人工处理', '举报详情 #9001')
  expect(observed.writes).toEqual([])
  expect(observed.unexpected).toEqual([])
  expect(observed.errors).toEqual([])
})

test('product drawer keeps keyboard focus inside and Escape returns to its opener (contract fixture)', async ({ page }) => {
  const observed = await setup(page)
  await page.goto('/admin')
  await page.getByRole('tab', { name: '商品治理' }).click()
  await assertTrapped(page, '商品详情与人工处理', '查看并处理商品 #601')
  expect(observed.writes).toEqual([])
  expect(observed.unexpected).toEqual([])
  expect(observed.errors).toEqual([])
})
