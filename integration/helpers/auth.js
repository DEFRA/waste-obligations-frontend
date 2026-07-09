import { expect } from '@playwright/test'

async function assertSignInSucceeded(page) {
  const signInFailedHeading = page.getByRole('heading', {
    name: 'Sign in failed',
    level: 1
  })

  try {
    await expect(signInFailedHeading).not.toBeVisible({ timeout: 10_000 })
  } catch {
    throw new Error(
      'Mock sign-in failed. Ensure the integration server entry point is used, WireMock is running, and backend-account stubs are loaded.'
    )
  }
}

function parseExpectedPath(path) {
  const [expectedPathname, expectedQuery = ''] = path.split('?')
  return { expectedPathname, expectedQuery }
}

function matchesExpectedPath(url, expectedPathname, expectedQuery) {
  if (url.pathname !== expectedPathname) {
    return false
  }

  if (!expectedQuery) {
    return true
  }

  return url.search === `?${expectedQuery}`
}

export async function visitAuthenticatedPath(
  page,
  path,
  { expectExactPath = true } = {}
) {
  const { expectedPathname, expectedQuery } = parseExpectedPath(path)

  await page.goto(path)

  if (page.url().includes('/signin-oidc')) {
    await page.waitForURL((url) =>
      matchesExpectedPath(url, expectedPathname, expectedQuery)
    )
  }

  await assertSignInSucceeded(page)

  if (!expectExactPath) {
    return
  }

  const currentUrl = new URL(page.url())
  if (!matchesExpectedPath(currentUrl, expectedPathname, expectedQuery)) {
    throw new Error(
      `Expected to land on ${path} but got ${page.url()}. Check the integration server entry point and stack.`
    )
  }
}
