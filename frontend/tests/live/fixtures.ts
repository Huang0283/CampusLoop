import { test as base, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'

export const test = base.extend<{ isolatedLimiter: void }>({
  // Playwright requires destructured fixture parameters even without dependencies.
  // eslint-disable-next-line no-empty-pattern
  isolatedLimiter: [async ({}, use) => {
    const container = process.env.CAMPUSLOOP_TEST_API_CONTAINER
    if (container) {
      if (!/^campusloop-[a-z0-9-]*audit[a-z0-9-]*$/.test(container)) throw new Error('Only an explicitly named audit API may reset test limits')
      execFileSync('docker', ['exec', container, 'python', 'scripts/reset_test_limiter.py'], { stdio: 'pipe', timeout: 10000 })
    } else if (process.env.CAMPUSLOOP_TEST_LOCAL_LIMITER === '1' || (process.env.CI === 'true' && process.env.APP_ENV === 'ci')) {
      // CI runs Python beside Node. The script separately enforces test/ci + Redis 14/15.
      execFileSync('python', ['../backend/scripts/reset_test_limiter.py'], { stdio: 'pipe', timeout: 10000 })
    }
    await use()
  }, { auto: true }],
})

export { expect }
