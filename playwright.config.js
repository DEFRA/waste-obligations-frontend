import { defineConfig } from '@playwright/test'

import { integrationBaseUrl } from './integration/env.js'

export default defineConfig({
  testDir: './integration/journeys',
  globalSetup: './integration/global-setup.js',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: integrationBaseUrl(),
    ignoreHTTPSErrors: true,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    trace: 'on-first-retry'
  }
})
