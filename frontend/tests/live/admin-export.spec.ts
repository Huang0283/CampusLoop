import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import { readFile } from 'node:fs/promises'
import { adminDashboardFixture as dashboard } from '../admin-dashboard-fixture'

for (const language of ['zh', 'en'] as const) {
  test(`admin exports formatted reports and preserves original values in ${language}`, async ({ page }) => {
    await page.addInitScript(language => localStorage.setItem('campusloop-language', language), language)
    const user = { id: 501, nickname: '管理员', email: 'export@example.invalid', role: 'ADMIN', status: 'ACTIVE', rating: 0, transactionCount: 0 }
    const product = { id: 601, title: '=1+1', description: '', images: [], category: 'DIGITAL', condition: 'GOOD', campusLocation: '校内', price: 95, status: 'SOLD', seller: user }
    const order = { id: 6024, product, buyer: user, seller: user, amount: 95, status: 'COMPLETED', createdAt: dashboard.asOf, updatedAt: dashboard.asOf, buyerConfirmedComplete: true, sellerConfirmedComplete: true }
    const searches: string[] = []
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url())
      if (!['xhr', 'fetch'].includes(req.resourceType())) return route.continue()
      if (url.pathname === '/auth/browser-session') return route.fulfill({ json: { data: { accessToken: 'export-fixture', expiresIn: 600, user } } })
      if (url.pathname === '/admin/dashboard') return route.fulfill({ json: { data: dashboard } })
      if (url.pathname === '/admin/orders') {
        searches.push(url.searchParams.get('query') ?? '')
        return route.fulfill({ json: { data: { items: [order], pagination: { page: 1, pageSize: 100, total: 1 } } } })
      }
      if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
      if (url.pathname === '/display-translation/translate') return route.fulfill({ json: { translations: req.postDataJSON().texts } })
      return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
    })
    await page.goto('/admin')
    const excelName = language === 'zh' ? '导出 Excel' : 'Export Excel'
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: excelName, exact: true }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.xlsx$/)
    const book = new ExcelJS.Workbook()
    await book.xlsx.readFile((await file.path())!)
    const overview = book.worksheets[0]
    expect(book.worksheets).toHaveLength(1)
    expect(overview.getCell('A5').value).toBe(language === 'zh' ? '在售商品（与市场列表一致）' : 'On sale (same as marketplace)')
    expect(overview.getCell('D5').value).toBe(dashboard.products.onSale)
    expect(overview.getCell('A14').value).toEqual(new Date('2030-01-01T00:00:00Z'))
    expect(overview.getCell('A14').numFmt).toBe('yyyy-mm-dd')
    expect(overview.getCell('B14').value).toBe(dashboard.trend[0].newProducts)
    expect(overview.getColumn(1).width).toBeGreaterThanOrEqual(30)
    expect(overview.views[0].showGridLines).toBe(false)
    expect(overview.getCell('A13').font.bold).toBe(true)
    expect(overview.getCell('A2').value).toContain(language === 'zh' ? '北京时间' : 'Beijing time')
    await expect(page.getByRole('button', { name: language === 'zh' ? '其他导出格式' : 'Other export formats' })).toHaveCount(0)

    await page.goto('/admin/orders')
    await page.getByLabel(language === 'zh' ? '搜索订单' : 'Search orders', { exact: true }).fill('6')
    await expect.poll(() => searches.at(-1)).toBe('6')
    const ordersDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: excelName, exact: true }).click()
    const ordersFile = await ordersDownload
    const ordersBook = new ExcelJS.Workbook()
    await ordersBook.xlsx.readFile((await ordersFile.path())!)
    const orders = ordersBook.worksheets[0]
    expect(orders.getCell('A5').value).toBe(6024)
    expect(orders.getCell('B5').value).toBe('=1+1')
    expect(orders.getCell('B5').type).toBe(ExcelJS.ValueType.String)
    expect(orders.getCell('F5').value).toBe(95)
    expect(orders.getCell('F5').numFmt).toContain('0.00')
    expect(orders.getColumn(2).width).toBeGreaterThanOrEqual(40)
    expect(orders.getCell('A2').value).toContain('6')
    expect(searches.at(-1)).toBe('6')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: language === 'zh' ? '其他导出格式' : 'Other export formats' }).click()
    const csvDownload = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: language === 'zh' ? '导出 CSV' : 'Export CSV', exact: true }).click()
    const csv = await csvDownload
    expect(csv.suggestedFilename()).toMatch(/\.csv$/)
    expect(await readFile((await csv.path())!, 'utf8')).toContain('=1+1')
  })
}
