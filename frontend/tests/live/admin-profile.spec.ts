import { test, expect, type Page } from '@playwright/test'
import { adminDashboardFixture } from '../admin-dashboard-fixture'
import { mkdir } from 'node:fs/promises'

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkYPjPwMDAxMDAwMDAAAALHwEDmIWXfgAAAABJRU5ErkJggg==', 'base64')
const avatar = 'https://private.campusloop.invalid/avatar/501/admin-profile-fixture.jpg'
async function setup(page: Page, role: 'ADMIN' | 'USER' | 'GUEST' = 'ADMIN') {
  let profile = { id: 501, nickname: '资料管理员', email: 'admin-profile@example.invalid', role: role === 'GUEST' ? 'USER' : role, status: 'ACTIVE', avatar: null as string | null, bio: '原始简介', school: '', college: '', major: '', transactionCount: 0, rating: 0 }
  let failSave = false, failUpload = false, saves = 0, uploads = 0
  let payload: Record<string, unknown> | undefined
  let release!: () => void
  let gate: Promise<void> | undefined
  const requests: string[] = []
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url())
    if (!['fetch', 'xhr'].includes(req.resourceType())) return route.continue()
    requests.push(url.pathname)
    if (url.pathname === '/avatars/image') {
      expect(req.headers().authorization).toBe('Bearer admin-profile-fixture')
      expect(url.searchParams.get('reference')).toBe(avatar)
      return route.fulfill({ contentType: 'image/png', body: image })
    }
    if (url.pathname === '/auth/browser-session') return role === 'GUEST' ? route.fulfill({ status: 401, json: { code: 'AUTH_UNAUTHORIZED' } }) : route.fulfill({ json: { data: { accessToken: 'admin-profile-fixture', expiresIn: 600, user: profile } } })
    if (url.pathname === '/users/me') {
      if (req.method() === 'PATCH') {
        saves++; payload = req.postDataJSON()
        if (failSave) return route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } })
        profile = { ...profile, ...payload }
      }
      return route.fulfill({ json: { data: profile } })
    }
    if (url.pathname === '/uploads/images') {
      uploads++
      expect(url.searchParams.get('purpose')).toBe('avatar')
      expect(req.headers().authorization).toBe('Bearer admin-profile-fixture')
      await gate
      if (failUpload) return route.fulfill({ status: 503, json: { code: 'STORAGE_UNAVAILABLE' } })
      return route.fulfill({ status: 201, json: { data: { url: avatar, size: image.length, contentType: 'image/jpeg' } } })
    }
    if (url.pathname === '/admin/dashboard') return route.fulfill({ json: { data: adminDashboardFixture } })
    if (url.pathname === '/admin/audit-logs') return route.fulfill({ json: { data: { items: [], pagination: { page: 1, pageSize: 20, total: 0 } } } })
    if (url.pathname === '/display-translation/translate') return route.fulfill({ json: { translations: req.postDataJSON().texts.map((text: string) => text) } })
    if (url.pathname === '/notifications') return route.fulfill({ json: { data: [] } })
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND' } })
  })
  return { profile: () => profile, counts: () => ({ saves, uploads }), payload: () => payload, requests,
    failSave: (value: boolean) => { failSave = value }, failUpload: (value: boolean) => { failUpload = value },
    holdUpload: () => { gate = new Promise<void>(resolve => { release = resolve }) }, releaseUpload: () => release(),
  }
}

for (const width of [1440, 390]) {
  test(`admin edits own profile and avatar from both entries at ${width}px`, async ({ page }) => {
    const fixture = await setup(page)
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/admin/profile')
    const editor = page.locator('#admin-profile-editor')
    await expect(editor).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: '编辑资料与头像', exact: true }).click()
    await expect(editor).toBeFocused()
    const layout = await page.evaluate(() => {
      const rect = (s: string) => document.querySelector(s)!.getBoundingClientRect().toJSON()
      return { hero: rect('.adm-pf-hero'), editor: rect('.adm-pf-editor'), stats: rect('.adm-pf-stats'), log: rect('.adm-pf-log') }
    })
    if (width === 1440) {
      expect(layout.editor.y).toBeGreaterThan(layout.hero.bottom)
      expect(layout.stats.x).toBeGreaterThanOrEqual(layout.editor.right + 20)
      expect(layout.stats.y).toBe(layout.editor.y)
      expect(layout.hero.width).toBeGreaterThan(layout.editor.width)
      expect(layout.log.y).toBeGreaterThan(Math.max(layout.editor.bottom, layout.stats.bottom))
    } else {
      expect(layout.editor.y).toBeGreaterThan(layout.hero.bottom)
      expect(layout.stats.y).toBeGreaterThan(layout.editor.bottom)
    }
    await expect(editor.getByLabel('昵称', { exact: true })).toHaveValue('资料管理员')
    await page.evaluate(() => window.scrollTo(0, 0))
    await mkdir('../.codex-tmp/admin-profile-20261103', { recursive: true })
    await page.screenshot({ path: `../.codex-tmp/admin-profile-20261103/inline-fixture-${width}.png`, fullPage: true })
    await editor.getByLabel('昵称', { exact: true }).fill('新管理员')
    await editor.getByLabel('简介', { exact: true }).fill('修改后的简介')
    await editor.getByLabel('学校', { exact: true }).fill('校内大学')
    fixture.holdUpload()
    await editor.locator('input[type=file]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: image })
    await expect(editor.getByRole('button', { name: '正在上传头像', exact: true })).toBeVisible()
    await expect(editor.getByRole('button', { name: '保存资料', exact: true })).toBeDisabled()
    fixture.releaseUpload()
    await expect(editor.getByRole('button', { name: '更换头像', exact: true })).toBeVisible()
    expect(fixture.profile().avatar).toBeNull()
    expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await editor.getByRole('button', { name: '保存资料', exact: true }).click()
    await expect(editor).toBeVisible()
    await expect(page.locator('.adm-pf-hero h2')).toHaveText('新管理员')
    await expect(page.locator('.adm-pf-avatar img')).toHaveAttribute('src', /^blob:/)
    await expect(page.locator('.adm-me img')).toHaveAttribute('src', /^blob:/)
    expect(fixture.payload()).toEqual({ nickname: '新管理员', avatar, bio: '修改后的简介', school: '校内大学', college: '', major: '' })
    await page.reload()
    await expect(page.locator('.adm-pf-avatar img')).toHaveAttribute('src', /^blob:/)
    await expect(page.locator('.adm-pf-hero h2')).toHaveText('新管理员')
    await page.locator('.adm-me').click()
    await page.getByRole('menuitem', { name: '编辑资料与头像' }).click()
    await expect(page).toHaveURL(/\/admin\/profile\?edit=1$/)
    await expect(editor).toBeFocused()
    await expect(editor.getByLabel('学校', { exact: true })).toHaveValue('校内大学')
    await editor.getByLabel('昵称', { exact: true }).fill('不保存的名字')
    await editor.getByRole('button', { name: '重置修改', exact: true }).click()
    expect(fixture.counts().saves).toBe(1)
    await page.getByRole('button', { name: '编辑资料与头像', exact: true }).click()
    await expect(editor.getByLabel('昵称', { exact: true })).toHaveValue('新管理员')
    // Language changes keep the actual draft in place.
    await page.evaluate(() => { localStorage.setItem('campusloop-language', 'en'); window.dispatchEvent(new StorageEvent('storage', { key: 'campusloop-language', newValue: 'en' })) })
    await expect(editor.getByLabel('Display name', { exact: true })).toHaveValue('新管理员')
    await editor.getByRole('button', { name: 'Reset avatar', exact: true }).click()
    await editor.getByRole('button', { name: 'Save profile', exact: true }).click()
    await expect(page.locator('.adm-pf-avatar img')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.adm-pf-avatar img')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('admin can retry failed upload and save without losing drafts', async ({ page }) => {
  const fixture = await setup(page)
  await page.goto('/admin/profile?edit=1')
  const editor = page.locator('#admin-profile-editor')
  await editor.getByLabel('简介', { exact: true }).fill('需要保留的草稿')
  const input = editor.locator('input[type=file]')
  await input.setInputFiles({ name: 'invalid.gif', mimeType: 'image/gif', buffer: image })
  await expect(editor.getByText('请选择不超过 5MiB 的 JPG 或 PNG 图片。', { exact: true })).toBeVisible()
  expect(fixture.counts().uploads).toBe(0)
  fixture.failUpload(true)
  await input.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: image })
  await expect(editor.getByRole('alert')).toContainText('头像上传失败')
  fixture.failUpload(false)
  await input.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: image })
  await expect(editor.getByRole('button', { name: '更换头像', exact: true })).toBeVisible()
  await editor.getByLabel('昵称', { exact: true }).fill('   ')
  await editor.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(editor.getByText('请输入 1–40 个字符的昵称，不能全为空格。', { exact: true })).toBeVisible()
  expect(fixture.counts().saves).toBe(0)
  await editor.getByLabel('昵称', { exact: true }).fill('资料管理员')
  fixture.failSave(true)
  await editor.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(editor.getByRole('alert')).toBeVisible()
  await expect(editor.getByLabel('简介', { exact: true })).toHaveValue('需要保留的草稿')
  await expect(editor.locator('.profile-avatar-upload img')).toHaveAttribute('src', /^blob:/)
  expect(fixture.profile().avatar).toBeNull()
  fixture.failSave(false)
  await editor.getByRole('button', { name: '保存资料', exact: true }).click()
  await expect(page.locator('.adm-pf-avatar img')).toHaveAttribute('src', /^blob:/)
  expect(fixture.profile()).toMatchObject({ avatar, bio: '需要保留的草稿' })
})

test('reset restores nullable saved fields and clears avatar validation without saving', async ({ page }) => {
  const fixture = await setup(page)
  Object.assign(fixture.profile(), { bio: null, school: null, college: null, major: null })
  await page.goto('/admin/profile')
  const editor = page.locator('#admin-profile-editor')
  for (const label of ['昵称', '简介', '学校', '学院', '专业']) {
    await editor.getByLabel(label, { exact: true }).fill('临时修改')
  }
  await editor.locator('input[type=file]').setInputFiles({ name: 'invalid.gif', mimeType: 'image/gif', buffer: image })
  await expect(editor.getByRole('alert')).toBeVisible()
  await editor.getByRole('button', { name: '重置修改', exact: true }).click()
  await expect(editor.getByLabel('昵称', { exact: true })).toHaveValue('资料管理员')
  for (const label of ['简介', '学校', '学院', '专业']) await expect(editor.getByLabel(label, { exact: true })).toHaveValue('')
  await expect(editor.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText('已恢复上次保存的资料，未保存的修改已撤销。', { exact: true })).toBeVisible()
  expect(fixture.counts()).toEqual({ uploads: 0, saves: 0 })
  await page.reload()
  await expect(editor.getByLabel('昵称', { exact: true })).toHaveValue('资料管理员')
})

test('Chinese profile facts do not acquire a weekday from their separator', async ({ page }) => {
  const fixture = await setup(page)
  Object.assign(fixture.profile(), { school: '华南师范大学', college: 'abd学院', major: '人工智能' })
  await page.goto('/admin/profile')
  await expect(page.locator('.adm-pf-facts > div > span')).toHaveText(['华南师范大学', 'abd学院', '人工智能'])
  await expect(page.getByLabel('学院', { exact: true })).toHaveValue('abd学院')
  expect(fixture.requests).not.toContain('/display-translation/translate')
  Object.assign(fixture.profile(), { college: '中英文混排abd人工智能与计算机技术学院'.repeat(3) })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload()
    await expect(page.locator('.adm-pf-facts > div > span').nth(1)).toHaveText(fixture.profile().college)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

for (const role of ['GUEST', 'USER'] as const) {
  test(`${role} cannot open admin profile editor`, async ({ page }) => {
    const fixture = await setup(page, role)
    await page.goto('/admin/profile?edit=1')
    if (role === 'GUEST') await expect(page).toHaveURL(/\/login$/)
    else await expect(page.getByText('当前账号无权访问', { exact: true })).toBeVisible()
    await expect(page.locator('input[type=file]')).toHaveCount(0)
    expect(fixture.requests).not.toContain('/users/me')
    expect(fixture.counts()).toEqual({ uploads: 0, saves: 0 })
  })
}
