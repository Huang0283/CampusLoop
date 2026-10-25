import { test, expect, type FileChooser } from '@playwright/test'
import { routeApiFixture } from '../api-fixture'

for (const key of ['Enter', 'Space']) {
  test(`image upload supports Tab and ${key} without submitting the form (session fixture)`, async ({ page }) => {
    const user = {
      id: 901,
      nickname: 'Keyboard fixture',
      role: 'USER',
      status: 'ACTIVE',
      email: 'fixture@example.invalid',
    }

    const unexpected: string[] = []
    await routeApiFixture(page, route => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (path === '/auth/browser-session' && request.method() === 'POST') {
        return route.fulfill({ json: { data: { accessToken: 'fixture-not-real', expiresIn: 600, user } } })
      }
      if (path === '/notifications' && request.method() === 'GET') {
        return route.fulfill({ json: { data: [] } })
      }
      unexpected.push(`${request.method()} ${path}`)
      return route.fulfill({ status: 501, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
    })
    // 在页面加载前注册监听，避免紧挨按键操作才启动文件框拦截。
    const fileChoosers: FileChooser[] = []
    page.on('filechooser', chooser => {
      fileChoosers.push(chooser)
    })
    await page.goto('/publish')
    await page.getByLabel('商品名称', { exact: true }).focus()
    await page.keyboard.press('Tab')

    const uploadButton = page.getByRole('button', { name: /上传图片/ })
    await expect(uploadButton).toBeFocused()

    // 不打开文件框时，验证上传按钮前后的键盘导航。
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('分类', { exact: true })).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    await expect(uploadButton).toBeFocused()

    // 验证 Enter / Space 能打开文件选择框。
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.keyboard.press(key),
    ])
    await chooser.setFiles([])
    expect(fileChoosers).toHaveLength(1)
    expect(fileChoosers[0]).toBe(chooser)

    await expect(page).toHaveURL(/\/publish$/)
    await expect(page.locator('.ant-form-item-explain-error')).toHaveCount(0)
    expect(unexpected).toEqual([])
  })
}
