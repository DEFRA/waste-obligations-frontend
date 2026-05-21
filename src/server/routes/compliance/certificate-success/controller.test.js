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
        declarations: [
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
        ],
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
        declarations: [],
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
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBe(
      'compliance.certificateSubmit.obligationStatus.met'
    )
    expect(model.regulatorName).toBe('Scottish Environment Protection Agency')
    expect(model.regulatorEmail).toBe('producer.responsibility@sepa.org.uk')
  })

  test('picks latest declaration using created when updated is absent', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-ENG' },
        declarations: [
          {
            id: 'older',
            created: '2026-01-01T10:00:00Z',
            obligationYear: 2026,
            obligationStatus: 'Met',
            user: { email: 'older@example.com' }
          },
          {
            id: 'newer',
            created: '2026-06-01T10:00:00Z',
            obligationYear: 2026,
            obligationStatus: 'NotMet',
            user: { email: 'newer@example.com' }
          }
        ],
        obligations: []
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBe(
      'compliance.certificateSubmit.obligationStatus.notMet'
    )
  })

  test('ignores declarations for other obligation years', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-ENG' },
        declarations: [
          {
            id: 'other-year',
            created: '2026-06-01T10:00:00Z',
            obligationYear: 2025,
            obligationStatus: 'NotMet',
            user: { email: 'other@example.com' }
          }
        ],
        obligations: [
          {
            material: 'Wood',
            tonnages: {
              obligated: 80,
              awaitingAcceptance: 0,
              accepted: 0,
              outstanding: 80
            },
            status: 'NotMet'
          }
        ]
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBe(
      'compliance.certificateSubmit.obligationStatus.notMet'
    )
  })

  test('keeps the earlier declaration when a later row has an older timestamp', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-ENG' },
        declarations: [
          {
            id: 'best',
            created: '2026-06-01T10:00:00Z',
            updated: '2026-06-15T12:00:00Z',
            obligationYear: 2026,
            obligationStatus: 'Met',
            user: { email: 'best@example.com' }
          },
          {
            id: 'older',
            created: '2026-07-01T10:00:00Z',
            updated: '2026-01-01T10:00:00Z',
            obligationYear: 2026,
            obligationStatus: 'NotMet',
            user: { email: 'older@example.com' }
          }
        ],
        obligations: []
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBe(
      'compliance.certificateSubmit.obligationStatus.met'
    )
  })

  test('defaults to Met status from obligations when declarations are absent', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      pre: {
        organisation: { businessCountry: 'GB-NIR' },
        declarations: null,
        obligations: []
      },
      app: {},
      logger: { error: vi.fn() }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatusKey).toBe(
      'compliance.certificateSubmit.obligationStatus.met'
    )
  })
})
