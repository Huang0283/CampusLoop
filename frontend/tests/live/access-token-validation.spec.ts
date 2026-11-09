import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'

const user = { id: 501, nickname: '会话测试同学', role: 'USER', status: 'ACTIVE', email: 'session@example.invalid', avatar: null, rating: 0, transactionCount: 0, bio: null }

for (const width of [1440, 390]) {
  for (const scenario of ['expired', 'forged', 'revoked-cookie'] as const) {
    test(`${scenario} credentials at ${width}px renew only verified expiry (contract fixture)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      let sessions = 0, profiles = 0
      const unexpected: string[] = []
      await routeApiFixture(page, route => {
        const request = route.request(), path = new URL(request.url()).pathname
        if (path === '/auth/browser-session') {
          sessions += 1
          if (sessions > 1 && scenario === 'revoked-cookie') return route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
          return route.fulfill({ json: { data: { accessToken: sessions === 1 ? 'old-session' : 'renewed-session', expiresIn: 600, user } } })
        }
        if (path === '/notifications') return route.fulfill({ json: { data: [] } })
        if (path === '/users/me') {
          profiles += 1
          if (request.headers().authorization === 'Bearer renewed-session') return route.fulfill({ json: { data: user } })
          return route.fulfill({ status: 401, json: { code: scenario === 'forged' ? 'AUTH_UNAUTHORIZED' : 'AUTH_ACCESS_EXPIRED' } })
        }
        unexpected.push(`${request.method()} ${path}`)
        return route.fulfill({ status: 501 })
      })
      await page.goto('/profile')
      if (scenario === 'expired') {
        await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: '保存资料', exact: true })).toBeVisible()
        expect(profiles).toBe(2)
      } else {
        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByRole('heading', { name: '欢迎回来', exact: true })).toBeVisible()
        expect(profiles).toBe(1)
      }
      expect(sessions).toBe(scenario === 'forged' ? 1 : 2)
      expect(unexpected).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
}

test('an explicit foreign credential cannot be renewed with the current login cookie (contract fixture)', async ({ page }) => {
  let sessions = 0, profiles = 0
  await routeApiFixture(page, route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/browser-session') {
      sessions += 1
      return route.fulfill({ json: { data: { accessToken: 'current-session', expiresIn: 600, user } } })
    }
    if (path === '/account/decisions') return route.fulfill({ json: { data: { items: [], pagination: { page: 1, pageSize: 10, total: 0 } } } })
    if (path === '/notifications') return route.fulfill({ json: { data: [] } })
    if (path === '/users/me') {
      profiles += 1
      return route.fulfill({ status: 401, json: { code: 'AUTH_ACCESS_EXPIRED' } })
    }
    return route.fulfill({ status: 501 })
  })
  await page.goto('/account/decisions')
  await expect(page.getByRole('heading', { name: '账号处理记录', exact: true })).toBeVisible()
  const result = await page.evaluate(async () => {
    const modulePath = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/sdk/index.ts')!.name
    const sdk = await import(/* @vite-ignore */ modulePath)
    try {
      await sdk.getCurrentUser({ auth: () => 'another-session' })
      return 'unexpected-success'
    } catch (error) { return (error as { code: string }).code }
  })
  expect(result).toBe('AUTH_ACCESS_EXPIRED')
  expect(profiles).toBe(1)
  expect(sessions).toBe(1)
})

test('parallel expired requests share one renewal (contract fixture)', async ({ page }) => {
  let sessions = 0, profiles = 0
  let release: (() => void) | undefined
  const bothExpired = new Promise<void>(resolve => { release = resolve })
  await routeApiFixture(page, async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (path === '/auth/browser-session') {
      sessions += 1
      return route.fulfill({ json: { data: { accessToken: sessions === 1 ? 'old-session' : 'renewed-session', expiresIn: 600, user } } })
    }
    if (path === '/notifications') return route.fulfill({ json: { data: [] } })
    if (path === '/account/decisions') return route.fulfill({ json: { data: { items: [], pagination: { page: 1, pageSize: 10, total: 0 } } } })
    if (path === '/users/me') {
      profiles += 1
      if (request.headers().authorization === 'Bearer renewed-session') return route.fulfill({ json: { data: user } })
      if (profiles === 2) release?.()
      await bothExpired
      return route.fulfill({ status: 401, json: { code: 'AUTH_ACCESS_EXPIRED' } })
    }
    return route.fulfill({ status: 501 })
  })
  await page.goto('/account/decisions')
  await expect(page.getByRole('heading', { name: '账号处理记录', exact: true })).toBeVisible()
  const ids = await page.evaluate(async () => {
    const modulePath = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/sdk/index.ts')!.name
    const sdk = await import(/* @vite-ignore */ modulePath)
    const results = await Promise.all([sdk.getCurrentUser(), sdk.getCurrentUser()])
    return results.map(result => result.data.id)
  })
  expect(ids).toEqual([user.id, user.id])
  expect(sessions).toBe(2)
  expect(profiles).toBe(4)
})
