import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/live', timeout: 90000, workers: 1,
  expect: { timeout: 10000 },
  reporter: [['list']],
  use: { baseURL: process.env.CAMPUSLOOP_UI_URL || 'http://localhost:5174', browserName: 'chromium',
    // Screenshots/traces can expose private content. Explicit redacted evidence only.
    trace: 'off', screenshot: 'off', video: 'off', actionTimeout: 15000 },
})
