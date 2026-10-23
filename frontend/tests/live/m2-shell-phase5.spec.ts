import { test, expect, type Page } from '@playwright/test'

const user = {
  id: 901, nickname: 'Shell fixture', role: 'USER', status: 'ACTIVE',
  email: 'fixture@example.invalid', rating: 0, transactionCount: 0,
  avatar: null, bio: null, school: null, college: null, major: null,
}
const auth = { accessToken: 'fixture-not-real', expiresIn: 600, user }

async function installSessionFixture(page: Page, unavailable = false) {
  const state = {
    signedIn: false, unavailable, restores: 0, profileReads: 0,
    unexpected: [] as string[], pageErrors: [] as string[],
  }
  page.on('pageerror', error => state.pageErrors.push(error.name))

  await page.route(url => url.origin === 'http://localhost:8001', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()

    if (path === '/auth/browser-session' && method === 'POST') {
      state.restores += 1
      if (state.unavailable) {
        return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
      }
      return state.signedIn
        ? route.fulfill({ json: { data: auth } })
        : route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
    }
    if (path === '/auth/login' && method === 'POST') {
      expect(request.headers()['x-campusloop-browser']).toBe('1')
      state.signedIn = true
      return route.fulfill({ json: { data: auth } })
    }
    if (path === '/users/me' && method === 'GET') {
      state.profileReads += 1
      expect(request.headers().authorization).toBe('Bearer fixture-not-real')
      return route.fulfill({ json: { data: user } })
    }
    if (path === '/notifications' && method === 'GET') {
      return route.fulfill({ json: { data: [] } })
    }

    state.unexpected.push(`${method} ${path}`)
    return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
  })
  return state
}

test('guest login returns to the protected deep link and preserves its query (session fixture)', async ({ page }) => {
  const state = await installSessionFixture(page)

  await page.goto('/profile?tab=saved&source=p5')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('校园邮箱', { exact: true })).toBeVisible()
  expect(state.profileReads).toBe(0)

  await page.getByLabel('校园邮箱', { exact: true }).fill(user.email)
  await page.getByLabel('密码', { exact: true }).fill('Fixture@12345')
  await page.locator('form button[type="submit"]').click()

  await expect(page).toHaveURL(/\/profile\?tab=saved&source=p5$/)
  await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
  await expect(page.getByRole('main')).toBeFocused()

  await page.reload()
  await expect(page).toHaveURL(/\/profile\?tab=saved&source=p5$/)
  await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
  expect(state.unexpected).toEqual([])
  expect(state.pageErrors).toEqual([])
})

test('session restoration failure can retry at the original deep link (session fixture)', async ({ page }) => {
  const state = await installSessionFixture(page, true)

  await page.goto('/profile?source=p5-recovery')
  await expect(page.getByText('暂时无法恢复登录，请检查网络后重试。', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/profile\?source=p5-recovery$/)
  expect(state.profileReads).toBe(0)

  const previousRestores = state.restores
  state.unavailable = false
  state.signedIn = true
  await page.getByRole('button', { name: '重试恢复', exact: true }).click()

  await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/profile\?source=p5-recovery$/)
  await expect(page.getByRole('main')).toBeFocused()
  expect(state.restores).toBeGreaterThan(previousRestores)
  expect(state.unexpected).toEqual([])
  expect(state.pageErrors).toEqual([])
})
