import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const frontend = process.argv[2]
if (!frontend) throw new Error('Usage: node rehearse_degraded.mjs <candidate/frontend>')
const site = process.env.CAMPUSLOOP_UI_URL
if (site !== 'http://127.0.0.1:5195') throw new Error('This audit requires the dedicated 5195 site')
const baseline = JSON.parse(execFileSync('docker', ['inspect', 'campusloop-mq5-audit-baseline-1']))[0]
if (baseline.Config.Labels['com.docker.compose.project'] !== 'campusloop-mq5-audit' || baseline.State.Running) {
  throw new Error('The independent audit baseline must be stopped')
}
const { chromium, expect } = await import(pathToFileURL(resolve(frontend, 'node_modules/@playwright/test/index.mjs')))
const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()
const failures = []
page.on('pageerror', error => failures.push(error.name))
const started = Date.now()
try {
  await page.goto(site + '/market?query=book&searchMode=semantic')
  await expect(page.getByText('搜索正在使用关键词降级结果', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '校园市场', exact: true })).toBeVisible()
  await page.goto(site + '/register')
  await page.getByLabel('校园邮箱', { exact: true }).fill(`mq5-${randomUUID()}@example.invalid`)
  await page.getByLabel('昵称', { exact: true }).fill('Degradation rehearsal')
  await page.getByLabel('密码', { exact: true }).fill('Valid@12345')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await expect(page).toHaveURL(/\/market$/)
  await page.goto(site + '/publish/price-advice')
  await page.getByLabel('原价（元）', { exact: true }).fill('100')
  const response = page.waitForResponse(r => r.url().includes('/price-advice') && r.request().method() === 'POST')
  await page.getByRole('button', { name: '计算区间', exact: true }).click()
  const result = await response
  const body = await result.json()
  expect(body.data.status).toBe('UNAVAILABLE')
  expect(body.data.degraded).toBe(true)
  await expect(page.getByText('暂不可用，请手动定价', { exact: true })).toBeVisible()
  await expect(page.getByText(/规则参考区间：¥/)).toHaveCount(0)
  expect(failures).toEqual([])
  console.log(JSON.stringify({ status: 'PASS', site, baselineStopped: true,
    keywordRecovery: true, priceStatus: body.data.status, noInventedPrice: true,
    elapsedSeconds: (Date.now() - started) / 1000, pageErrors: failures }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
