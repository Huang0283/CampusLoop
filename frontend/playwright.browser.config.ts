import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  projects: [
    { name: 'edge', use: { channel: 'msedge' } },
    { name: 'chrome', use: { channel: 'chrome' } },
  ],
})
