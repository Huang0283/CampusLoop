import { test, expect } from '@playwright/test'
import { routeApiFixture } from '../api-fixture'

test('empty next report page keeps a working previous-page action (contract fixture)', async ({ page }) => {
  const unexpected: string[] = []
  const user = {
    id: 501, nickname: 'Report fixture', role: 'USER', status: 'ACTIVE',
    email: 'reports@example.invalid', rating: 0, transactionCount: 0,
  }
  const reports = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1, targetType: 'USER', targetId: 601, reason: 'SPAM',
    description: `Pagination report ${index + 1}`, status: 'PENDING',
    createdAt: '2030-01-01T10:00:00Z', handledAt: null, resolutionNote: null,
  }))
  await routeApiFixture(page, route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/auth/browser-session' && request.method() === 'POST') {
      return route.fulfill({ json: { data: { accessToken: 'fixture-not-real', expiresIn: 600, user } } })
    }
    if (url.pathname === '/notifications' && request.method() === 'GET') {
      return route.fulfill({ json: { data: [] } })
    }
    if (url.pathname === '/reports/mine' && request.method() === 'GET') {
      return route.fulfill({ json: { data: url.searchParams.get('page') === '1' ? reports : [] } })
    }
    unexpected.push(`${request.method()} ${url.pathname}`)
    return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
  })

  await page.goto('/report')
  const previous = page.getByRole('button', { name: '上一页', exact: true })
  const next = page.getByRole('button', { name: '下一页', exact: true })
  await expect(page.getByText('Pagination report 1', { exact: true })).toBeVisible()
  await expect(previous).toBeDisabled()
  await next.click()
  await expect(page.getByText('暂无内容。', { exact: true })).toBeVisible()
  await expect(page.getByText('第 2 页', { exact: true })).toBeVisible()
  await expect(previous).toBeEnabled()
  await expect(next).toBeDisabled()
  await previous.click()
  await expect(page.getByText('Pagination report 1', { exact: true })).toBeVisible()
  await expect(page.getByText('第 1 页', { exact: true })).toBeVisible()
  await expect(previous).toBeDisabled()
  expect(unexpected).toEqual([])
})
