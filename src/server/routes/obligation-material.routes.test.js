import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import { MOCK_COMPLIANCE_SCHEME_ID } from '#/test-helpers/mock-backend-account-api.js'
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
    server.app.wasteOrganisationsApi = {
      getOrganisation: vi.fn().mockResolvedValue({
        id: organisationId,
        name: 'Example Operator Ltd',
        businessCountry: 'GB-ENG'
      })
    }
    server.app.wasteObligationsApi = {
      getOrganisationObligations: vi
        .fn()
        .mockResolvedValue(obligationsResponse),
      getOrganisationPrns: vi
        .fn()
        .mockResolvedValue({ prns: [], total: 0, page: 1, pageSize: 100 })
    }
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
      expect(result).toContain('Environment Agency (England)')
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

    test('links to the regulations in a new window', async () => {
      const { result } = await get(url('aluminium'))

      expect(result).toMatch(
        /<a href="https:\/\/www\.legislation\.gov\.uk\/ukdsi\/2024\/9780348264654\/contents"[^>]*target="_blank"[^>]*>\s*Producer Responsibility Obligations \(Packaging and Packaging Waste\) Regulations 2024\s*<\/a>/
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
      expect(result).toContain('Glass remelt')
      expect(result).toContain('Remaining glass')
      expect(result).toContain('Total glass obligation')
      expect(result).toContain('1,000 tonnes x 80% = 80 tonnes')
      expect(result).toContain(
        `the total glass material you reported for ${currentYear - 1} to the nearest tonne`
      )
      expect(result).toContain('76% x (1,000 tonnes x 80%) = 61 tonnes')
      expect(result).toContain('80 tonnes - 61 tonnes = 19 tonnes')
    })

    test('does not show the glass introduction on other materials', async () => {
      const { result } = await get(url('plastic'))

      expect(result).not.toContain('This table shows how your total')
    })

    test('shows the Welsh content when Welsh is chosen', async () => {
      const { result, statusCode } = await get(`${url('aluminium')}&lang=cy`)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `Eich rhwymedigaeth ailgylchu ar gyfer alwminiwm ar gyfer ${currentYear}`
      )
      expect(result).toContain(
        'Sut cafodd eich rhwymedigaeth ailgylchu ei gyfrifo'
      )
      expect(result).toContain('Yn ôl i&#39;ch rhwymedigaeth ailgylchu')
      expect(result).toContain('Cynhyrchydd:')
      expect(result).toContain('Rheoleiddiwr:')
      expect(result).toContain('Asiantaeth yr Amgylchedd (Lloegr)')
    })

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

    test('returns 400 for a year outside the compliance years', async () => {
      const { statusCode } = await get(
        `/producer/${organisationId}/obligations/aluminium?year=1999`
      )

      expect(statusCode).toBe(statusCodes.badRequest)
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
