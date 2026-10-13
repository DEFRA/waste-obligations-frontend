import { defineConfig } from '@playwright/test'

import {
  integrationDirectBaseUrl,
  integrationProxyBaseUrl,
  integrationServiceBaseUrl
} from './integration/env.js'

const projects = [
  {
    name: 'direct',
    use: { baseURL: integrationServiceBaseUrl(integrationDirectBaseUrl()) }
  }
]
const proxyBaseUrl = integrationProxyBaseUrl()

if (proxyBaseUrl) {
  projects.push({
    name: 'reverse-proxy',
    use: { baseURL: integrationServiceBaseUrl(proxyBaseUrl) }
  })
}

export default defineConfig({
  testDir: './integration/journeys',
  globalSetup: './integration/global-setup.js',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  projects,
  use: {
    ignoreHTTPSErrors: true,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    },
    trace: 'on-first-retry'
  }
})
