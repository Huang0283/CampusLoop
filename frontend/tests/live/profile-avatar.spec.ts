import { test, expect, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const picture = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYPjPwMDAxMDAwMDAAAALHwEDmIWXfgAAAABJRU5ErkJggg==', 'base64')
const avatarUrl = 'http://localhost:8001/fixture-avatar.jpg'
async function setup(page: Page) {
  let profile = { id: 501, nickname: '头像同学', email: 'avatar-fixture@example.invalid', role: 'USER', status: 'ACTIVE', avatar: null as string | null, bio: '', school: '', college: '', major: '', transactionCount: 0, rating: 0, campusVerified: false }
  let guest = false, failUpload = false, failSave = false
  let release: (() => void) | undefined
  let gate: Promise<void> | undefined
  let uploads = 0, saves = 0
  await page.route('**/fixture-avatar.jpg', (route) => route.fulfill({ contentType: 'image/png', body: picture }))
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.fallback()
    const url = new URL(request.url())
    if (url.pathname === '/auth/browser-session') return guest ? route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } }) : route.fulfill({ json: { data: { accessToken: 'avatar-fixture-only', expiresIn: 600, user: profile } } })
    if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
    if (url.pathname === '/users/me') {
      if (request.method() === 'PATCH') {
        saves++
        if (failSave) return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' } })
        profile = { ...profile, ...request.postDataJSON() }
      }
      return route.fulfill({ json: { data: profile } })
    }
    if (url.pathname === '/uploads/images') {
      uploads++
      expect(url.searchParams.get('purpose')).toBe('avatar')
      expect(request.headers().authorization).toBe('Bearer avatar-fixture-only')
      await gate
      return failUpload ? route.fulfill({ status: 503, json: { code: 'STORAGE_UNAVAILABLE', message: 'Image storage is unavailable.' } }) : route.fulfill({ status: 201, json: { data: { url: avatarUrl, size: picture.length, contentType: 'image/jpeg' } } })
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  return {
    profile: () => profile, counts: () => ({ uploads, saves }),
    holdUpload: () => { gate = new Promise<void>((resolve) => { release = resolve }) }, releaseUpload: () => release?.(),
    failUpload: (value: boolean) => { failUpload = value }, failSave: (value: boolean) => { failSave = value }, guest: () => { guest = true },
  }
}

for (const width of [1440, 390]) test(`avatar preview, save, header and reload persist at ${width}px`, async ({ page }) => {
  const fixture = await setup(page)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/profile')
  fixture.holdUpload()
  await page.locator('input[type=file]').setInputFiles({ name: '头像.png', mimeType: 'image/png', buffer: picture })
  await expect(page.getByRole('button', { name: '正在上传头像' })).toBeVisible()
  await expect(page.getByRole('button', { name: '保存资料', exact: true })).toBeDisabled()
  fixture.releaseUpload()
  await expect(page.getByRole('button', { name: '更换头像', exact: true })).toBeVisible()
  await expect(page.locator('.profile-summary img')).toHaveAttribute('src', avatarUrl)
  expect(fixture.profile().avatar).toBeNull()
  await page.getByLabel('学校', { exact: true }).fill('校内大学')
  await page.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(page.getByText('资料已保存。', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '账号菜单：头像同学', exact: true }).locator('img')).toHaveAttribute('src', avatarUrl)
  expect(fixture.profile()).toMatchObject({ avatar: avatarUrl, school: '校内大学' })
  await page.reload()
  await expect(page.locator('.profile-summary img')).toHaveAttribute('src', avatarUrl)
  await expect(page.getByLabel('学校', { exact: true })).toHaveValue('校内大学')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  if (process.env.CAMPUSLOOP_VISUAL_OUTPUT) {
    await mkdir(process.env.CAMPUSLOOP_VISUAL_OUTPUT, { recursive: true })
    const uploadButton = page.getByRole('button', { name: '更换头像', exact: true })
    await uploadButton.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await expect.poll(() => uploadButton.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      return top === element || element.contains(top)
    })).toBe(true)
    await page.screenshot({ path: path.join(process.env.CAMPUSLOOP_VISUAL_OUTPUT, `${width}-profile-avatar.png`) })
  }
  await page.getByRole('button', { name: '恢复默认头像', exact: true }).click()
  await page.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect.poll(() => fixture.profile().avatar).toBeNull()
  await page.reload()
  await expect(page.locator('.profile-summary img')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('avatar upload shows Chinese validation and errors and can retry without losing profile edits', async ({ page }) => {
  const fixture = await setup(page)
  await page.goto('/profile')
  await page.getByLabel('简介', { exact: true }).fill('保留未保存简介')
  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'wrong.gif', mimeType: 'image/gif', buffer: picture })
  await expect(page.getByText('请选择不超过 5MiB 的 JPG 或 PNG 图片。', { exact: true })).toBeVisible()
  await input.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
  await expect(page.getByText('请选择不超过 5MiB 的 JPG 或 PNG 图片。', { exact: true })).toBeVisible()
  expect(fixture.counts().uploads).toBe(0)
  fixture.failUpload(true)
  await input.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: picture })
  await expect(page.getByText('头像上传失败：图片存储服务暂不可用，请稍后重试。 请重新选择图片上传。', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '保存资料', exact: true })).toBeEnabled()
  fixture.failUpload(false)
  await input.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: picture })
  await expect(page.getByRole('button', { name: '更换头像', exact: true })).toBeVisible()
  fixture.failSave(true)
  await page.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(page.getByText('服务暂不可用，请稍后重试。', { exact: true })).toBeVisible()
  await expect(page.getByLabel('简介', { exact: true })).toHaveValue('保留未保存简介')
  await expect(page.locator('.profile-summary img')).toHaveAttribute('src', avatarUrl)
  fixture.failSave(false)
  await page.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect.poll(() => fixture.profile().avatar).toBe(avatarUrl)
  fixture.guest()
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('input[type=file]')).toHaveCount(0)
})
