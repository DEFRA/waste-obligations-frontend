import { describe, expect, test, vi } from 'vitest'

import { certificateViewController, certificateViewUrl } from './controller.js'
import { buildCertificateSubmitDeclarationText } from '../certificate-submit/utils.js'
import { formatCertificateSubmitDeclarationApiText } from '../certificate-submit/utils.js'

const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('certificateViewController', () => {
  test('renders certificate view from compliance declaration API response', async () => {
    const declarationText = buildCertificateSubmitDeclarationText(
      'en',
      'Example Org'
    )
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId, complianceDeclarationId },
      query: {},
      yar: {
        get: vi.fn(() => ({ firstName: 'Test', lastName: 'User' }))
      },
      pre: {
        complianceDeclaration: {
          id: complianceDeclarationId,
          created: '2026-04-02T14:00:00+00:00',
          obligationYear: 2026,
          obligationStatus: 'Met',
          organisation: {
            name: 'Example Org',
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
          declarationText: {
            text: formatCertificateSubmitDeclarationApiText(declarationText),
            language: 'en'
          },
          submitterName: 'Jane Doe'
        }
      }
    }

    const { model } = await certificateViewController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/producer/certificate-view/index',
      expect.objectContaining({
        organisationId,
        year: 2026,
        nameOnAccount: 'Test User',
        submitterName: 'Jane Doe'
      })
    )
    expect(model.submissionDate).toBe('2 April 2026')
  })
})

describe('certificateViewUrl', () => {
  test('builds the certificate view path with compliance declaration id', () => {
    expect(certificateViewUrl('org-1', 'en', complianceDeclarationId)).toBe(
      `/compliance/producer/org-1/certificate/${complianceDeclarationId}`
    )
  })

  test('appends Welsh lang query when locale is cy', () => {
    expect(certificateViewUrl('org-1', 'cy', complianceDeclarationId)).toBe(
      `/compliance/producer/org-1/certificate/${complianceDeclarationId}?lang=cy`
    )
  })
})
