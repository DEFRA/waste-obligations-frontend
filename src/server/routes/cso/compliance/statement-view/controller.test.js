import { describe, expect, test, vi } from 'vitest'

import { statementViewController, statementViewUrl } from './controller.js'

const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
const schemeId = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

describe('statementViewController', () => {
  test('renders statement view from compliance declaration API response', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId, complianceDeclarationId },
      query: {},
      pre: {
        complianceDeclaration: {
          id: complianceDeclarationId,
          created: '2026-04-02T14:00:00+00:00',
          obligationYear: 2026,
          obligationStatus: 'Met',
          isRegulation43Compliant: true,
          organisation: {
            complianceSchemeName: 'Example Compliance Scheme',
            schemeOperatorName: 'Scheme Operator Ltd',
            referenceNumber: '100003',
            address: { addressLine1: '1 High Street', town: 'Bristol' },
            regulator: 'Environment Agency'
          },
          obligations: [
            {
              material: 'Plastic',
              tonnages: {
                obligated: 75,
                awaitingAcceptance: 0,
                accepted: 75,
                outstanding: 0
              },
              status: 'Met'
            }
          ],
          submitterName: 'Jane Doe',
          audit: [
            {
              action: 'Submitted',
              user: {
                id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
                email: 'account@example.com',
                name: 'Account User'
              },
              timestamp: '2026-04-02T14:00:00+00:00'
            }
          ]
        }
      }
    }

    const { model } = await statementViewController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'cso/compliance/statement-view/index',
      expect.objectContaining({
        schemeId,
        year: 2026,
        complianceSchemeName: 'Example Compliance Scheme',
        nameOnAccount: 'Account User',
        submitterName: 'Jane Doe',
        complianceStatus: expect.objectContaining({
          variant: 'met',
          straplineKey: 'obligationsMetCompliedStrapline'
        })
      })
    )
    expect(model.submissionDate).toBe('2 April 2026')
  })
})

describe('statementViewUrl', () => {
  test('builds the statement view path with compliance declaration id', () => {
    expect(statementViewUrl('scheme-1', 'en', complianceDeclarationId)).toBe(
      `/cso/scheme-1/compliance/statement/${complianceDeclarationId}`
    )
  })

  test('appends Welsh lang query when locale is cy', () => {
    expect(statementViewUrl('scheme-1', 'cy', complianceDeclarationId)).toBe(
      `/cso/scheme-1/compliance/statement/${complianceDeclarationId}?lang=cy`
    )
  })
})
