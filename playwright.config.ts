import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: {
    // Browsers permit Secure cookies on localhost, which keeps production session
    // settings intact while the local test server remains plain HTTP.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: '3000',
      NUXT_SESSION_PASSWORD: process.env.NUXT_SESSION_PASSWORD || 'playwright-only-session-password-32-chars',
      DATABASE_URL: process.env.DATABASE_URL || 'mysql://unused:unused@127.0.0.1:3306/unused'
    }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ]
})
