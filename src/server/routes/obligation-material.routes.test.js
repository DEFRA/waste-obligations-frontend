import { vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_BASIC_USER_SERVICE_ROLE,
  EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE
} from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
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

function obligation(material, recyclingTarget, reported, obligated) {
  return {
    material,
    recyclingTarget,
    tonnages: {
      material: reported,
      awaitingAcceptance: 5,
      accepted: 20,
      outstanding: Math.max(obligated - 20, 0),
      obligated
    },
    status: 'NotMet'
  }
}

const obligationsResponse = {
  obligations: [
    obligation('Aluminium', 0.62, 100, 62),
    obligation('Plastic', 0.5, 200, 100),
    obligation('GlassRemelt', 0.76, 1000, 61),
    obligation('Glass', 0.8, 1000, 19)
  ]
}

function mockObligationApis(server) {
  server.app.wasteOrganisationsApi = {
    getOrganisation: vi.fn().mockResolvedValue({
      id: organisationId,
      name: 'Example Operator Ltd',
      businessCountry: 'GB-ENG'
    })
  }
  server.app.wasteObligationsApi = {
    getOrganisationObligations: vi.fn().mockResolvedValue(obligationsResponse),
    getOrganisationPrns: vi
      .fn()
      .mockResolvedValue({ prns: [], total: 0, page: 1, pageSize: 100 })
  }
}

describe('obligation material calculation routes', () => {
  let server
  let authHeaders
  let previousManageObligationsFlag

  const get = (url, headers) =>
    injectAuthed(server, { method: 'GET', url, headers }, authHeaders)

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    config.set('features.manageObligations', true)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    mockObligationApis(server)
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
  })

  describe('producer', () => {
    const url = (material) =>
      `/producer/${organisationId}/obligations/${material}?year=${currentYear}`

    test('explains how the aluminium obligation was calculated', async () => {
      const { result, statusCode } = await get(url('aluminium'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Your ${currentYear} recycling obligation for aluminium`
      )
      expect(result).toContain('Example Operator Ltd')
      expect(result).toContain('Environment Agency')
      expect(result).toContain(
        `Current status of your aluminium recycling obligation`
      )
      expect(result).toContain('How we calculated your recycling obligation')
      expect(result).toContain(
        'We applied the formula set out in the 2024 regulations to calculate your total aluminium obligation:'
      )
      expect(result).toContain('X x Y = Z')
      expect(result).toContain(
        'is 100 tonnes (the total amount of aluminium you reported to the nearest tonne)'
      )
      expect(result).toContain(
        'is 62% (recycling target for aluminium set by the 2024 regulations)'
      )
      expect(result).toContain('100 tonnes x 62% = 62 tonnes.')
      expect(result).not.toContain('Plastic')
    })

    test('styles the table and status tags as the obligations page does', async () => {
      const { result } = await get(url('aluminium'))

      expect(result).toContain('class="app-obligation-material"')
      expect(result).toContain('app-obligations-table')
    })

    test('shows the table caption above the table', async () => {
      const { result } = await get(url('aluminium'))

      expect(result).toMatch(
        /<caption class="govuk-table__caption govuk-table__caption--m">\s*Current status of your aluminium recycling obligation/
      )
    })

    test('links to the regulations in a new window', async () => {
      const { result } = await get(url('aluminium'))

      expect(result).toMatch(
        /<a href="https:\/\/www\.legislation\.gov\.uk\/ukdsi\/2024\/9780348264654\/contents"[^>]*target="_blank"[^>]*>\s*Producer Responsibility Obligations \(Packaging and Packaging Waste\) Regulations 2024 \(opens in new tab\)\s*<\/a>/
      )
      expect(result).toMatch(/rel="noreferrer noopener"/)
    })

    test('scrolls the table on a narrow screen like the compliance tables', async () => {
      const { result } = await get(url('aluminium'))

      expect(result).toContain('app-certificate-table-scroll')
      expect(result).toContain('role="region"')
      expect(result).toContain('tabindex="0"')
    })

    test('warns the user to contact the regulator about incorrect data and links back', async () => {
      const { result } = await get(url('aluminium'))

      expect(result).toContain(
        'If you believe your data is incorrect, contact your regulator immediately.'
      )
      expect(result).toContain(
        `href="/producer/${organisationId}/obligations?year=${currentYear}"`
      )
      expect(result).toContain('Back to your recycling obligations')
    })

    test('shows the glass breakdown with its introduction above the table', async () => {
      const { result, statusCode } = await get(url('glass'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Your ${currentYear} recycling obligation for glass`
      )
      expect(result).toContain(
        'This table shows how your total recycling obligation for glass is divided between glass re-melt and remaining glass.'
      )
      expect(result.indexOf('This table shows how your total')).toBeLessThan(
        result.indexOf('<table')
      )
      expect(result).toContain('Glass re-melt')
      expect(result).toContain('Remaining glass')
      expect(result).toContain(
        'Current status of your glass recycling obligation'
      )
      expect(result).toContain('1,000 tonnes x 80% = 80</strong>.')
      expect(result).toContain(
        `the total glass material you reported for ${currentYear} to the nearest tonne`
      )
      expect(result).toContain('76% x (1,000 tonnes x 80%) = 61 tonnes')
      expect(result).toContain('80 tonnes - 61 tonnes = 19 tonnes')
    })

    test('shows no calculation while the glass data is not available yet', async () => {
      server.app.wasteObligationsApi.getOrganisationObligations.mockResolvedValue(
        {
          obligations: [
            obligation('GlassRemelt', 0, 0, 0),
            obligation('Glass', 0, 0, 0)
          ]
        }
      )

      const { result, statusCode } = await get(url('glass'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Current status of your glass recycling obligation'
      )
      expect(result).not.toContain(
        'How we calculated your recycling obligation'
      )
      expect(result).not.toContain('0 tonnes x 0%')
    })

    test('does not show the glass introduction on other materials', async () => {
      const { result } = await get(url('plastic'))

      expect(result).not.toContain('This table shows how your total')
    })

    test('shows the Welsh content when Welsh is chosen', async () => {
      const { result, statusCode } = await get(`${url('aluminium')}&lang=cy`)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Eich rhwymedigaeth ailgylchu ar gyfer ${currentYear} ar gyfer alwminiwm`
      )
      expect(result).toContain(
        'Sut cafodd eich rhwymedigaeth ailgylchu ei gyfrifo'
      )
      expect(result).toContain('Yn ôl i&#39;ch rhwymedigaeth ailgylchu')
      expect(result).toContain('Cynhyrchydd:')
      expect(result).toContain('Rheoleiddiwr:')
      expect(result).toContain('Asiantaeth yr Amgylchedd')
      expect(result).toContain('Rhwymedigaethau ailgylchu i&#39;w cyflawni')
      expect(result).toContain('Tunelli yn aros i gael eu derbyn')
      expect(result).toContain('Heb ei gyflawni')
      expect(result).toContain(
        'yw 100 o dunelli (cyfanswm y alwminiwm y rhoesoch chi wybod amdano, i&#39;r dunnell agosaf)'
      )
    })

    test('shows the glass T line in Welsh when Welsh is chosen', async () => {
      const { result, statusCode } = await get(`${url('glass')}&lang=cy`)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'yw 76% (y targed ailgylchu ar gyfer gwydr aildoddi a osodwyd gan reoliadau 2024)'
      )
      expect(result).not.toContain('recycling target for glass re-melt')
    })

    test.each([
      ['', '(opens in new tab)'],
      ['&lang=cy', '(yn agor mewn tab newydd)']
    ])(
      'says the regulations link opens in a new tab (%s)',
      async (lang, cue) => {
        const { result } = await get(`${url('aluminium')}${lang}`)
        const link = result.match(
          /<a href="https:\/\/www\.legislation\.gov\.uk[^"]*"[^>]*>([^<]*)<\/a>/
        )

        expect(link[1].trim().endsWith(cue)).toBe(true)
      }
    )

    test('prefixes links for a reverse proxy', async () => {
      const { result, statusCode } = await get(url('aluminium'), {
        'x-forwarded-prefix': FORWARDED_PREFIX
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `href="${FORWARDED_PREFIX}/producer/${organisationId}/obligations?year=${currentYear}"`
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test.each(['tin', 'glass-remelt', 'Aluminium'])(
      'returns 400 for the unknown material "%s"',
      async (material) => {
        const { statusCode } = await get(url(material))

        expect(statusCode).toBe(statusCodes.badRequest)
      }
    )

    test('returns 400 for a year that is not a whole number', async () => {
      const { statusCode } = await get(
        `/producer/${organisationId}/obligations/aluminium?year=abc`
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    describe('year rules', () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      test.each([
        [
          'producer',
          `/producer/${organisationId}/obligations/aluminium?year=2025`,
          `/producer/${organisationId}/obligations/compliance-record`
        ],
        [
          'CSO',
          `/cso/${schemeId}/obligations/aluminium?year=1999`,
          `/cso/${schemeId}/obligations/compliance-record`
        ]
      ])(
        'sends the %s to the compliance record page for a year with no obligations',
        async (_label, url, expected) => {
          const { headers, statusCode } = await get(url)

          expect(statusCode).toBe(statusCodes.redirect)
          expect(headers.location).toBe(expected)
        }
      )

      test('shows the current year for the same material when next year is not offered yet', async () => {
        const { headers, statusCode } = await get(
          `/producer/${organisationId}/obligations/aluminium?year=2027`
        )

        expect(statusCode).toBe(statusCodes.redirect)
        expect(headers.location).toBe(
          `/producer/${organisationId}/obligations/aluminium?year=2026`
        )
      })

      test('shows next year from December', async () => {
        vi.setSystemTime(new Date('2026-12-01T12:00:00Z'))

        const { statusCode } = await get(
          `/producer/${organisationId}/obligations/aluminium?year=2027`
        )

        expect(statusCode).toBe(statusCodes.ok)
      })
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await get(
        `/producer/${unauthorisedOrganisationId}/obligations/aluminium?year=${currentYear}`
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('compliance scheme', () => {
    const url = (material) =>
      `/cso/${schemeId}/obligations/${material}?year=${currentYear}`

    test('keeps the Welsh compliance scheme label', async () => {
      const { result } = await get(`${url('plastic')}&lang=cy`)

      expect(result).toContain('Cynllun cydymffurfio:')
      expect(result).not.toContain('Compliance Scheme:')
    })

    test('shows the English label in sentence case', async () => {
      const { result } = await get(url('plastic'))

      expect(result).toContain('Compliance scheme:')
      expect(result).not.toContain('Compliance Scheme:')
    })

    test('shows the compliance scheme name, not its operator organisation name', async () => {
      const { result } = await get(url('plastic'))

      expect(result).toContain('Test Compliance Scheme')
      expect(result).not.toContain('Example Operator Ltd')
    })

    test('labels the compliance scheme rather than the producer', async () => {
      const { result, statusCode } = await get(url('plastic'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Your ${currentYear} recycling obligation for plastic`
      )
      expect(result).toContain('Compliance scheme:')
      expect(result).not.toContain('Producer:')
      expect(result).toContain('200 tonnes x 50% = 100 tonnes.')
      expect(result).toContain(
        `href="/cso/${schemeId}/obligations?year=${currentYear}"`
      )
    })

    test('prefixes links for a reverse proxy', async () => {
      const { result } = await get(url('glass'), {
        'x-forwarded-prefix': FORWARDED_PREFIX
      })

      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await get(
        `/cso/${unauthorisedSchemeId}/obligations/plastic?year=${currentYear}`
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})

describe('obligation material calculation routes for every service role', () => {
  let server
  let previousManageObligationsFlag

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    config.set('features.manageObligations', true)
    ;({ server } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    mockObligationApis(server)
  })

  afterAll(async () => {
    server.app.backendAccountApi = createMockBackendAccountApiService()
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
  })

  const serviceRoles = [
    EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
    EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE,
    EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
  ]

  const pages = [
    [
      'producer',
      `/producer/${organisationId}/obligations/aluminium?year=${currentYear}`
    ],
    ['CSO', `/cso/${schemeId}/obligations/aluminium?year=${currentYear}`]
  ]

  test.each(
    serviceRoles.flatMap((serviceRole) =>
      pages.map(([label, url]) => [serviceRole, label, url])
    )
  )(
    'returns 200 for %s on the %s material page',
    async (serviceRole, _label, url) => {
      const authHeaders = await authenticate(server, { serviceRole })

      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
    }
  )
})

describe('obligation material calculation routes for a user without a recognised service role', () => {
  let server
  let previousManageObligationsFlag

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    config.set('features.manageObligations', true)
    ;({ server } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    mockObligationApis(server)
  })

  afterAll(async () => {
    server.app.backendAccountApi = createMockBackendAccountApiService()
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
  })

  test.each([
    [
      'producer',
      `/producer/${organisationId}/obligations/aluminium?year=${currentYear}`
    ],
    ['CSO', `/cso/${schemeId}/obligations/aluminium?year=${currentYear}`]
  ])('returns 403 on the %s material page', async (_label, url) => {
    const authHeaders = await authenticate(server, {
      serviceRole: 'Unrecognised Role'
    })

    const { statusCode } = await injectAuthed(
      server,
      { method: 'GET', url },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  test.each([
    ['producer', `/producer/${organisationId}/obligations/aluminium`],
    ['CSO', `/cso/${schemeId}/obligations/aluminium`]
  ])(
    'redirects a signed-out request on the %s material page to sign in',
    async (_label, path) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: `${path}?year=${currentYear}`
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/signin-oidc')
    }
  )
})

describe('obligation material calculation routes when manageObligations is disabled', () => {
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
    [
      'producer',
      `/producer/${organisationId}/obligations/aluminium?year=${currentYear}`
    ],
    ['CSO', `/cso/${schemeId}/obligations/aluminium?year=${currentYear}`]
  ])(
    'shows the page not found error on the %s material route',
    async (_label, url) => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(result).toContain('Page not found')

      expect(statusCode).toBe(statusCodes.notFound)
    }
  )
})
