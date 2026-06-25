import { describe, expect, test, vi } from 'vitest'

import { statementSuccessController } from './controller.js'

const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

describe('statementSuccessController', () => {
  test('renders placeholder success page from compliance declaration', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: {
        schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
        complianceDeclarationId
      },
      query: {},
      pre: {
        complianceDeclaration: {
          id: complianceDeclarationId,
          obligationYear: 2026
        }
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const { model } = await statementSuccessController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/cso/statement-success/index',
      { year: 2026 }
    )
    expect(model).toEqual({ year: 2026 })
  })
})
