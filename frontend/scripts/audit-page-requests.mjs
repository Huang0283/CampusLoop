import process from 'node:process'
import { chromium } from '@playwright/test'

const baseURL = process.env.CAMPUSLOOP_UI_URL || 'http://localhost:5173'
const apiOrigin = new URL(process.env.VITE_API_BASE_URL || 'http://localhost:8001').origin
const browser = await chromium.launch()
const screens = [
  ['/market', 'USER', 2000],
  ['/login', 'USER', 2000],
  ['/publish', 'USER', 2000],
  ['/transactions', 'USER', 2000],
  ['/notifications', 'USER', 6500],
  ['/admin', 'ADMIN', 2000],
]

console.log('Contract fixtures; fresh context per page; no real API writes.')
console.log('Request times are seconds since navigation; polling is included.')

try {
  for (const [path, role, observationMs] of screens) {
    const context = await browser.newContext()
    const requests = []
    const errors = []
    const unexpected = []
    const user = {
      id: 501, nickname: 'Request fixture', role, status: 'ACTIVE',
      email: 'request@example.invalid', avatar: null,
      rating: 0, transactionCount: 0,
    }
    const emptyPage = {
      items: [],
      pagination: { page: 1, pageSize: 12, total: 0 },
    }
    let started = Date.now()

    try {
      await context.route('**/*', async route => {
        const request = route.request()
        if (!['fetch', 'xhr'].includes(request.resourceType())) {
          return route.continue()
        }
        const url = new URL(request.url())
        const method = request.method()
        const key = `${method} ${url.pathname}${url.search}`
        requests.push({
          key,
          seconds: Number(((Date.now() - started) / 1000).toFixed(3)),
        })

        if (url.origin !== apiOrigin) {
          unexpected.push(`Unexpected origin: ${url.origin}`)
          return route.abort()
        }
        if (method === 'OPTIONS') return route.fulfill({ status: 204 })

        let data
        if (url.pathname === '/auth/browser-session' && method === 'POST') {
          data = { accessToken: 'fixture-not-real', expiresIn: 600, user }
        } else if (method === 'GET') {
          if (['/notifications', '/reports/mine'].includes(url.pathname)) {
            data = []
          } else if (['/products', '/orders', '/admin/users'].includes(url.pathname)) {
            data = emptyPage
          } else if (url.pathname === '/users/me') {
            data = user
          }
        }

        if (data === undefined) {
          unexpected.push(key)
          return route.fulfill({
            status: 501,
            json: { code: 'AUDIT_UNEXPECTED_REQUEST', message: key },
          })
        }
        return route.fulfill({ json: { code: 0, message: 'ok', data } })
      })

      const page = await context.newPage()
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
      page.on('console', message => {
        if (['error', 'warning'].includes(message.type())) {
          errors.push(`console.${message.type()}: ${message.text()}`)
        }
      })
      started = Date.now()
      await page.goto(new URL(path, baseURL).href)
      await page.locator('h1').first().waitFor({ timeout: 15000 })

      // Deliberate sampling window; notifications includes the first poll.
      await page.waitForTimeout(observationMs)

      console.log(`\nPAGE ${path} ROLE ${role}`)
      console.log('Heading:', await page.locator('h1').first().innerText())
      const grouped = new Map()
      for (const request of requests) {
        if (!grouped.has(request.key)) grouped.set(request.key, [])
        grouped.get(request.key).push(request.seconds)
      }
      console.table([...grouped].map(([request, times]) => ({
        request,
        count: times.length,
        seconds: times.join(', '),
      })))
      console.log('Console/page diagnostics:', JSON.stringify(errors))
      console.log('Unexpected API requests:', JSON.stringify(unexpected))
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
}
