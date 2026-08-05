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
      regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
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
      expect.objectContaining({
        year: 2026,
        userEmail: MOCK_AUTH_USER_EMAIL,
        regulatorName: 'the Environment Agency',
        regulatorEmail: 'packagingproducers@environment-agency.gov.uk',
        publicRegisterUrl: COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL,
        statementViewHref: `/compliance/cso/a1b2c3d4-e5f6-4789-abcd-ef1234567890/statement/${complianceDeclarationId}`
      })
    )
    expect(model.userEmail).toBe(MOCK_AUTH_USER_EMAIL)
  })

  test('uses regulator details from the declaration organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: {
        schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
        complianceDeclarationId
      },
      query: {},
      pre: {
        complianceDeclaration: buildDeclaration({
          organisation: {
            regulator: 'Natural Resources Wales',
            regulatorEmail: 'packaging@naturalresourceswales.gov.uk'
          }
        })
      },
      yar: {
        get: vi.fn().mockReturnValue({ email: MOCK_AUTH_USER_EMAIL })
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await statementSuccessController.handler(request, h)

    expect(model.regulatorName).toBe('Natural Resources Wales')
    expect(model.regulatorEmail).toBe('packaging@naturalresourceswales.gov.uk')
  })

  test('prefixes the statement view link for a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: {
        schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
        complianceDeclarationId
      },
      headers: {
        'x-forwarded-prefix': '/manage-recycling-obligations'
      },
      pre: { complianceDeclaration: buildDeclaration() },
      yar: {
        get: vi.fn().mockReturnValue({ email: MOCK_AUTH_USER_EMAIL })
      }
    }

    const model = await statementSuccessController.handler(request, h)

    expect(model.statementViewHref).toBe(
      `/manage-recycling-obligations/compliance/cso/${request.params.schemeId}/statement/${complianceDeclarationId}`
    )
  })

  test('falls back to an empty user email when session user is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }
    const request = {
      params: {
        schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
        complianceDeclarationId
      },
      pre: { complianceDeclaration: buildDeclaration() },
      yar: {
        get: vi.fn().mockReturnValue(undefined)
      }
    }

    const model = await statementSuccessController.handler(request, h)

    expect(model.userEmail).toBe('')
  })
})
