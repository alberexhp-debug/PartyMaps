import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT || 3000)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },

  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
