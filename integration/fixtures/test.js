import { test as base, expect } from '@playwright/test'

const test = base

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.clearPermissions()
})

export { test, expect }
