import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import {
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'

// A year the targets table has no entry for: aluminium is looked up in it, so
// the real lookup finds no aluminium target for the page's year.
const YEAR_WITHOUT_TARGETS = 2031

vi.mock('#/config/material-targets.js', async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    getMaterialTarget: (materialCode, year) =>
      actual.getMaterialTarget(
        materialCode,
        materialCode === 'AL' ? YEAR_WITHOUT_TARGETS : year
      )
  }
})

const organisationId = MOCK_AUTH_ORGANISATION_ID
const currentYear = getComplianceYear()

function obligation(material, reported, obligated) {
  return {
    material,
    tonnages: {
      material: reported,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: obligated,
      obligated
    },
    status: 'NotMet'
  }
}

describe('obligation material calculation routes when a material has no target for the year', () => {
  let server
  let authHeaders
  let previousManageObligationsFlag

  const get = (material) =>
    injectAuthed(
      server,
      {
        method: 'GET',
        url: `/producer/${organisationId}/obligations/${material}?year=${currentYear}`
      },
      authHeaders
    )

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
      getOrganisationObligations: vi.fn().mockResolvedValue({
        obligations: [
          obligation('Aluminium', 100, 62),
          obligation('Plastic', 200, 114)
        ]
      }),
      getOrganisationPrns: vi
        .fn()
        .mockResolvedValue({ prns: [], total: 0, page: 1, pageSize: 100 })
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
  })

  test("shows the generic system error page and no other year's target", async () => {
    const { result, statusCode } = await get('aluminium')

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Sorry, there is a problem with the service')
    expect(result).not.toContain('recycling target for aluminium')
    expect(result).not.toMatch(/\d+%/)
  })

  test('still shows the target for a material that has one', async () => {
    const { result, statusCode } = await get('plastic')

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toMatch(
      /is \d+% \(recycling target for plastic set by the 2024 regulations\)/
    )
  })
})
