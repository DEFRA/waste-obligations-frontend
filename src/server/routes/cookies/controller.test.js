import { readFileSync } from 'node:fs'
import { load } from 'cheerio'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { paths } from '#/config/paths.js'
import { getBellAzureAdB2cCookieName } from '#/server/auth/azure-ad-b2c.js'
import { config } from '#/config/config.js'
import { CONSENT_COOKIE_NAME } from '#/config/cookie-config.js'
import { CSRF_COOKIE_NAME } from '#/server/plugins/crumb.js'
import { createTestServer } from '#/test-helpers/create-test-server.js'
import { cookieHeadersFromResponse } from '#/test-helpers/auth-helper.js'
import {
  extractCrumbFromHtml,
  mergeCookieHeaders
} from '#/test-helpers/csrf-helper.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { formatCookieTtl } from '#/server/common/helpers/format-cookie-ttl.js'
import { getNonPrefixedServiceLinkHrefs } from '#/test-helpers/proxy-link-assertions.js'

const englishTranslations = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../locales/en.json'
    ),
    'utf-8'
  )
)

const cookiesContent = englishTranslations.cookies
const welshTranslations = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../locales/cy.json'
    ),
    'utf-8'
  )
)
const welshCookiesContent = welshTranslations.cookies
const FORWARDED_PREFIX = '/manage-recycling-obligations'
const TEST_GTM_KEY = 'GTM-ABC123'
const TEST_MEASUREMENT_ID = 'G-VMDE8PW9W7'

function setCookieHeadersFromResponse(response) {
  return [response.headers['set-cookie']].flat().filter(Boolean)
}

function cookieHeaderForName(headers, name) {
  return headers.find((header) => header.startsWith(`${name}=`))
}

async function withAnalyticsConfig(
  {
    googleTagManagerKey = TEST_GTM_KEY,
    measurementId = TEST_MEASUREMENT_ID
  } = {},
  run
) {
  const previousKey = config.get('googleAnalytics.googleTagManagerKey')
  const previousId = config.get('googleAnalytics.measurementId')
  config.set('googleAnalytics.googleTagManagerKey', googleTagManagerKey)
  config.set('googleAnalytics.measurementId', measurementId)

  try {
    return await run()
  } finally {
    config.set('googleAnalytics.googleTagManagerKey', previousKey)
    config.set('googleAnalytics.measurementId', previousId)
  }
}

describe('#cookiesController', () => {
  let server

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should return 200 with the correct page title', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(`${cookiesContent.pageTitle} |`)
    )
  })

  test('Should have a link to cookies in the footer', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(result).toEqual(expect.stringContaining(`href="${paths.cookies}"`))
  })

  test('prefixes the footer cookies link for a reverse proxy', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: paths.cookies,
      headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
    })

    expect(result).toEqual(
      expect.stringContaining(`href="${FORWARDED_PREFIX}/cookies"`)
    )
    expect(result).toEqual(
      expect.stringContaining(
        `data-analytics-cookie-path="${FORWARDED_PREFIX}"`
      )
    )
    expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual([])
  })

  test('Should render essential cookie details from translations', async () => {
    const sessionCookieName = config.get('session.cookie.name')
    const sessionCookieTtl = formatCookieTtl(config.get('session.cookie.ttl'))
    const { payload } = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(payload).toContain(
      `<h1 class="govuk-heading-l">${cookiesContent.heading}</h1>`
    )
    expect(payload).toContain(cookiesContent.introParagraph)
    expect(payload).toContain(cookiesContent.introParagraph2)
    expect(payload).toContain(cookiesContent.essentialCookiesHeading)
    expect(payload).toContain(cookiesContent.essentialCookiesDescription)
    expect(payload).not.toContain(cookiesContent.analyticsCookiesHeading)
    expect(payload).toContain(cookiesContent.table.essentialCookiesWeUse)
    expect(payload).not.toContain(cookiesContent.table.analyticsCookiesWeUse)
    expect(payload).toContain(sessionCookieName)
    expect(payload).toContain(CSRF_COOKIE_NAME)
    expect(payload).toContain(getBellAzureAdB2cCookieName())
    expect(payload).toContain(
      `data-consent-cookie-name="${CONSENT_COOKIE_NAME}"`
    )
    expect(payload).toContain('data-analytics-cookie-path="/"')
    expect(payload).toContain(cookiesContent.session.purpose)
    expect(payload).toContain(cookiesContent.csrf.purpose)
    expect(payload).toContain(cookiesContent.oauthState.purpose)
    expect(payload).not.toContain(cookiesContent.policy.purpose)
    expect(payload).toContain(sessionCookieTtl)
    expect(payload).toContain(cookiesContent.oauthState.expires)
    expect(payload).not.toContain(cookiesContent.settings.legend)

    const tableRows =
      payload
        .match(/<tbody class="govuk-table__body">[\s\S]*?<\/tbody>/g)?.[0]
        ?.match(/<tr class="govuk-table__row">/g) ?? []
    expect(tableRows).toHaveLength(3)
  })

  test('translates the session cookie expiry on the Welsh cookies page', async () => {
    const englishSessionCookieTtl = formatCookieTtl(
      config.get('session.cookie.ttl')
    )
    const welshSessionCookieTtl = formatCookieTtl(
      config.get('session.cookie.ttl'),
      'cy'
    )
    const { payload } = await server.inject({
      method: 'GET',
      url: `${paths.cookies}?lang=cy`
    })

    expect(welshSessionCookieTtl).not.toBe(englishSessionCookieTtl)
    expect(payload).toContain(welshSessionCookieTtl)
    expect(payload).not.toContain(englishSessionCookieTtl)
  })

  test('hides the cookie banner and analytics cookies when no analytics IDs are configured', async () => {
    const signedOut = await server.inject({
      method: 'GET',
      url: paths.signedOut
    })
    const cookiesPage = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(signedOut.result).not.toEqual(
      expect.stringContaining('js-cookies-button-accept')
    )
    expect(signedOut.result).not.toEqual(
      expect.stringContaining('googletagmanager.com')
    )
    expect(cookiesPage.payload).not.toContain(
      cookiesContent.analyticsCookiesHeading
    )
    expect(cookiesPage.payload).not.toContain(cookiesContent.settings.save)
    expect(signedOut.headers['cache-control']).not.toBe('no-store')
  })

  test('renders the GOV.UK analytics cookies section with GA4 cookies and settings', async () => {
    await withAnalyticsConfig({}, async () => {
      const { payload } = await server.inject({
        method: 'GET',
        url: paths.cookies
      })

      expect(payload).toContain(
        `<h2 class="govuk-heading-m govuk-!-margin-top-8">${cookiesContent.analyticsCookiesHeading}</h2>`
      )
      expect(payload).toContain(cookiesContent.analyticsCookiesDescription1)
      expect(payload).toContain(cookiesContent.analyticsCookiesDescription2)
      expect(payload).toContain(cookiesContent.analyticsCookiesDescription3)
      expect(payload).toContain(cookiesContent.analyticsCookiesPoint1)
      expect(payload).toContain(cookiesContent.analyticsCookiesPoint2)
      expect(payload).toContain(cookiesContent.analyticsCookiesPoint3)
      expect(payload).toContain(cookiesContent.analyticsCookiesPoint4)
      expect(payload).toContain(cookiesContent.analyticsCookiesPoint5)
      expect(payload).toContain(cookiesContent.analyticsCookiesPermission)
      expect(payload).toContain(cookiesContent.table.analyticsCookiesWeUse)
      expect(payload).toContain('_ga')
      expect(payload).toContain('_gid')
      expect(payload).toContain('_ga_VMDE8PW9W7')
      expect(payload).toContain(cookiesContent.analytics.gaPurpose)
      expect(payload).toContain(cookiesContent.analytics.gidPurpose)
      expect(payload).toContain(cookiesContent.analytics.gaContainerPurpose)
      expect(payload).toContain(cookiesContent.analytics.gaExpires)
      expect(payload).toContain('24 hours')
      expect(payload).toContain(
        `<h2 class="govuk-heading-m">${cookiesContent.settings.heading}</h2>`
      )
      expect(payload).toContain(cookiesContent.settings.yes)
      expect(payload).toContain(cookiesContent.settings.no)
      expect(payload).toContain(cookiesContent.settings.save)
      expect(payload).toContain(CONSENT_COOKIE_NAME)
      expect(payload).toContain(formatCookieTtl(config.get('cookiePolicy.ttl')))

      const analyticsTableRows =
        payload
          .match(/<tbody class="govuk-table__body">[\s\S]*?<\/tbody>/g)?.[1]
          ?.match(/<tr class="govuk-table__row">/g) ?? []
      expect(analyticsTableRows).toHaveLength(3)

      const $ = load(payload)
      expect($('#analytics').attr('checked')).toBeUndefined()
      expect($('#analytics-2').attr('checked')).toBeDefined()
    })
  })

  test('names the GA4 cookie from the configured measurement ID', async () => {
    await withAnalyticsConfig({ googleTagManagerKey: '' }, async () => {
      const { payload } = await server.inject({
        method: 'GET',
        url: paths.cookies
      })

      expect(payload).toContain('_ga_VMDE8PW9W7')
      expect(payload).not.toContain('_ga_&lt;measurement-id&gt;')
    })
  })

  test('keeps Welsh for shared cookie copy and English for new analytics copy', async () => {
    await withAnalyticsConfig({}, async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: `${paths.cookies}?lang=cy`
      })

      expect(result).toContain(welshCookiesContent.essentialCookiesHeading)
      expect(result).toContain(welshCookiesContent.analyticsCookiesPoint1)
      expect(result).toContain(welshCookiesContent.table.analyticsCookiesWeUse)
      expect(result).toContain(welshCookiesContent.settings.legend)
      expect(result).toContain(welshCookiesContent.analyticsCookiesHeading)
      expect(result).toContain(welshCookiesContent.analyticsCookiesPermission)
      expect(result).toContain(welshCookiesContent.analyticsCookiesPoint3)
      expect(result).toContain(welshCookiesContent.analytics.gaExpires)
      expect(result).toContain(welshCookiesContent.policy.expires)
      expect(result).not.toContain('Analytics cookies (optional)')
    })
  })

  test('keeps Welsh locale in session when navigating without lang query', async () => {
    const cookiesResponse = await server.inject({
      method: 'GET',
      url: `${paths.cookies}?lang=cy`
    })

    expect(cookiesResponse.result).toEqual(expect.stringContaining('Cwcis |'))

    const { result } = await server.inject({
      method: 'GET',
      url: paths.signedOut,
      headers: cookieHeadersFromResponse(cookiesResponse)
    })

    expect(result).toEqual(expect.stringContaining('Wedi allgofnodi |'))
  })

  test('stores English locale in session when switching back from Welsh', async () => {
    const welshResponse = await server.inject({
      method: 'GET',
      url: `${paths.cookies}?lang=cy`
    })

    const englishResponse = await server.inject({
      method: 'GET',
      url: `${paths.cookies}?lang=en`,
      headers: cookieHeadersFromResponse(welshResponse)
    })

    const { result } = await server.inject({
      method: 'GET',
      url: paths.signedOut,
      headers: cookieHeadersFromResponse(englishResponse)
    })

    expect(result).toEqual(expect.stringContaining('Signed out |'))
    expect(result).not.toEqual(expect.stringContaining('Wedi allgofnodi |'))
  })

  test('shows the cookie banner until the user confirms a choice', async () => {
    await withAnalyticsConfig({}, async () => {
      const { result, headers } = await server.inject({
        method: 'GET',
        url: paths.signedOut
      })
      const $ = load(result)
      const banner = $('.govuk-cookie-banner')

      expect(result).toEqual(
        expect.stringContaining('js-cookies-button-accept')
      )
      expect(result).toEqual(
        expect.stringContaining(cookiesContent.banner.accept)
      )
      expect(banner.find('h1, h2, h3, h4, h5, h6')).toHaveLength(0)
      expect(banner.find('.govuk-cookie-banner__heading').text()).toContain(
        cookiesContent.banner.title
      )
      expect(
        cookieHeaderForName(
          setCookieHeadersFromResponse({ headers }),
          CONSENT_COOKIE_NAME
        )
      ).toBeUndefined()
      expect($('nav .govuk-skip-link').text()).toContain(
        englishTranslations.common.nav.skipToMainContent
      )
      expect(result).not.toEqual(
        expect.stringContaining('googletagmanager.com')
      )
      expect(headers['cache-control']).toBe('no-store')
    })
  })

  test('exposes a non-default COOKIE_POLICY_NAME to the client', async () => {
    const previousName = config.get('cookiePolicy.name')
    const customName = 'custom-cookie-policy'
    config.set('cookiePolicy.name', customName)

    try {
      await withAnalyticsConfig({}, async () => {
        const { result } = await server.inject({
          method: 'GET',
          url: paths.signedOut
        })

        expect(result).toEqual(
          expect.stringContaining(`data-consent-cookie-name="${customName}"`)
        )
        expect(result).not.toEqual(
          expect.stringContaining(
            `data-consent-cookie-name="${CONSENT_COOKIE_NAME}"`
          )
        )
      })
    } finally {
      config.set('cookiePolicy.name', previousName)
    }
  })

  test('round-trips analytics consent with a non-default COOKIE_POLICY_NAME', async () => {
    const previousName = config.get('cookiePolicy.name')
    const customName = 'custom-cookie-policy'
    config.set('cookiePolicy.name', customName)
    const customServer = await createTestServer()
    await customServer.initialize()

    try {
      await withAnalyticsConfig({}, async () => {
        const getResponse = await customServer.inject({
          method: 'GET',
          url: paths.cookies
        })
        const crumb = extractCrumbFromHtml(getResponse.result)
        const postResponse = await customServer.inject({
          method: 'POST',
          url: paths.cookies,
          headers: cookieHeadersFromResponse(getResponse),
          payload: {
            analytics: true,
            async: true,
            [CSRF_COOKIE_NAME]: crumb
          }
        })

        const postedCookies = setCookieHeadersFromResponse(postResponse)

        expect(cookieHeaderForName(postedCookies, customName)).toBeDefined()
        expect(
          cookieHeaderForName(postedCookies, CONSENT_COOKIE_NAME)
        ).toBeUndefined()

        const { result } = await customServer.inject({
          method: 'GET',
          url: paths.signedOut,
          headers: mergeCookieHeaders(
            cookieHeadersFromResponse(postResponse),
            cookieHeadersFromResponse(getResponse)
          )
        })

        expect(result).toEqual(
          expect.stringContaining(`data-consent-cookie-name="${customName}"`)
        )
        expect(result).toEqual(
          expect.stringContaining('googletagmanager.com/gtm.js')
        )
        expect(result).not.toEqual(
          expect.stringContaining('js-cookies-button-accept')
        )
      })
    } finally {
      await customServer.stop({ timeout: 0 })
      config.set('cookiePolicy.name', previousName)
    }
  })

  test('shows a configured consent cookie ttl on the cookies page', async () => {
    const previousTtl = config.get('cookiePolicy.ttl')
    config.set('cookiePolicy.ttl', 3_600_000)

    try {
      await withAnalyticsConfig({}, async () => {
        const { payload } = await server.inject({
          method: 'GET',
          url: paths.cookies
        })

        expect(payload).toContain('1 hour')
        expect(payload).not.toContain(cookiesContent.policy.expires)
      })
    } finally {
      config.set('cookiePolicy.ttl', previousTtl)
    }
  })

  test('puts GTM and GA4 IDs on the banner without loading analytics before consent', async () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    const previousId = config.get('googleAnalytics.measurementId')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    config.set('googleAnalytics.measurementId', 'G-VMDE8PW9W7')

    try {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.signedOut
      })

      expect(result).toEqual(
        expect.stringContaining('data-gtm-key="GTM-ABC123"')
      )
      expect(result).toEqual(
        expect.stringContaining(
          `data-consent-cookie-name="${config.get('cookiePolicy.name')}"`
        )
      )
      expect(result).toEqual(
        expect.stringContaining('data-measurement-id="G-VMDE8PW9W7"')
      )
      expect(result).not.toEqual(
        expect.stringContaining('googletagmanager.com')
      )
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
      config.set('googleAnalytics.measurementId', previousId)
    }
  })

  test('renders GTM after analytics are accepted when a container ID is configured', async () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')

    try {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)
      const postResponse = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: true,
          async: true,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: paths.signedOut,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(postResponse),
          cookieHeadersFromResponse(getResponse)
        )
      })

      expect(result).toEqual(
        expect.stringContaining('googletagmanager.com/gtm.js')
      )
      expect(result).toEqual(expect.stringContaining('GTM-ABC123'))
      expect(result).not.toEqual(
        expect.stringContaining('googletagmanager.com/gtag/js')
      )
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })

  test('renders GA4 after analytics are accepted when a measurement ID is configured', async () => {
    const previousId = config.get('googleAnalytics.measurementId')
    config.set('googleAnalytics.measurementId', 'G-VMDE8PW9W7')

    try {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)
      const postResponse = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: true,
          async: true,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: paths.signedOut,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(postResponse),
          cookieHeadersFromResponse(getResponse)
        )
      })

      expect(result).toEqual(
        expect.stringContaining('googletagmanager.com/gtag/js?id=G-VMDE8PW9W7')
      )
      expect(result).toEqual(
        expect.stringContaining("gtag('config','G-VMDE8PW9W7')")
      )
      expect(result).toEqual(
        expect.stringContaining("gtag('set',{'cookie_path':'/'})")
      )
      expect(result).not.toEqual(
        expect.stringContaining('googletagmanager.com/gtm.js')
      )
    } finally {
      config.set('googleAnalytics.measurementId', previousId)
    }
  })

  test('scopes Google Analytics cookie_path to the reverse-proxy prefix', async () => {
    await withAnalyticsConfig(
      { googleTagManagerKey: '', measurementId: TEST_MEASUREMENT_ID },
      async () => {
        const getResponse = await server.inject({
          method: 'GET',
          url: paths.cookies
        })
        const crumb = extractCrumbFromHtml(getResponse.result)
        const postResponse = await server.inject({
          method: 'POST',
          url: paths.cookies,
          headers: cookieHeadersFromResponse(getResponse),
          payload: {
            analytics: true,
            async: true,
            [CSRF_COOKIE_NAME]: crumb
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: paths.signedOut,
          headers: {
            ...mergeCookieHeaders(
              cookieHeadersFromResponse(postResponse),
              cookieHeadersFromResponse(getResponse)
            ),
            'x-forwarded-prefix': FORWARDED_PREFIX
          }
        })

        expect(result).toEqual(
          expect.stringContaining(
            `gtag('set',{'cookie_path':'${FORWARDED_PREFIX}'})`
          )
        )
      }
    )
  })

  test('renders GTM and GA4 after analytics are accepted when both IDs are configured', async () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    const previousId = config.get('googleAnalytics.measurementId')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    config.set('googleAnalytics.measurementId', 'G-VMDE8PW9W7')

    try {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)
      const postResponse = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: true,
          async: true,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: paths.signedOut,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(postResponse),
          cookieHeadersFromResponse(getResponse)
        )
      })

      expect(result).toEqual(
        expect.stringContaining('googletagmanager.com/gtm.js')
      )
      expect(result).toEqual(expect.stringContaining('GTM-ABC123'))
      expect(result).toEqual(
        expect.stringContaining('googletagmanager.com/gtag/js?id=G-VMDE8PW9W7')
      )
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
      config.set('googleAnalytics.measurementId', previousId)
    }
  })

  test('does not render GTM after analytics are accepted without a container ID', async () => {
    await withAnalyticsConfig(
      { googleTagManagerKey: '', measurementId: TEST_MEASUREMENT_ID },
      async () => {
        const getResponse = await server.inject({
          method: 'GET',
          url: paths.cookies
        })
        const crumb = extractCrumbFromHtml(getResponse.result)
        const postResponse = await server.inject({
          method: 'POST',
          url: paths.cookies,
          headers: cookieHeadersFromResponse(getResponse),
          payload: {
            analytics: true,
            async: true,
            [CSRF_COOKIE_NAME]: crumb
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: paths.signedOut,
          headers: mergeCookieHeaders(
            cookieHeadersFromResponse(postResponse),
            cookieHeadersFromResponse(getResponse)
          )
        })

        expect(result).not.toEqual(
          expect.stringContaining('googletagmanager.com/gtm.js')
        )
        expect(result).toEqual(
          expect.stringContaining(
            'googletagmanager.com/gtag/js?id=G-VMDE8PW9W7'
          )
        )
        expect(result).not.toEqual(
          expect.stringContaining('js-cookies-button-accept')
        )
      }
    )
  })

  test('does not render GTM or GA4 after analytics are rejected', async () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    const previousId = config.get('googleAnalytics.measurementId')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    config.set('googleAnalytics.measurementId', 'G-VMDE8PW9W7')

    try {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)
      const postResponse = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: false,
          async: true,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: paths.signedOut,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(postResponse),
          cookieHeadersFromResponse(getResponse)
        )
      })

      expect(result).not.toEqual(
        expect.stringContaining('googletagmanager.com/gtm.js')
      )
      expect(result).not.toEqual(
        expect.stringContaining('googletagmanager.com/gtag/js')
      )
      expect(result).not.toEqual(
        expect.stringContaining('js-cookies-button-accept')
      )
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
      config.set('googleAnalytics.measurementId', previousId)
    }
  })

  test('prefixes the cookie banner form action for a reverse proxy', async () => {
    await withAnalyticsConfig({}, async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: paths.signedOut,
        headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
      })

      expect(result).toEqual(
        expect.stringContaining(`action="${FORWARDED_PREFIX}/cookies"`)
      )
    })
  })

  test('POST /cookies persists analytics consent asynchronously', async () => {
    await withAnalyticsConfig({}, async () => {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)

      const result = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: true,
          async: true,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      expect(result.statusCode).toBe(statusCodes.ok)
      expect(JSON.parse(result.payload)).toEqual({ message: 'success' })
    })
  })

  test('POST /cookies redirects back to a safe return URL', async () => {
    await withAnalyticsConfig({}, async () => {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.signedOut
      })
      const crumb = extractCrumbFromHtml(getResponse.result)

      const result = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: false,
          async: false,
          returnUrl: paths.signedOut,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      expect(result.statusCode).toBe(statusCodes.redirect)
      expect(result.headers.location).toBe(paths.signedOut)
    })
  })

  test('POST /cookies prefixes a local redirect behind a reverse proxy', async () => {
    await withAnalyticsConfig({}, async () => {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.signedOut,
        headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
      })
      const crumb = extractCrumbFromHtml(getResponse.result)

      const result = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: {
          ...cookieHeadersFromResponse(getResponse),
          'x-forwarded-prefix': FORWARDED_PREFIX
        },
        payload: {
          analytics: true,
          async: false,
          returnUrl: paths.signedOut,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      expect(result.statusCode).toBe(statusCodes.redirect)
      expect(result.headers.location).toBe(`${FORWARDED_PREFIX}/signed-out`)
    })
  })

  test('POST /cookies rejects an unsafe return URL and uses the preferences page', async () => {
    await withAnalyticsConfig({}, async () => {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)

      const result = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: true,
          async: false,
          returnUrl: 'https://evil.example',
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      expect(result.statusCode).toBe(statusCodes.redirect)
      expect(result.headers.location).toBe(`${paths.cookies}?updated=true`)
    })
  })

  test('GET /cookies?updated=true shows the success banner after saving', async () => {
    await withAnalyticsConfig({}, async () => {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)
      const postResponse = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          analytics: true,
          async: false,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: postResponse.headers.location,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(postResponse),
          cookieHeadersFromResponse(getResponse)
        )
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(cookiesContent.success.heading)
      )
      expect(result).not.toEqual(
        expect.stringContaining('js-cookies-button-accept')
      )
    })
  })

  test('does not expire GA cookies on first visit when analytics is configured', async () => {
    await withAnalyticsConfig({}, async () => {
      const firstVisit = await server.inject({
        method: 'GET',
        url: paths.cookies,
        headers: {
          cookie:
            '_ga=GA1.1.123456789.1234567890; _gid=GA1.1.987654321.1234567890'
        }
      })

      const expiresGa = setCookieHeadersFromResponse(firstVisit).some(
        (header) =>
          (header.startsWith('_ga') || header.startsWith('_gid')) &&
          header.includes('expires=Thu, 01 Jan 1970')
      )

      expect(expiresGa).toBe(false)
    })
  })

  test('expires GA cookies at the reverse-proxy path', async () => {
    const response = await server.inject({
      method: 'GET',
      url: paths.cookies,
      headers: {
        'x-forwarded-prefix': FORWARDED_PREFIX,
        cookie: '_ga=GA1.1.1; _gid=GA1.1.2'
      }
    })

    const gaHeader = cookieHeaderForName(
      setCookieHeadersFromResponse(response),
      '_ga'
    )

    expect(gaHeader).toEqual(
      expect.stringContaining(`Path=${FORWARDED_PREFIX}`)
    )
    expect(gaHeader).toEqual(expect.stringContaining('01 Jan 1970'))
  })

  test('POST /cookies without analytics is rejected', async () => {
    await withAnalyticsConfig({}, async () => {
      const getResponse = await server.inject({
        method: 'GET',
        url: paths.cookies
      })
      const crumb = extractCrumbFromHtml(getResponse.result)

      const result = await server.inject({
        method: 'POST',
        url: paths.cookies,
        headers: cookieHeadersFromResponse(getResponse),
        payload: {
          async: false,
          [CSRF_COOKIE_NAME]: crumb
        }
      })

      expect(result.statusCode).toBe(statusCodes.badRequest)
    })
  })
})
