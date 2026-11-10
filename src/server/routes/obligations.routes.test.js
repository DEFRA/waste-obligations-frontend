import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { CONSENT_COOKIE_NAME } from '#/config/cookie-config.js'
import { EPR_PACKAGING_BASIC_USER_SERVICE_ROLE } from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  injectAuthedPostForm,
  mergeCookieHeaders
} from '#/test-helpers/csrf-helper.js'
import {
  authenticate,
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import {
  MOCK_COMPLIANCE_SCHEME_ID,
  createMockBackendAccountApiService
} from '#/test-helpers/mock-backend-account-api.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import { getNonPrefixedServiceLinkHrefs } from '#/test-helpers/proxy-link-assertions.js'

const organisationId = MOCK_AUTH_ORGANISATION_ID
const schemeId = MOCK_COMPLIANCE_SCHEME_ID
const unauthorisedOrganisationId = '923fa611-571c-4948-ab7d-fbb75e75ed65'
const unauthorisedSchemeId = '923fa611-571c-4948-ab7d-fbb75e75ed66'
const FORWARDED_PREFIX = '/manage-recycling-obligations'
const currentYear = getComplianceYear()

function buildOrganisation(overrides = {}) {
  return {
    id: organisationId,
    name: 'Example Operator Ltd',
    businessCountry: 'GB-ENG',
    ...overrides
  }
}

function buildObligationsResponse() {
  return {
    obligations: [
      {
        material: 'Plastic',
        recyclingTarget: 0.75,
        tonnages: {
          material: 100,
          awaitingAcceptance: 10,
          accepted: 50,
          outstanding: 25,
          obligated: 75
        },
        status: 'NotMet'
      }
    ]
  }
}

const NO_DATA_MATERIALS = [
  'Aluminium',
  'Glass',
  'GlassRemelt',
  'Paper',
  'Plastic',
  'Steel',
  'Wood'
]

function buildNoDataYetObligationsResponse() {
  return {
    obligations: NO_DATA_MATERIALS.map((material) => ({
      material,
      recyclingTarget: 0.5,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: null,
        obligated: null
      },
      status: 'NoDataYet'
    }))
  }
}

function buildPrnsResponse() {
  return {
    prns: [
      { id: 'prn-1', obligationYear: currentYear },
      { id: 'prn-2', obligationYear: currentYear },
      { id: 'prn-3', obligationYear: currentYear }
    ],
    total: 3,
    page: 1,
    pageSize: 100
  }
}

describe('obligations routes', () => {
  let server
  let authHeaders
  let previousManageObligationsFlag
  let previousShowPrnsFlag

  const getOrganisationMock = vi.fn()
  const getOrganisationObligationsMock = vi.fn()
  const getOrganisationPrnsMock = vi.fn()
  const getComplianceDeclarationsMock = vi.fn()

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    previousShowPrnsFlag = config.get('features.showPrns')
    config.set('features.manageObligations', true)
    config.set('features.showPrns', true)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    getOrganisationMock.mockReset().mockResolvedValue(buildOrganisation())
    getOrganisationObligationsMock
      .mockReset()
      .mockResolvedValue(buildObligationsResponse())
    getOrganisationPrnsMock.mockReset().mockResolvedValue(buildPrnsResponse())
    getComplianceDeclarationsMock
      .mockReset()
      .mockResolvedValue({ complianceDeclarations: [] })

    server.app.wasteOrganisationsApi = {
      getOrganisation: getOrganisationMock
    }
    server.app.wasteObligationsApi = {
      getOrganisationObligations: getOrganisationObligationsMock,
      getOrganisationPrns: getOrganisationPrnsMock,
      getComplianceDeclarations: getComplianceDeclarationsMock
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
    config.set('features.showPrns', previousShowPrnsFlag)
  })

  describe('producer obligations home', () => {
    const url = `/producer/${organisationId}/obligations?year=${currentYear}`

    test('renders the manage obligations page', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Manage your'))
      expect(result).toEqual(expect.stringContaining('recycling obligations'))
      expect(result).toEqual(expect.stringContaining('Example Operator Ltd'))
      expect(result).toEqual(expect.stringContaining('Environment Agency'))
      expect(result).toEqual(expect.stringContaining('Plastic'))
      expect(result).toEqual(
        expect.stringContaining('aria-labelledby="how-to-meet-heading"')
      )
      expect(result).toEqual(
        expect.stringContaining('aria-labelledby="glass-heading"')
      )
      expect(result).toEqual(expect.stringContaining('scope="row"'))
      expect(result).toEqual(
        expect.stringContaining('Submit your certificate of compliance')
      )
      expect(result).toEqual(expect.stringContaining('Submit your certificate'))
    })

    test('shows a view link instead of the submit link once the year is submitted', async () => {
      getComplianceDeclarationsMock.mockResolvedValueOnce({
        complianceDeclarations: [
          {
            id: '6512a0f0c0ffee0000000001',
            obligationYear: currentYear,
            status: 'Submitted'
          }
        ]
      })

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('View your certificate'))
      expect(result).toEqual(
        expect.stringContaining(
          `/compliance/certificate/6512a0f0c0ffee0000000001`
        )
      )
      expect(result).not.toEqual(
        expect.stringContaining('Submit your certificate')
      )
    })

    describe('csoc tile states', () => {
      const deadlinePassedDate = '2027-02-01T12:00:00Z'
      const cancelled = [
        { id: 'cancelled-1', obligationYear: currentYear, status: 'Cancelled' }
      ]

      async function getPage({ declarations = [], date } = {}) {
        getComplianceDeclarationsMock.mockResolvedValueOnce({
          complianceDeclarations: declarations
        })

        if (date) {
          vi.useFakeTimers({ toFake: ['Date'] })
          vi.setSystemTime(new Date(date))
        }

        try {
          return await injectAuthed(server, { method: 'GET', url }, authHeaders)
        } finally {
          vi.useRealTimers()
        }
      }

      afterEach(() => {
        vi.useRealTimers()
      })

      test('submit: offers the submit button before the deadline', async () => {
        const { result, statusCode } = await getPage()

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(
          expect.stringContaining('Submit your certificate of compliance')
        )
        expect(result).toEqual(
          expect.stringContaining('Submit your certificate')
        )
      })

      test('submitted: links to the submitted certificate and hides the submit button', async () => {
        const { result, statusCode } = await getPage({
          declarations: [
            {
              id: '6512a0f0c0ffee0000000001',
              obligationYear: currentYear,
              status: 'Submitted'
            }
          ]
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(expect.stringContaining('View your certificate'))
        expect(result).toEqual(
          expect.stringContaining(
            '/compliance/certificate/6512a0f0c0ffee0000000001'
          )
        )
        expect(result).not.toEqual(
          expect.stringContaining('Submit your certificate')
        )
      })

      test('cancelled: offers resubmission before the deadline', async () => {
        const { result, statusCode } = await getPage({
          declarations: cancelled
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(
          expect.stringContaining('Resubmit your certificate of compliance')
        )
        expect(result).toEqual(
          expect.stringContaining('Resubmit your certificate')
        )
        expect(result).not.toEqual(expect.stringContaining('You missed'))
      })

      test('missed: shows the missed deadline copy with no submit button after the deadline', async () => {
        const { result, statusCode } = await getPage({
          date: deadlinePassedDate
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(
          expect.stringContaining(
            'You missed the certificate of compliance deadline'
          )
        )
        expect(result).toEqual(
          expect.stringContaining('The Environment Agency will contact you')
        )
        expect(result).not.toEqual(
          expect.stringContaining('Submit your certificate')
        )
        expect(result).not.toEqual(
          expect.stringContaining('Resubmit your certificate')
        )
      })

      test('missed-cancelled: explains that a cancelled year can no longer be resubmitted after the deadline', async () => {
        const { result, statusCode } = await getPage({
          declarations: cancelled,
          date: deadlinePassedDate
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(
          expect.stringContaining(
            'You missed the certificate of compliance deadline'
          )
        )
        expect(result).toEqual(
          expect.stringContaining('you can no longer resubmit your certificate')
        )
        expect(result).not.toEqual(
          expect.stringContaining('Resubmit your certificate')
        )
      })
    })

    test('lists the links under review in the same words as the design', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(result).toContain('>View all PRNs and PERNs</a>')
      expect(result).not.toContain('Search PRNs and PERNs')
    })

    test('shows the headings, warning and deadline in Welsh', async () => {
      const { result: html } = await injectAuthed(
        server,
        { method: 'GET', url: `${url}&lang=cy` },
        authHeaders
      )
      const result = html.replaceAll('&#39;', "'")

      expect(result).toContain("Sut i gyflawni'ch rhwymedigaethau ailgylchu")
      expect(result).toContain("Sut i gyflawni'r rhwymedigaeth ailgylchu gwydr")
      expect(result).toContain(
        "Rhaid i 76% o leiaf o'ch rhwymedigaeth ailgylchu gwydr fod yn PRNs neu PERNs gwydr aildoddi."
      )
      expect(result).toContain(
        "Os collwch chi'r dyddiad cau yma, fe allech chi wynebu camau gorfodi."
      )
      expect(result).toMatch(
        /Mae gennych chi tan\s*<strong>31 Ionawr \d{4}<\/strong> i gyflawni'ch rhwymedigaethau ailgylchu ar gyfer \d{4}\./
      )
      expect(result).not.toContain('You may face enforcement action')
      expect(result).not.toContain('How to meet your recycling obligations')
    })

    test('shows the submit button and page title in Welsh', async () => {
      const { result: html } = await injectAuthed(
        server,
        { method: 'GET', url: `${url}&lang=cy` },
        authHeaders
      )
      const result = html.replaceAll('&#39;', "'")

      expect(result).toContain('Cyflwyno eich tystysgrif')
      expect(result).toMatch(/<title>[^<]*Rheoli'ch rhwymedigaethau ailgylchu/)
    })

    test('lists the same link in Welsh', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: `${url}&lang=cy` },
        authHeaders
      )

      expect(result).toContain('>Gweld yr holl PERNs a PRNs</a>')
    })

    test('renders the deadline and submit sentences with the date in bold', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(result).toMatch(
        /You have until\s*<strong>31 January \d{4}<\/strong> to meet your recycling obligations for \d{4}\./
      )
      expect(result).toMatch(/Submit your certificate of compliance/)
      expect(result).toMatch(
        /An approved or delegated person must submit your \d{4} certificate of compliance before or on/
      )
      expect(result).toMatch(/31 January \d{4}/)
    })

    test('renders the submit sentence in Welsh with the date in bold', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: `${url}&lang=cy` },
        authHeaders
      )

      expect(result).toMatch(/Cyflwyno eich tystysgrif cydymffurfio/)
      expect(result).toMatch(
        /Rhaid i berson cymeradwy neu ddirprwyedig gyflwyno eich \d{4}/
      )
      expect(result).toMatch(/datganiad cydymffurfio ar/)
      expect(result).toMatch(/31 Ionawr \d{4}/)
    })

    test('shows the awaiting acceptance count', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(result).toEqual(expect.stringContaining('3'))
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs')
      )
    })

    test('hides accept/reject links when the feature flag is off', async () => {
      config.set('features.showPrns', false)

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          { method: 'GET', url },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toEqual(
          expect.stringContaining('Accept or reject PRNs and PERNs')
        )
      } finally {
        config.set('features.showPrns', true)
      }
    })

    test('prefixes links for a reverse proxy', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          `href="${FORWARDED_PREFIX}/producer/${organisationId}/prns?year=${currentYear}"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/obligations?year=${currentYear}`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    test('keeps Google Analytics on a 403 page when analytics consent is accepted', async () => {
      const previousKey = config.get('googleAnalytics.googleTagManagerKey')
      config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
      const consent = Buffer.from(
        JSON.stringify({
          confirmed: true,
          essential: true,
          analytics: true
        })
      ).toString('base64')

      try {
        const { result, statusCode, headers } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `/producer/${unauthorisedOrganisationId}/obligations?year=${currentYear}`,
            headers: mergeCookieHeaders(authHeaders, {
              cookie: `${CONSENT_COOKIE_NAME}=${consent}; _ga=GA1.1.1`
            })
          },
          authHeaders
        )

        const setCookieHeaders = [headers['set-cookie']].flat().filter(Boolean)

        expect(statusCode).toBe(statusCodes.forbidden)
        expect(result).toEqual(
          expect.stringContaining('googletagmanager.com/gtm.js')
        )
        expect(
          setCookieHeaders.some(
            (header) =>
              header.startsWith('_ga=') && header.includes('01 Jan 1970')
          )
        ).toBe(false)
        expect(result).toEqual(
          expect.stringContaining(
            "gtag('consent','update',{analytics_storage:'granted'})"
          )
        )
        expect(result.split("'gtm.start'")).toHaveLength(2)
        const defaultAt = result.indexOf("gtag('consent','default'")
        const updateAt = result.indexOf("gtag('consent','update'")
        const cookiePathAt = result.indexOf("gtag('set',{'cookie_path'")
        const startAt = result.indexOf("'gtm.start'")

        // the grant must be queued before GTM's start event
        expect(defaultAt).toBeLessThan(updateAt)
        expect(updateAt).toBeLessThan(cookiePathAt)
        expect(cookiePathAt).toBeLessThan(startAt)
        expect(result.indexOf("gtag('consent','default'")).toBeLessThan(
          result.indexOf('googletagmanager.com/gtm.js')
        )
      } finally {
        config.set('googleAnalytics.googleTagManagerKey', previousKey)
      }
    })

    test('grants consent before the direct GA4 tag when only a measurement ID is set', async () => {
      const previousKey = config.get('googleAnalytics.googleTagManagerKey')
      const previousId = config.get('googleAnalytics.measurementId')
      config.set('googleAnalytics.googleTagManagerKey', '')
      config.set('googleAnalytics.measurementId', 'G-ABC123')
      const consent = Buffer.from(
        JSON.stringify({ confirmed: true, essential: true, analytics: true })
      ).toString('base64')

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `/producer/${unauthorisedOrganisationId}/obligations?year=${currentYear}`,
            headers: mergeCookieHeaders(authHeaders, {
              cookie: `${CONSENT_COOKIE_NAME}=${consent}`
            })
          },
          authHeaders
        )
        const defaultAt = result.indexOf("gtag('consent','default'")
        const updateAt = result.indexOf("gtag('consent','update'")

        expect(statusCode).toBe(statusCodes.forbidden)
        expect(result.split("gtag('consent','update'")).toHaveLength(2)
        expect(defaultAt).toBeLessThan(updateAt)
        expect(updateAt).toBeLessThan(result.indexOf("gtag('js'"))
        expect(updateAt).toBeLessThan(result.indexOf("gtag('config'"))
        expect(result).not.toEqual(
          expect.stringContaining('googletagmanager.com/gtm.js')
        )
      } finally {
        config.set('googleAnalytics.googleTagManagerKey', previousKey)
        config.set('googleAnalytics.measurementId', previousId)
      }
    })

    test('sends a denied consent default and no tags before the user chooses', async () => {
      const previousKey = config.get('googleAnalytics.googleTagManagerKey')
      config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `/producer/${unauthorisedOrganisationId}/obligations?year=${currentYear}`
          },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.forbidden)
        expect(result).toEqual(
          expect.stringContaining(
            "gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500})"
          )
        )
        expect(result).not.toEqual(
          expect.stringContaining("'consent','update'")
        )
        expect(result).not.toEqual(
          expect.stringContaining('googletagmanager.com/gtm.js')
        )
      } finally {
        config.set('googleAnalytics.googleTagManagerKey', previousKey)
      }
    })

    test('returns 400 when the organisation id is not a GUID', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: '/producer/not-a-guid/obligations?year=2026' },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })
  })

  describe('future year', () => {
    const futureYear = 2027
    const producerUrl = `/producer/${organisationId}/obligations?year=${futureYear}`
    const csoUrl = `/cso/${schemeId}/obligations?year=${futureYear}`

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getOrganisationObligationsMock.mockResolvedValue(
        buildNoDataYetObligationsResponse()
      )
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('asks the API for the future year', async () => {
      await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      expect(getOrganisationObligationsMock).toHaveBeenCalledWith(
        organisationId,
        futureYear
      )
    })

    test('shows the future year in the heading, deadline, tile heading and accept/reject link', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Manage your ${futureYear} recycling obligations`
      )
      expect(result).toMatch(
        new RegExp(
          `You have until\\s*<strong>31 January ${futureYear + 1}</strong> to meet your recycling obligations for ${futureYear}\\.`
        )
      )
      expect(result).toContain(`Review your PRNs and PERNs for ${futureYear}`)
      expect(result).toContain(
        `Accept or reject PRNs and PERNs for ${futureYear}`
      )
      expect(result).toContain(
        `/producer/${organisationId}/prns?year=${futureYear}`
      )
    })

    test('tags every material and the totals as No data yet with dashes for the obligation', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      // six material rows (glass is aggregated) and totals, plus the two
      // glass breakdown rows and their totals
      expect(result.match(/No data yet/g)).toHaveLength(10)
      expect(result).not.toContain('govuk-tag--red')
      expect(result).not.toContain('govuk-tag--green')
      expect(result).toContain('aria-hidden="true">-</span>')
    })

    test('shows the future year for a compliance scheme', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: csoUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Manage your ${futureYear} recycling obligations`
      )
      expect(result).toContain(`/cso/${schemeId}/prns?year=${futureYear}`)
      expect(result.match(/No data yet/g)).toHaveLength(10)
    })

    test('shows the future year and the No data yet tags in Welsh', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: `${producerUrl}&lang=cy` },
        authHeaders
      )

      expect(result).toContain(String(futureYear))
      expect(result).toMatch(
        new RegExp(`<strong>31 Ionawr ${futureYear + 1}</strong>`)
      )
      expect(result).not.toContain('No data yet')
    })

    describe('content for a year with no obligations calculated', () => {
      const decemberWastePrns = {
        prns: [
          {
            id: 'prn-1',
            status: 'AwaitingAcceptance',
            obligationYear: 2026,
            decemberWaste: true
          }
        ],
        total: 1,
        page: 1,
        pageSize: 100
      }

      test('explains the obligations are not calculated yet, with the years', async () => {
        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: producerUrl },
          authHeaders
        )

        expect(result).toContain(
          'Your 2027 recycling obligations have not been calculated yet. They will be calculated after:'
        )
        expect(result).toContain('you submit your packaging data for 2026')
        expect(result).toContain(
          'your environmental regulator accepts your H1 and H2 packaging data submissions'
        )
        expect(result).toContain('Until then, you can:')
        expect(result).toContain(
          'You will see data for PRNs and PERNs you have acquired in the table below.'
        )
        expect(result).not.toContain('Acquire and accept packaging waste')
      })

      test('explains December waste with both years when an awaiting note can go to either', async () => {
        getOrganisationPrnsMock.mockResolvedValue(decemberWastePrns)

        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: producerUrl },
          authHeaders
        )

        expect(result).toContain(
          'Why does the recycling obligations table already have tonnage awaiting acceptance?'
        )
        expect(result).toContain(
          'can be accepted towards either your 2026 or 2027 recycling obligations'
        )
        expect(result).toContain(
          'will appear under ‘Tonnage awaiting acceptance’ for both 2026 and 2027'
        )
      })

      test('leaves out the December waste explanation when no note needs it', async () => {
        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: producerUrl },
          authHeaders
        )

        expect(result).not.toContain(
          'Why does the recycling obligations table already have tonnage awaiting acceptance?'
        )
      })

      test('shows the same content in Welsh', async () => {
        getOrganisationPrnsMock.mockResolvedValue(decemberWastePrns)

        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: `${producerUrl}&lang=cy` },
          authHeaders
        )

        expect(result).toContain(
          'Mae eich rhwymedigaethau ailgylchu 2027 heb gael eu cyfrifo eto.'
        )
        expect(result).toContain('Tan hynny, rydych chi’n gallu:')
        expect(result).toContain(
          'Pam mae gan y tabl rhwymedigaethau ailgylchu dunelledd yn aros i gael ei dderbyn yn barod?'
        )
        expect(result).not.toContain('have not been calculated yet')
      })

      test('does not offer to submit the certificate while nothing is calculated', async () => {
        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: producerUrl },
          authHeaders
        )

        expect(result).toContain('Review your PRNs and PERNs for 2027')
        expect(result).not.toContain('Submit your certificate of compliance')
        expect(result).not.toContain('Submit certificate')
      })

      test('does not offer to submit the statement while nothing is calculated', async () => {
        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: csoUrl },
          authHeaders
        )

        expect(result).not.toContain('Submit your statement of compliance')
        expect(result).not.toContain('Submit statement')
      })

      test('shows the usual advice when a material has data', async () => {
        getOrganisationObligationsMock.mockResolvedValue(
          buildObligationsResponse()
        )

        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: producerUrl },
          authHeaders
        )

        expect(result).toContain('Acquire and accept packaging waste')
        expect(result).not.toContain('have not been calculated yet')
        expect(result).toContain('Submit your certificate of compliance')
      })

      test('shows the same content for a compliance scheme', async () => {
        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: csoUrl },
          authHeaders
        )

        expect(result).toContain(
          'Your 2027 recycling obligations have not been calculated yet.'
        )
      })
    })

    test('shows the current year instead of a year beyond the next one', async () => {
      const { headers, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/obligations?year=2028`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/obligations?year=2026`
      )
    })

    test('shows the current year instead of next year outside December and January', async () => {
      vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))

      const { headers, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/obligations?year=2026`
      )
    })

    test.each([
      [
        'producer',
        `/producer/${organisationId}/obligations?year=2025`,
        `/producer/${organisationId}/obligations/compliance-record`
      ],
      [
        'CSO',
        `/cso/${schemeId}/obligations?year=2024`,
        `/cso/${schemeId}/obligations/compliance-record`
      ]
    ])(
      'sends the %s to the compliance record page for a year with no obligations',
      async (_label, url, expected) => {
        const { headers, statusCode } = await injectAuthed(
          server,
          { method: 'GET', url },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.redirect)
        expect(headers.location).toBe(expected)
        expect(getOrganisationObligationsMock).not.toHaveBeenCalled()
      }
    )

    test('does not redirect a user who is not enrolled in the organisation past the 403', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/obligations?year=2025`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('choose a year', () => {
    const producerUrl = `/producer/${organisationId}/obligations/choose-year`
    const csoUrl = `/cso/${schemeId}/obligations/choose-year`

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('lists the next year, the current year and 2025, none selected', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Choose a year')
      expect(result).toMatch(
        /value="2027"[\s\S]*value="2026"[\s\S]*value="2025"/
      )
      expect(result).not.toContain('checked')
      expect(result).toContain('id="csrf-crumb"')
    })

    test('does not offer the next year before December', async () => {
      vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))

      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      expect(result).not.toContain('value="2027"')
      expect(result).toContain('value="2026"')
    })

    test('shows the page in Welsh', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: `${producerUrl}?lang=cy` },
        authHeaders
      )

      expect(result).toContain('Dewiswch flwyddyn')
      expect(result).toContain('Bwrw ymlaen')
    })

    test('shows the page for a compliance scheme', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: csoUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('value="2027"')
    })

    test('POST without a year shows the error summary and field error', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url: producerUrl, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('There is a problem')
      expect(result).toContain('href="#obligationYear"')
      expect(result).toContain('Error: Choose a year')
      expect(result).toMatch(/govuk-error-message[\s\S]*Select a year/)
    })

    test('POST without a year shows the error in Welsh', async () => {
      const { result } = await injectAuthedPostForm(
        server,
        { url: `${producerUrl}?lang=cy`, payload: {} },
        authHeaders
      )

      expect(result).toMatch(/govuk-error-message[\s\S]*Dewiswch flwyddyn/)
    })

    test.each([
      [
        'producer',
        producerUrl,
        2027,
        `/producer/${organisationId}/obligations?year=2027`
      ],
      [
        'producer',
        producerUrl,
        2026,
        `/producer/${organisationId}/obligations?year=2026`
      ],
      ['CSO', csoUrl, 2027, `/cso/${schemeId}/obligations?year=2027`],
      [
        'producer',
        producerUrl,
        2025,
        `/producer/${organisationId}/obligations/compliance-record`
      ],
      ['CSO', csoUrl, 2025, `/cso/${schemeId}/obligations/compliance-record`]
    ])(
      'POST for the %s with %i redirects to the matching page',
      async (_label, url, year, expected) => {
        const { headers, statusCode } = await injectAuthedPostForm(
          server,
          { url, payload: { obligationYear: String(year) } },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.redirect)
        expect(headers.location).toBe(expected)
      }
    )

    test('POST prefixes the redirect for a reverse proxy', async () => {
      const { headers } = await injectAuthedPostForm(
        server,
        {
          url: producerUrl,
          payload: { obligationYear: '2026' },
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(headers.location).toBe(
        `${FORWARDED_PREFIX}/producer/${organisationId}/obligations?year=2026`
      )
    })

    test('has no service link missing the reverse proxy prefix', async () => {
      const { result } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: producerUrl,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('POST without a valid CSRF crumb is rejected', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'POST', url: producerUrl, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/obligations/choose-year`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    test('returns 400 when the organisation id is not a GUID', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: '/producer/not-a-guid/obligations/choose-year' },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })
  })

  describe('compliance record page', () => {
    const producerUrl = `/producer/${organisationId}/obligations/compliance-record`
    const csoUrl = `/cso/${schemeId}/obligations/compliance-record`

    test('tells a producer the 2025 certificate was processed outside the service', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your certificate of compliance record for 2025')
      expect(result).toContain(
        'We can only show certificate of compliance records for certificates that were processed by the ‘Report packaging data’ service.'
      )
      expect(result).toContain(
        'We cannot show certificates of compliance for 2025, because they were processed outside the service.'
      )
      expect(result).toContain(
        'If you have any queries, contact the Environment Agency:'
      )
      expect(result).toContain(
        'href="mailto:packagingproducers@environment-agency.gov.uk"'
      )
      expect(result).toContain(
        'You can view your PRNs and PERNs for 2025 below.'
      )
      expect(result).toContain('<h1 class="govuk-heading-xl">')
      expect(result).toContain('Your 2025 PRNs and PERNs')
      expect(result).toContain('View PRNs and PERNs issued in 2025')
      expect(result).toContain(
        'Download a list of your PRNs and PERNs for 2025 (CSV)'
      )
    })

    test('links Download to the CSV for 2025', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: producerUrl },
        authHeaders
      )
      expect(result).toContain(`href="${producerUrl}/prns.csv"`)
    })

    test('links a scheme Download link to its own CSV', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: csoUrl },
        authHeaders
      )
      expect(result).toContain(`href="${csoUrl}/prns.csv"`)
    })

    test('tells a compliance scheme the same about its statement', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: csoUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your statement of compliance record for 2025')
      expect(result).toContain(
        'We cannot show statements of compliance for 2025, because they were processed outside the service.'
      )
    })

    test('shows the page in Welsh', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url: `${producerUrl}?lang=cy` },
        authHeaders
      )

      expect(result).toContain(
        'Eich cofnod o’r dystysgrif cydymffurfio ar gyfer 2025'
      )
      expect(result).toContain(
        'Gallwch weld eich PRNs a’ch PERNs ar gyfer 2025 isod.'
      )
      expect(result).not.toContain('We cannot show')
    })

    test.each([
      [
        'GB-SCT',
        'contact the Scottish Environment Protection Agency:',
        'producer.responsibility@sepa.org.uk'
      ],
      [
        'GB-WLS',
        'contact Natural Resources Wales:',
        'packaging@naturalresourceswales.gov.uk'
      ],
      [
        'GB-NIR',
        'contact the Northern Ireland Environment Agency:',
        'packaging@daera-ni.gov.uk'
      ]
    ])(
      'names the regulator for %s',
      async (businessCountry, sentence, email) => {
        getOrganisationMock.mockResolvedValue(
          buildOrganisation({ businessCountry })
        )

        const { result } = await injectAuthed(
          server,
          { method: 'GET', url: producerUrl },
          authHeaders
        )

        expect(result).toContain(sentence)
        expect(result).toContain(`href="mailto:${email}"`)
      }
    )

    test('has no service link missing the reverse proxy prefix', async () => {
      const { result } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: producerUrl,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/obligations/compliance-record`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/cso/${unauthorisedSchemeId}/obligations/compliance-record`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('CSO obligations home', () => {
    const url = `/cso/${schemeId}/obligations?year=${currentYear}`

    test('renders the manage obligations page for a scheme', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Manage your'))
      expect(result).toEqual(expect.stringContaining('recycling obligations'))
      expect(result).toEqual(
        expect.stringContaining('Submit your statement of compliance')
      )
      expect(result).toEqual(expect.stringContaining('Submit your statement'))
    })

    test('prefixes links for a reverse proxy', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          `href="${FORWARDED_PREFIX}/cso/${schemeId}/prns?year=${currentYear}"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/cso/${unauthorisedSchemeId}/obligations?year=${currentYear}`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('basic user permissions', () => {
    let basicUserAuthHeaders

    beforeAll(async () => {
      basicUserAuthHeaders = await authenticate(server, {
        serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
      })
    })

    afterAll(() => {
      server.app.backendAccountApi = createMockBackendAccountApiService()
    })

    test.each([
      [
        'producer obligations',
        `/producer/${organisationId}/obligations?year=${currentYear}`
      ],
      ['CSO obligations', `/cso/${schemeId}/obligations?year=${currentYear}`],
      [
        'producer choose a year',
        `/producer/${organisationId}/obligations/choose-year`
      ],
      ['CSO choose a year', `/cso/${schemeId}/obligations/choose-year`],
      [
        'producer compliance record',
        `/producer/${organisationId}/obligations/compliance-record`
      ],
      [
        'CSO compliance record',
        `/cso/${schemeId}/obligations/compliance-record`
      ]
    ])('returns 200 for basic users on the %s page', async (_label, url) => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        basicUserAuthHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  test('returns 400 for a year that is not a whole number', async () => {
    const { statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/producer/${organisationId}/obligations?year=abc`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
  })

  test('returns 400 when year is missing', async () => {
    const { statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/producer/${organisationId}/obligations`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
  })

  describe('PRNs and PERNs CSV download', () => {
    const producerCsvUrl = `/producer/${organisationId}/obligations/compliance-record/prns.csv`
    const csoCsvUrl = `/cso/${schemeId}/obligations/compliance-record/prns.csv`
    const prnFor = (id, obligationYear) => ({
      id,
      number: `PRN-${id}`,
      type: 'PRN',
      status: 'Accepted',
      issuedAt: '2025-03-04T10:00:00.000Z',
      obligationYear,
      material: 'Plastic',
      tonnage: 5,
      issuer: { organisationName: 'Reprocessor Ltd' },
      recipient: { displayName: 'Producer Ltd' },
      audit: { acceptedAt: '2025-04-05T09:00:00.000Z' }
    })

    test.each([
      ['producer', producerCsvUrl],
      ['compliance scheme', csoCsvUrl]
    ])('downloads the 2025 PRNs of a %s as a CSV', async (_, url) => {
      getOrganisationPrnsMock.mockResolvedValue({
        prns: [prnFor('1', 2025), prnFor('2', 2026)],
        total: 2,
        page: 1,
        pageSize: 100
      })

      const response = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.headers['content-type']).toContain('text/csv')
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename="PRNDetail_2025.csv"'
      )
      expect(response.result).toContain('PRN or PERN number,')
      expect(response.result).toContain('PRN-1,')
      expect(response.result).not.toContain('PRN-2,')
    })

    test('says there is nothing to download when no PRN is for 2025', async () => {
      getOrganisationPrnsMock.mockResolvedValue({
        prns: [prnFor('2', 2026)],
        total: 1,
        page: 1,
        pageSize: 100
      })

      const { result, statusCode, headers } = await injectAuthed(
        server,
        { method: 'GET', url: producerCsvUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['content-type']).toContain('text/html')
      expect(result).toContain(
        'You have no PRNs or PERNs issued to your 2025 recycling obligations.'
      )
    })

    test('fails with a server error when the PRNs cannot be loaded', async () => {
      getOrganisationPrnsMock.mockRejectedValue(new Error('boom'))

      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: producerCsvUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/obligations/compliance-record/prns.csv`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})

describe('obligations routes when manageObligations is disabled', () => {
  let server
  let authHeaders
  let previousManageObligationsFlag

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    config.set('features.manageObligations', false)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
  })

  test.each([
    ['producer', `/producer/${organisationId}/obligations`],
    ['CSO', `/cso/${schemeId}/obligations`],
    ['producer', `/producer/${organisationId}/obligations/choose-year`],
    ['CSO', `/cso/${schemeId}/obligations/choose-year`],
    ['producer', `/producer/${organisationId}/obligations/compliance-record`],
    ['CSO', `/cso/${schemeId}/obligations/compliance-record`]
  ])('does not register the %s route %s', async (label, url) => {
    const { statusCode } = await injectAuthed(
      server,
      { method: 'GET', url },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
