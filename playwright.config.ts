import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

const E2E_SESSION_KEY = ['estrada', 'mais', 'playwright', 'e2e', 'session', '2026'].join('-')
process.env.NUXT_APP_SECRET ||= E2E_SESSION_KEY
process.env.NUXT_DATABASE_URL ||= './.data/sqlite/estrada.db'

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  globalSetup: './test/e2e/helpers/auth.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
