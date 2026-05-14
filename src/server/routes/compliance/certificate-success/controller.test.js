import { describe, expect, test, vi } from 'vitest'

import { certificateSuccessController } from './controller.js'

describe('certificateSuccessController', () => {
  test('uses latest compliance declaration for the obligation year (WireMock list shape)', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-ENG' },
        declarations: {
          complianceDeclarations: [
            {
              id: 'older',
              created: '2026-01-01T10:00:00Z',
              updated: '2026-01-01T10:00:00Z',
              obligationYear: 2026,
              obligationStatus: 'Met',
              user: { email: 'older@example.com' }
            },
            {
              id: 'newer',
              created: '2026-02-01T10:00:00Z',
              updated: '2026-02-15T12:00:00Z',
              obligationYear: 2026,
              obligationStatus: 'NotMet',
              user: { email: 'newer@example.com' }
            }
          ]
        },
        obligations: {
          obligations: [
            {
              material: 'Plastic',
              recyclingTarget: 0.75,
              tonnages: {
                material: 100,
                awaitingAcceptance: 0,
                accepted: 100,
                outstanding: 0,
                obligated: 75
              },
              status: 'Met'
            }
          ]
        }
      },
      app: { traceId: 't1' },
      logger: { error: vi.fn() }
    }

    const { model } = await certificateSuccessController.handler(request, h)

    expect(model).toMatchObject({
      organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      year: 2026,
      obligationStatusKey:
        'compliance.certificateSubmit.obligationStatus.notMet',
      approvedUserEmail: 'newer@example.com',
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packaging-producers@environment-agency.gov.uk',
      publicRegisterUrl:
        'https://report-packaging-data.defra.gov.uk/public-register'
    })
  })

  test('falls back to obligations payload when no declaration for the year', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-SCT' },
        declarations: { complianceDeclarations: [] },
        obligations: {
          obligations: [
            {
              material: 'Plastic',
              recyclingTarget: 0.75,
              tonnages: {
                material: 100,
                awaitingAcceptance: 0,
                accepted: 100,
                outstanding: 0,
                obligated: 75
              },
              status: 'Met'
            }
          ]
        }
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBe(
      'compliance.certificateSubmit.obligationStatus.met'
    )
    expect(model.approvedUserEmail).toBe('')
    expect(model.regulatorName).toBe('Scottish Environment Protection Agency')
    expect(model.regulatorEmail).toBe('producer.responsibility@sepa.org.uk')
  })

  test('empty status when declarations and obligations are absent or empty', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-NIR' },
        declarations: null,
        obligations: null
      },
      app: {},
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBeNull()
    expect(model.approvedUserEmail).toBe('')
  })
})
