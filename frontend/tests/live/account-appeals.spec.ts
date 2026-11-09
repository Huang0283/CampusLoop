import { test, expect } from './fixtures'
import { routeApiFixture } from '../api-fixture'
import { adminDashboardFixture } from '../admin-dashboard-fixture'
import type { AccountAppealRecord, AccountDecisionRecord } from '../../src/sdk'

const user = { id: 501, nickname: '申诉同学', role: 'USER', status: 'ACTIVE', email: 'appeal@example.invalid', avatar: null, rating: 0, transactionCount: 0 }
const now = '2026-11-04T08:00:00Z'
const initial: AccountDecisionRecord = { id: 701, userId: user.id, action: 'WARNING', reason: '商品信息违规', facts: '发布信息与商品不符', basis: '平台商品信息规则', occurredAt: now, createdAt: now, reference: null, evidence: [], revokedAt: null, revocationReason: null, appeal: null }

test('account evidence stays visible while copied thumbnail and repeated preview URLs expire', async ({ page }) => {
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYPjPwMDAxMDAwMDAAAALHwEDmIWXfgAAAABJRU5ErkJggg==', 'base64')
  const decision = { ...initial, evidence: ['private/evidence-fixture'] }
  await routeApiFixture(page, route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const reply = (data: unknown) => route.fulfill({ json: { data } })
    if (path === '/auth/browser-session') return reply({ accessToken: 'evidence-fixture', expiresIn: 600, user })
    if (path === '/notifications') return reply([])
    if (path === '/account/decisions') return reply({ items: [decision], pagination: { page: 1, pageSize: 10, total: 1 } })
    if (path === '/account/decisions/701') return reply(decision)
    if (path === '/account/decisions/701/evidence/0') {
      expect(request.headers().authorization).toBe('Bearer evidence-fixture')
      return route.fulfill({ contentType: 'image/png', body: image })
    }
    return route.fulfill({ status: 404 })
  })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/account/decisions/701')
    const thumbnail = page.getByRole('img', { name: '处理或申诉证据', exact: true })
    await expect.poll(() => thumbnail.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(2)
    for (let attempt = 0; attempt < 2; attempt++) {
      await thumbnail.click()
      const preview = page.getByRole('dialog', { name: '处理或申诉证据', exact: true })
      await expect.poll(() => preview.locator('img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(2)
      const copied = (await preview.locator('img').getAttribute('src'))!
      expect(await page.evaluate(async url => { try { await fetch(url); return true } catch { return false } }, copied)).toBe(false)
      await page.keyboard.press('Escape')
      await expect(preview).not.toBeVisible()
    }
  }
})

test('ordinary account records renew an expired login session (contract fixture)', async ({ page }) => {
  let sessions = 0
  const unexpected: string[] = []
  await routeApiFixture(page, route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (path === '/auth/browser-session') {
      sessions += 1
      return route.fulfill({ json: { data: { accessToken: sessions === 1 ? 'expired-login' : 'renewed-login', expiresIn: 600, user } } })
    }
    if (path === '/notifications') return route.fulfill({ json: { data: [] } })
    if (path === '/account/decisions') {
      if (request.headers().authorization === 'Bearer expired-login') return route.fulfill({ status: 401, json: { code: 'AUTH_ACCESS_EXPIRED' } })
      expect(request.headers().authorization).toBe('Bearer renewed-login')
      return route.fulfill({ json: { data: { items: [initial], pagination: { page: 1, pageSize: 10, total: 1 } } } })
    }
    unexpected.push(`${request.method()} ${path}`)
    return route.fulfill({ status: 501 })
  })
  await page.goto('/account/decisions')
  await expect(page.getByRole('heading', { name: '账号处理记录', exact: true })).toBeVisible()
  await expect(page.getByText('商品信息违规', { exact: true })).toBeVisible()
  expect(sessions).toBe(2)
  expect(unexpected).toEqual([])
})

for (const width of [1440, 390]) {
  test(`warning notification, appeal and admin review survive reload at ${width}px (contract fixture)`, async ({ page }) => {
    let role = 'USER', noticeRead = false
    const decision = { ...initial }
    let appeal: AccountAppealRecord | null = null
    const unexpected: string[] = [], writes: string[] = []
    const pagination = { page: 1, pageSize: 20, total: 1 }
    const record = () => ({ appeal, decision: { ...decision, appeal }, user })
    await routeApiFixture(page, route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname
      const reply = (data: unknown) => route.fulfill({ json: { data } })
      if (path === '/auth/browser-session') return reply({ accessToken: 'appeal-ui-fixture', expiresIn: 600, user: { ...user, role } })
      if (path === '/display-translation/translate') return route.fulfill({ json: { translations: request.postDataJSON().texts.map(() => 'Evidence and explanation') } })
      if (path === '/notifications' && request.method() === 'GET') return reply([{ id: 901, type: role === 'ADMIN' ? 'APPEAL_RECEIVED' : 'ACCOUNT_ACTION', title: role === 'ADMIN' ? '收到账号申诉' : '账号违规警告', content: '商品信息违规', link: role === 'ADMIN' ? '/admin/appeals?appeal=801' : '/account/decisions/701', read: noticeRead, createdAt: now }])
      if (path === '/reports/mine') return reply([])
      if (/^\/notifications\/\d+\/read$/.test(path)) { noticeRead = true; return route.fulfill({ status: 204 }) }
      if (path === '/account/decisions') return reply({ items: [{ ...decision, appeal }], pagination })
      if (path === '/account/decisions/701') return reply({ ...decision, appeal })
      if (path === '/account/decisions/701/appeal') {
        writes.push(path)
        expect(request.postDataJSON()).toEqual({ explanation: '商品描述已经更正，请重新核实。', evidence: [] })
        appeal = { id: 801, decisionId: 701, explanation: request.postDataJSON().explanation, status: 'PENDING', evidence: [], createdAt: now, reviewedAt: null, reviewReason: null }
        return reply(appeal)
      }
      if (path === '/admin/dashboard') return reply(adminDashboardFixture)
      if (path === '/admin/appeals') return reply({ items: [record()], pagination })
      if (path === '/admin/appeals/801') return reply(record())
      if (path === '/admin/appeals/801/review') {
        writes.push(path)
        expect(request.postDataJSON()).toEqual({ outcome: 'REVOKED', reason: '已核实，撤销本次警告。' })
        appeal = { ...appeal!, status: 'REVOKED', reviewedAt: now, reviewReason: request.postDataJSON().reason }
        decision.revokedAt = now; decision.revocationReason = appeal.reviewReason
        return reply(record())
      }
      unexpected.push(`${request.method()} ${path}`)
      return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
    })
    await page.setViewportSize({ width, height: 960 })
    await page.goto('/notifications')
    await expect(page.locator('.app-notification-bell .ant-badge-count')).toHaveText('1')
    await page.getByRole('button', { name: /^查\s*看$/ }).click()
    await expect(page).toHaveURL(/\/account\/decisions\/701$/)
    await expect(page.getByText('发布信息与商品不符', { exact: true })).toBeVisible()
    await page.getByLabel('申诉说明', { exact: true }).fill('商品描述已经更正，请重新核实。')
    await page.getByRole('button', { name: '提交申诉', exact: true }).click()
    await expect(page.getByText('待复核', { exact: true })).toBeVisible()
    if (process.env.CAMPUSLOOP_APPEAL_SCREENSHOTS === '1') await page.screenshot({ path: `../.codex-tmp/moderation-appeals/student-${width}.png`, fullPage: true })
    await page.reload()
    await expect(page.getByRole('button', { name: '提交申诉', exact: true })).toHaveCount(0)
    await expect(page.getByText('待复核', { exact: true })).toBeVisible()
    role = 'ADMIN'; noticeRead = false
    await page.goto('/admin/notifications')
    await expect(page.locator('.adm-top .ant-badge-count')).toHaveText('1')
    await page.getByRole('button', { name: /^查\s*看$/ }).click()
    const dialog = page.getByRole('dialog', { name: '账号申诉复核', exact: true })
    await expect(dialog.getByText('商品描述已经更正，请重新核实。', { exact: true })).toBeVisible()
    await dialog.getByLabel('复核结论', { exact: true }).click()
    await page.getByRole('option', { name: '撤销原处理', exact: true }).click()
    await dialog.getByLabel('复核说明', { exact: true }).fill('已核实，撤销本次警告。')
    if (process.env.CAMPUSLOOP_APPEAL_SCREENSHOTS === '1') {
      await dialog.evaluate(element => element.querySelector('.ant-modal-body')?.scrollTo(0, 0))
      await page.screenshot({ path: `../.codex-tmp/moderation-appeals/admin-${width}.png`, fullPage: true })
    }
    await dialog.getByRole('button', { name: '确认复核并通知用户', exact: true }).click()
    await expect(dialog.getByText('已撤销原处理', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: '关闭', exact: true }).click()
    role = 'USER'
    await page.goto('/account/decisions/701')
    await expect(page.getByText('已撤销原处理', { exact: true })).toBeVisible()
    await page.getByLabel('界面语言', { exact: true }).click()
    await page.getByRole('option', { name: 'English', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Account decisions', exact: true })).toBeVisible()
    await expect(page.getByText('Original decision revoked', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(writes).toEqual(['/account/decisions/701/appeal', '/admin/appeals/801/review'])
    expect(unexpected).toEqual([])
  })

  test(`disabled login has only return and appeal actions at ${width}px (contract fixture)`, async ({ page }) => {
    const unexpected: string[] = []
    await routeApiFixture(page, route => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (path === '/auth/browser-session') return route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
      if (path === '/auth/login') return route.fulfill({ status: 423, json: { code: 'ACCOUNT_DISABLED', details: { appealToken: 'appeal-only-fixture', expiresIn: 900 } } })
      if (path === '/account/decisions' || path === '/account/decisions/701') {
        expect(request.headers().authorization).toBe('Bearer appeal-only-fixture')
        const decision = { ...initial, action: 'DISABLE' }
        return route.fulfill({ json: { data: path.endsWith('/701') ? decision : { items: [decision], pagination: { page: 1, pageSize: 10, total: 1 } } } })
      }
      if (path === '/auth/logout') return route.fulfill({ status: 204 })
      unexpected.push(`${request.method()} ${path}`)
      return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
    })
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/login')
    await page.getByLabel('校园邮箱', { exact: true }).fill(user.email)
    await page.getByLabel('密码', { exact: true }).fill('fixture-only')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '账号已被禁用', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button')).toHaveCount(2)
    await expect(dialog).toContainText('商品信息违规')
    if (process.env.CAMPUSLOOP_APPEAL_SCREENSHOTS === '1') await page.screenshot({ path: `../.codex-tmp/moderation-appeals/disabled-${width}.png`, fullPage: true, animations: 'disabled' })
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: '申诉', exact: true }).click()
    await page.getByRole('link', { name: '查看详情与申诉', exact: true }).click()
    await expect(page.getByRole('button', { name: '提交申诉', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '返回登录', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/account/decisions')
    await expect(page).toHaveURL(/\/login$/)
    expect(unexpected).toEqual([])
  })
}
