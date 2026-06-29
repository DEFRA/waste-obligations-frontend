import { describe, expect, test, vi } from 'vitest'

import { COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL } from '#/config/constants.js'
import { MOCK_AUTH_USER_EMAIL } from '#/test-helpers/auth-test-constants.js'

import { statementSuccessController } from './controller.js'

const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

function buildDeclaration(overrides = {}) {
  return {
    id: complianceDeclarationId,
    obligationYear: 2026,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    organisation: {
      regulator: 'Environment Agency',
      regulatorEmail: 'packaging-producers@environment-agency.gov.uk'
    },
    ...overrides
  }
}

describe('statementSuccessController', () => {
  test('renders success page with declaration and logged in user details', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: {
        schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
        complianceDeclarationId
      },
      query: {},
      pre: {
        complianceDeclaration: buildDeclaration()
      },
      yar: {
        get: vi.fn().mockReturnValue({ email: MOCK_AUTH_USER_EMAIL })
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const { model } = await statementSuccessController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/cso/statement-success/index',
      {
        year: 2026,
        userEmail: MOCK_AUTH_USER_EMAIL,
        regulatorName: 'Environment Agency',
        regulatorEmail: 'packaging-producers@environment-agency.gov.uk',
        regulation43ComplianceKey:
          'compliance.components.success.publicRegisterRegulation43Complied',
        publicRegisterUrl: COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL
      }
    )
    expect(model.userEmail).toBe(MOCK_AUTH_USER_EMAIL)
  })

  test('shows not complied regulation 43 text when obligations are not met', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: {
        schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
        complianceDeclarationId
      },
      query: {},
      pre: {
        complianceDeclaration: buildDeclaration({
          obligationStatus: 'NotMet',
          isRegulation43Compliant: true
        })
      },
      yar: {
        get: vi.fn().mockReturnValue({ email: MOCK_AUTH_USER_EMAIL })
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await statementSuccessController.handler(request, h)

    expect(model.regulation43ComplianceKey).toBe(
      'compliance.components.success.publicRegisterRegulation43NotComplied'
    )
  })
})
