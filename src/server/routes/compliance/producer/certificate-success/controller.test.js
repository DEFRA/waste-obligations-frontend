import { describe, expect, test, vi } from 'vitest'

import { certificateSuccessController } from './controller.js'

const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

function buildDeclaration(overrides = {}) {
  return {
    id: complianceDeclarationId,
    created: '2026-02-15T12:00:00Z',
    updated: '2026-02-15T12:00:00Z',
    obligationYear: 2026,
    obligationStatus: 'NotMet',
    organisation: {
      regulator: 'Environment Agency',
      regulatorEmail: 'packaging-producers@environment-agency.gov.uk'
    },
    ...overrides
  }
}

describe('certificateSuccessController', () => {
  test('renders success page from compliance declaration API response', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: {
        organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        complianceDeclarationId
      },
      query: {},
      pre: {
        complianceDeclaration: buildDeclaration()
      },
      app: { traceId: 't1' },
      logger: { error: vi.fn() }
    }

    const { model } = await certificateSuccessController.handler(request, h)

    expect(model).toMatchObject({
      organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      year: 2026,
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packaging-producers@environment-agency.gov.uk',
      publicRegisterUrl:
        'https://report-packaging-data.defra.gov.uk/public-register',
      certificateViewHref: `/compliance/producer/b6f76437-65b6-4ed2-a7d5-c50e9af76201/certificate/${complianceDeclarationId}`
    })
  })

  test('uses regulator details from the compliance declaration organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: {
        organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        complianceDeclarationId
      },
      query: {},
      pre: {
        complianceDeclaration: buildDeclaration({
          obligationStatus: 'Met',
          organisation: {
            regulator: 'Scottish Environment Protection Agency',
            regulatorEmail: 'producer.responsibility@sepa.org.uk'
          }
        })
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.regulatorName).toBe('Scottish Environment Protection Agency')
    expect(model.regulatorEmail).toBe('producer.responsibility@sepa.org.uk')
  })
})
