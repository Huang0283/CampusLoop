import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { test, expect } from './fixtures'

// Signing is confined to a dedicated audit API; no daily credentials or data are used.
const audit = process.env.CAMPUSLOOP_TEST_API_CONTAINER
for (const width of [1440, 390]) {
  for (const scenario of ['expired', 'forged', 'logout'] as const) {
    test(`real API ${scenario} credential at ${width}px`, async ({ page, context }) => {
      test.skip(!audit, 'Requires a dedicated audit API container')
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/register')
      await page.getByLabel('校园邮箱', { exact: true }).fill(`token-${randomUUID()}@example.invalid`)
      await page.getByLabel('昵称', { exact: true }).fill('真实会话测试')
      await page.getByLabel('密码', { exact: true }).fill('Valid@12345')
      const registered = page.waitForResponse(response => new URL(response.url()).pathname === '/auth/register' && response.status() === 201)
      await page.getByRole('button', { name: '注册并登录', exact: true }).click()
      await expect(page).toHaveURL(/\/market$/)
      const registration = await registered
      const api = new URL(registration.url()).origin
      let token: string = (await registration.json()).data.accessToken
      if (scenario === 'expired') {
        token = execFileSync('docker', ['exec', '-i', audit!, 'python', '-c', `
import sys
from urllib.parse import urlsplit
import jwt
from app.core.config import get_settings
from app.core.security import decode_access, signing_key, utcnow
s = get_settings()
assert s.app_env in ('test', 'ci') and 'audit' in s.database_url
assert urlsplit(s.redis_url).path in ('/14', '/15')
claims = decode_access(sys.stdin.read())
now = int(utcnow().timestamp())
claims.update(iat=now-60, exp=now-1)
print(jwt.encode(claims, signing_key(), algorithm='HS256', headers={'kid': s.auth_signing_kid}))
`], { input: token, encoding: 'utf8', timeout: 10000 }).trim()
      } else if (scenario === 'forged') {
        const parts = token.split('.')
        parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1)
        token = parts.join('.')
      } else {
        const result = await context.request.post(api + '/auth/logout', { headers: { Origin: new URL(page.url()).origin, 'X-CampusLoop-Browser': '1' } })
        expect(result.status()).toBe(204)
      }
      await page.route('**/users/me', route => route.continue({ headers: { ...route.request().headers(), authorization: 'Bearer ' + token } }), { times: 1 })
      let renewals = 0
      page.on('request', request => { if (new URL(request.url()).pathname === '/auth/browser-session') renewals += 1 })
      const denied = page.waitForResponse(response => new URL(response.url()).pathname === '/users/me' && response.status() === 401)
      await page.getByRole('button', { name: '账号菜单：真实会话测试', exact: true }).hover()
      await page.getByRole('menuitem', { name: '个人中心', exact: true }).click()
      const response = await denied
      expect((await response.json()).code).toBe(scenario === 'expired' ? 'AUTH_ACCESS_EXPIRED' : 'AUTH_UNAUTHORIZED')
      if (scenario === 'expired') {
        await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: '保存资料', exact: true })).toBeVisible()
        expect(renewals).toBe(1)
        await page.reload()
        await expect(page.getByRole('heading', { name: '个人资料', exact: true })).toBeVisible()
      } else {
        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByRole('heading', { name: '欢迎回来', exact: true })).toBeVisible()
        expect(renewals).toBe(0)
        if (scenario === 'logout') {
          await page.reload()
          await expect(page.getByRole('heading', { name: '欢迎回来', exact: true })).toBeVisible()
        }
      }
    })
  }
}
