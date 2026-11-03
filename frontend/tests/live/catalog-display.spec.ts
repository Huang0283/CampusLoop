import { test, expect } from './fixtures'

const picture = (width: number, height: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e8eef9"/><rect x="0" y="0" width="100%" height="12" fill="#f00"/><rect x="0" y="${height - 12}" width="100%" height="12" fill="#00f"/></svg>`)}`
const seller = { id: 502, nickname: 'Cosplay晚风 Report', avatar: null, rating: 0, transactionCount: 0 }
const titles = ['浅紫色缠花Cosplay发饰一组', '蓝金色Cosplay道具剑（柄部有瑕疵）', '捷安特 ATX660 山地车 26 寸 24 速', 'Report']
const products = titles.map((title, index) => ({ id: 601 + index, title, description: `Cosplay / ATX660 原文说明\n- 26 寸，24 速\n- 包含配件，¥520。`, images: [picture(400, 1600), picture(1600, 400), picture(800, 800)], seller, price: 49, category: 'other', condition: 'GOOD', campusLocation: '校内', status: 'ON_SALE', createdAt: '2026-10-30T10:00:00Z', updatedAt: '2026-10-30T10:00:00Z' }))

for (const width of [1440, 390]) {
  test(`catalog preserves source names and complete photos across languages at ${width}px`, async ({ page }) => {
    const translated: Array<{ target: string; texts: string[] }> = []
    await page.addInitScript(() => localStorage.setItem('campusloop-language', 'zh'))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue()
      if (url.pathname === '/auth/browser-session') return route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } })
      if (url.pathname === '/products') return route.fulfill({ json: { data: { items: products, pagination: { page: 1, pageSize: 12, total: 4 } } } })
      const product = products.find(item => url.pathname === `/products/${item.id}`)
      if (product) return route.fulfill({ json: { data: product } })
      if (url.pathname === '/display-translation/translate') {
        const body = request.postDataJSON()
        translated.push(body)
        return route.fulfill({ json: { translations: body.texts.map((text: string) => body.target === 'en' ? `Cosplay accessories: ${text.replace(/[\u3400-\u9fff]/gu, '')}` : text) } })
      }
      return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
    })
    await page.goto('/market')
    for (const title of titles) await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(page.locator('.catalog-seller').first()).toContainText(seller.nickname)
    await page.locator('.product-card').first().hover()
    const cardImage = page.locator('.product-photo img').first()
    await expect(cardImage).toHaveCSS('object-fit', 'contain')
    await expect(cardImage).toHaveCSS('transform', 'none')
    for (const item of products.slice(0, 3)) {
      await page.goto(`/product/${item.id}`)
      await expect(page.locator('.product-info h1')).toHaveText(item.title)
      await expect(page.locator('.product-description .ant-typography')).toHaveText(item.description)
      await expect(page.locator('.seller-card')).toContainText(seller.nickname)
    }
    for (let index = 0; index < 3; index++) {
      await page.getByRole('button', { name: `查看第 ${index + 1} 张图片`, exact: true }).click()
      const image = page.locator('.product-gallery-main img')
      await expect(image).toHaveAttribute('src', products[2].images[index])
      await expect(image).toHaveCSS('object-fit', 'contain')
      await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      const frame = await page.locator('.product-gallery-main').boundingBox()
      const bounds = await image.boundingBox()
      expect(bounds!.height).toBeLessThanOrEqual(frame!.height + 1)
      expect(bounds!.width).toBeLessThanOrEqual(frame!.width + 1)
      expect(bounds!.y).toBeGreaterThanOrEqual(frame!.y - 1)
      await expect(page.locator('.product-thumbnails img').nth(index)).toHaveCSS('object-fit', 'contain')
    }
    expect(translated.filter(body => body.target === 'zh').flatMap(body => body.texts).some(text => /[\u3400-\u9fff]/u.test(text))).toBe(false)
    await page.locator('.language-select').click()
    await page.getByRole('option', { name: 'English', exact: true }).click()
    await expect(page.locator('.product-info h1')).toContainText('Cosplay accessories:')
    await expect(page.locator('.seller-card')).toContainText(seller.nickname)
    await page.locator('.language-select').click()
    await page.getByRole('option', { name: '简体中文', exact: true }).click()
    await expect(page.locator('.product-info h1')).toHaveText(products[2].title)
    await expect(page.locator('.product-description .ant-typography')).toHaveText(products[2].description)
    await page.reload()
    await expect(page.locator('.product-info h1')).toHaveText(products[2].title)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
