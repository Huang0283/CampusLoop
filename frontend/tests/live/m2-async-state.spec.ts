import { test, expect } from './fixtures'

test('shared async component exposes all seven states/actions; outer boundary hides private errors', async ({ page }) => {
  await page.goto('/market')
  await expect(page.getByRole('heading', { name: /每一件闲置/ })).toBeVisible()
  await page.evaluate(async () => {
    const load = new Function('path', 'return import(path)') as (path: string) => Promise<Record<string, unknown>>
    const react = (await load('/node_modules/.vite/deps/react.js')).default as Record<string, unknown>
    const dom = (await load('/node_modules/.vite/deps/react-dom_client.js')).default as Record<string, unknown>
    const task = await load('/src/live/AsyncTaskState.tsx')
    const boundary = await load('/src/live/ErrorBoundary.tsx')
    const create = react.createElement as (...args: unknown[]) => unknown
    const createRoot = dom.createRoot as (container: Element) => { render: (element: unknown) => void }
    const container = document.createElement('section'); container.id = 'component-contract-test'; document.body.append(container)
    // This component-only harness is mounted outside the application root. Keep it
    // above the real market layout so long product lists and fixed menus cannot
    // intercept its buttons. Normal Playwright actionability checks still apply.
    container.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:white;'
    const root = createRoot(container)
    const retry = () => container.setAttribute('data-retried', 'true')
    const phases = ['queued', 'running', 'completed', 'failed', 'timeout', 'expired']
    function Broken() { throw new Error('private-fixture-token-never-display') }
    root.render(create(react.Fragment, null,
      ...phases.map((phase) => create(task.AsyncTaskState, { key: phase, phase, retry, refresh: () => {} })),
      create(task.AsyncTaskState, { phase: 'failed', retry, retrying: true }),
      create(boundary.AppErrorBoundary, null, create(Broken)),
    ))
  })
  const section = page.locator('#component-contract-test')
  for (const phase of ['queued', 'running', 'completed', 'failed', 'timeout', 'expired']) {
    await expect(section.locator(`[data-task-phase="${phase}"]`).first()).toBeVisible()
  }
  await expect(section.locator('[data-task-phase][aria-busy="true"]')).toHaveCount(3)
  await section.locator('[data-task-phase="failed"]').first().getByRole('button', { name: '重试任务' }).click()
  await expect(section).toHaveAttribute('data-retried', 'true')
  await expect(section.getByText('页面暂时无法显示', { exact: true })).toBeVisible()
  await expect(section.getByText('private-fixture-token-never-display', { exact: true })).not.toBeVisible()
})
