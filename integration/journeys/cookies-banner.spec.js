import { expect, test } from '../fixtures/test.js'
import {
  TEST_GA4_COOKIE_NAME,
  TEST_GTM_KEY,
  TEST_MEASUREMENT_ID,
  expectedAnalyticsCookiePath,
  failJsonCookiePosts,
  dispatchPersistedPageshow,
  getDataLayerEntries,
  getGaCookieNames,
  getGaCookies,
  interceptAnalyticsTraffic,
  isCookieFormPost,
  readConsentPolicyFromPage,
  servicePath,
  setTestGaCookies
} from '../helpers/analytics.js'

test.beforeEach(async ({ page }) => {
  await interceptAnalyticsTraffic(page)
})

test.describe('Cookie banner', () => {
  test('accepts analytics cookies from the banner and can change them later', async ({
    page
  }) => {
    await page.goto('cookies')

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()

    await expect(
      page.getByText('You’ve accepted analytics cookies.')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked()

    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save cookie settings' }).click()

    await expect(
      page.getByText('You’ve set your cookie preferences.')
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
  })

  test('rejects analytics cookies from the banner', async ({ page }) => {
    await page.goto('signed-out')

    await page.getByRole('button', { name: 'Reject analytics cookies' }).click()

    await expect(
      page.getByText('You’ve rejected analytics cookies.')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)

    await page.goto('cookies')

    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)
  })

  test('opens the cookies page from the banner', async ({ page }) => {
    await page.goto('signed-out')

    await expect(
      page.locator('.govuk-cookie-banner :is(h1, h2, h3, h4, h5, h6)')
    ).toHaveCount(0)

    await page.getByRole('link', { name: 'View cookies' }).click()

    await expect(page).toHaveURL(/\/cookies$/)
    await expect(
      page.getByRole('heading', { name: 'Cookies', level: 1 })
    ).toBeVisible()
  })

  test('does not initialize analytics before consent and initializes them without a reload on accept', async ({
    page
  }) => {
    await page.goto('signed-out')

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toBeVisible()
    expect(await readConsentPolicyFromPage(page)).toBeNull()
    await expect(
      page.locator('script[src*="googletagmanager.com"]')
    ).toHaveCount(0)
    expect(
      (await getDataLayerEntries(page)).some(
        (entry) => entry.values?.[0] === 'config'
      )
    ).toBe(false)

    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()

    await expect(
      page.getByText('You’ve accepted analytics cookies.')
    ).toBeVisible()
    await expect(
      page.locator(`script[src*="gtm.js?id=${TEST_GTM_KEY}"]`)
    ).toHaveCount(1)
    await expect(
      page.locator(`script[src*="gtag/js?id=${TEST_MEASUREMENT_ID}"]`)
    ).toHaveCount(1)

    const dataLayer = await getDataLayerEntries(page)
    expect(dataLayer).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'arguments',
          values: ['config', TEST_MEASUREMENT_ID]
        })
      ])
    )
    expect(
      dataLayer.some(
        (entry) => entry.kind === 'arguments' && entry.values[0] === 'js'
      )
    ).toBe(true)
  })

  test('does not initialize analytics after rejection', async ({ page }) => {
    await page.goto('signed-out')

    await page.getByRole('button', { name: 'Reject analytics cookies' }).click()

    await expect(
      page.getByText('You’ve rejected analytics cookies.')
    ).toBeVisible()
    await expect(
      page.locator('script[src*="googletagmanager.com"]')
    ).toHaveCount(0)
    expect(
      (await getDataLayerEntries(page)).some(
        (entry) => entry.values?.[0] === 'config'
      )
    ).toBe(false)
  })

  test('failed accept XHR falls back and returns to the original page', async ({
    page,
    baseURL
  }) => {
    await page.goto('signed-out')

    await expect(page.locator('form[action$="/cookies"]')).toHaveAttribute(
      'action',
      servicePath(baseURL, 'cookies')
    )
    await expect(page.locator('input[name="returnUrl"]')).toHaveValue(
      /\/signed-out$/
    )

    await failJsonCookiePosts(page)
    const fallbackPost = page.waitForRequest((request) =>
      isCookieFormPost(request, 'true')
    )

    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()
    await fallbackPost

    await expect(page).toHaveURL(/\/signed-out\/?$/)
    expect(await readConsentPolicyFromPage(page)).toEqual(
      expect.objectContaining({ confirmed: true, analytics: true })
    )
    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)

    await page.goto('cookies')
    await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked()
  })

  test('failed reject XHR falls back and returns to the original page', async ({
    page,
    baseURL
  }) => {
    await page.goto('signed-out')

    await expect(page.locator('form[action$="/cookies"]')).toHaveAttribute(
      'action',
      servicePath(baseURL, 'cookies')
    )

    await failJsonCookiePosts(page)
    const fallbackPost = page.waitForRequest((request) =>
      isCookieFormPost(request, 'false')
    )

    await page.getByRole('button', { name: 'Reject analytics cookies' }).click()
    await fallbackPost

    await expect(page).toHaveURL(/\/signed-out\/?$/)
    expect(await readConsentPolicyFromPage(page)).toEqual(
      expect.objectContaining({ confirmed: true, analytics: false })
    )
    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)

    await page.goto('cookies')
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
  })

  test('history restoration keeps GA cookies while consent remains accepted', async ({
    page
  }) => {
    await page.goto('signed-out')
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()
    await page.reload()
    await setTestGaCookies(page)

    expect(await getGaCookieNames(page)).toEqual(
      expect.arrayContaining(['_ga', TEST_GA4_COOKIE_NAME])
    )

    await Promise.all([
      page.waitForEvent('load'),
      dispatchPersistedPageshow(page)
    ])

    expect(await getGaCookieNames(page)).toEqual(
      expect.arrayContaining(['_ga', TEST_GA4_COOKIE_NAME])
    )
    expect(await readConsentPolicyFromPage(page)).toEqual(
      expect.objectContaining({ confirmed: true, analytics: true })
    )
    await expect(
      page.locator(`script[src*="gtag/js?id=${TEST_MEASUREMENT_ID}"]`)
    ).toHaveCount(1)
  })

  test('scopes Google Analytics cookies to the public service path', async ({
    page,
    baseURL
  }) => {
    const expectedPath = expectedAnalyticsCookiePath(baseURL)

    await page.goto('signed-out')
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()
    await page.reload()
    await setTestGaCookies(page)

    await expect(page.locator('.js-cookie-consent-config')).toHaveAttribute(
      'data-analytics-cookie-path',
      expectedPath
    )
    expect(await page.content()).toContain(
      `gtag('set',{'cookie_path':'${expectedPath}'})`
    )

    const gaCookie = (await getGaCookies(page)).find(
      (cookie) => cookie.name === '_ga'
    )

    expect(gaCookie?.path).toBe(expectedPath)
  })

  test('history restoration after rejection clears GA cookies and does not restart analytics', async ({
    page
  }) => {
    await page.goto('signed-out')
    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()
    await page.reload()
    await setTestGaCookies(page)

    await page.goto('cookies')
    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save cookie settings' }).click()
    await setTestGaCookies(page)

    const restored = page.waitForEvent('load')
    await dispatchPersistedPageshow(page)
    await restored

    await expect.poll(async () => getGaCookieNames(page)).toEqual([])
    expect(await readConsentPolicyFromPage(page)).toEqual(
      expect.objectContaining({ confirmed: true, analytics: false })
    )
    await expect(
      page.locator('script[src*="googletagmanager.com"]')
    ).toHaveCount(0)
  })
})

test.describe('Cookies page', () => {
  test('shows essential cookies, analytics cookies and settings', async ({
    page
  }) => {
    await page.goto('cookies')

    const main = page.locator('#main-content')

    await expect(
      main.getByRole('heading', { name: 'Essential cookies', level: 2 })
    ).toBeVisible()
    await expect(
      main.getByRole('heading', { name: 'Analytics cookies', level: 2 })
    ).toBeVisible()
    await expect(
      main.getByText(
        'We only set Google Analytics cookies if you give us permission.'
      )
    ).toBeVisible()
    await expect(main.getByText('_ga', { exact: true })).toBeVisible()
    await expect(main.getByText('_gid', { exact: true })).toBeVisible()
    await expect(main.getByText(TEST_GA4_COOKIE_NAME)).toBeVisible()
    await expect(main.getByText('4 hours', { exact: true })).toBeVisible()
    await expect(main.getByText('24 hours', { exact: true })).toBeVisible()
    await expect(main.getByText('2 years', { exact: true })).toHaveCount(2)
    await expect(
      main.getByRole('heading', {
        name: 'Change your cookie settings',
        level: 2
      })
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
  })

  test('translates the session cookie expiry on the Welsh cookies page', async ({
    page
  }) => {
    await page.goto('cookies?lang=cy')

    const main = page.locator('#main-content')

    await expect(main.getByText('4 awr', { exact: true })).toBeVisible()
    await expect(main.getByText('24 awr', { exact: true })).toBeVisible()
    await expect(main.getByText('4 hours')).toHaveCount(0)
  })

  test('saves analytics preference from the cookies page', async ({ page }) => {
    await page.goto('cookies')

    await page.getByRole('radio', { name: 'Yes' }).check()
    await page.getByRole('button', { name: 'Save cookie settings' }).click()

    await expect(
      page.getByText('You’ve set your cookie preferences.')
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked()
    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)
  })

  test('opens cookies from the footer', async ({ page }) => {
    await page.goto('signed-out')

    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Cookies' })
      .click()

    await expect(page).toHaveURL(/\/cookies$/)
    await expect(
      page.getByRole('heading', { name: 'Cookies', level: 1 })
    ).toBeVisible()
  })
})
