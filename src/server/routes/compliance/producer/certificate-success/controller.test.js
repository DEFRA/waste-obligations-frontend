import { describe, expect, test, vi } from 'vitest'

import { MOCK_AUTH_USER_EMAIL } from '#/test-helpers/auth-test-constants.js'

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
      regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
    },
    ...overrides
  }
}

function buildRequest(declarationOverrides = {}) {
  return {
    params: {
      organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      complianceDeclarationId
    },
    query: {},
    pre: {
      complianceDeclaration: buildDeclaration(declarationOverrides)
    },
    yar: {
      get: vi.fn().mockReturnValue({ email: MOCK_AUTH_USER_EMAIL })
    },
    app: { traceId: 't1' },
    logger: { error: vi.fn() }
  }
}

describe('certificateSuccessController', () => {
  test('renders success page from compliance declaration API response', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = buildRequest()

    const { model } = await certificateSuccessController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/producer/certificate-success/index',
      expect.objectContaining({
        organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        year: 2026,
        userEmail: MOCK_AUTH_USER_EMAIL,
        regulatorName: 'Environment Agency',
        regulatorEmail: 'packagingproducers@environment-agency.gov.uk',
        obligationStatusBulletKey:
          'compliance.components.success.publicRegisterBullet1NotMet',
        publicRegisterUrl:
          'https://report-packaging-data.defra.gov.uk/public-register',
        certificateViewHref: `/compliance/producer/b6f76437-65b6-4ed2-a7d5-c50e9af76201/certificate/${complianceDeclarationId}`
      })
    )
    expect(model.userEmail).toBe(MOCK_AUTH_USER_EMAIL)
  })

  test('uses regulator details from the compliance declaration organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = buildRequest({
      obligationStatus: 'Met',
      organisation: {
        regulator: 'Scottish Environment Protection Agency',
        regulatorEmail: 'producer.responsibility@sepa.org.uk'
      }
    })

    const model = await certificateSuccessController.handler(request, h)

    expect(model.regulatorName).toBe('Scottish Environment Protection Agency')
    expect(model.regulatorEmail).toBe('producer.responsibility@sepa.org.uk')
    expect(model.obligationStatusBulletKey).toBe(
      'compliance.components.success.publicRegisterBullet1Met'
    )
  })
})
