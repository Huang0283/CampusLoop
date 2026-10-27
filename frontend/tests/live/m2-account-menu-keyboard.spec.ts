import { test, expect } from '@playwright/test'
import { routeApiFixture } from '../api-fixture'

for (const key of ['Enter', 'Space']) {
  test(`account menu supports Tab, ${key}, arrows, Escape and navigation (session fixture)`, async ({ page }) => {
    const user = {
      id: 901, nickname: 'Keyboard fixture', role: 'USER',
      status: 'ACTIVE', email: 'fixture@example.invalid',
      rating: 0, transactionCount: 0,
    }
    const unexpectedRequests: string[] = []
    const pageErrors: string[] = []
    page.on('pageerror', error => pageErrors.push(error.name))

    await routeApiFixture(
      page,
      route => {
        const request = route.request()
        const path = new URL(request.url()).pathname

        if (path === '/auth/browser-session' && request.method() === 'POST') {
          return route.fulfill({
            json: { data: { accessToken: 'fixture-not-real', expiresIn: 600, user } },
          })
        }
        if (path === '/notifications' && request.method() === 'GET') {
          return route.fulfill({ json: { data: [] } })
        }
        if (path === '/products/mine' && request.method() === 'GET') {
          return route.fulfill({
            json: { data: {
              items: [],
              pagination: { page: 1, pageSize: 12, total: 0 },
            } },
          })
        }

        unexpectedRequests.push(`${request.method()} ${path}`)
        return route.fulfill({
          status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' },
        })
      },
    )

    await page.goto('/publish')
    await expect(page.getByLabel('商品名称', { exact: true })).toBeVisible()

    const trigger = page.getByRole('button', {
      name: '账号菜单：Keyboard fixture', exact: true,
    })
    const item = (name: string) => page.getByRole('menuitem', { name, exact: true })

    await page.locator('#main-content').focus()
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).toBeFocused()

    await page.keyboard.press(key)
    await expect(item('个人中心')).toBeFocused()

    for (const name of ['我的发布', '我的收藏', '我的举报', '退出登录']) {
      await page.keyboard.press('ArrowDown')
      await expect(item(name)).toBeFocused()
    }
    await page.keyboard.press('ArrowUp')
    await expect(item('我的举报')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(item('个人中心')).toBeHidden()
    await expect(trigger).toBeFocused()

    await page.keyboard.press(key)
    // Reopening may retain the previously active item.
    const accountMenu = page.getByRole('menu').filter({ has: item('个人中心') })
    await expect(accountMenu).toBeVisible()
    await expect.poll(() =>
      accountMenu.getByRole('menuitem').evaluateAll(items =>
        items.some(element => element.contains(document.activeElement)),
      ),
    ).toBe(true)

    await page.keyboard.press('Home')
    await expect(item('个人中心')).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(item('我的发布')).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/my-products$/)
    await expect(page.getByRole('heading', { name: '我的发布', exact: true })).toBeVisible()
    await expect(page.locator('#main-content')).toBeFocused()
    expect(unexpectedRequests).toEqual([])
    expect(pageErrors).toEqual([])
  })
}
