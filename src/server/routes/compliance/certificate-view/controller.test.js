import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'

import { certificateViewController, certificateViewUrl } from './controller.js'
import { buildCertificateSubmitDeclarationText } from '../certificate-submit/utils.js'
import { formatCertificateSubmitDeclarationApiText } from '../certificate-submit/utils.js'

describe('certificateViewController', () => {
  test('renders certificate view when declaration exists', async () => {
    const declarationText = buildCertificateSubmitDeclarationText(
      'en',
      'Example Org'
    )
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      yar: {
        get: vi.fn(() => ({ firstName: 'Test', lastName: 'User' }))
      },
      pre: {
        currentOrganisation: { organisationNumber: '100003' },
        organisation: {
          name: 'Example Org',
          businessCountry: 'GB-ENG',
          address: { addressLine1: '1 High Street', town: 'Bristol' },
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        declarations: [
          {
            id: 'declaration-1',
            created: '2026-04-02T14:00:00+00:00',
            obligationYear: 2026,
            obligationStatus: 'Met',
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
        ]
      }
    }

    const { model } = await certificateViewController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/certificate-view/index',
      expect.objectContaining({
        organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        year: 2026,
        nameOnAccount: 'Test User',
        submitterName: 'Jane Doe'
      })
    )
    expect(model.submissionDate).toBe('2 April 2026')
  })

  test('throws not found when no declaration exists for the year', async () => {
    const h = { view: vi.fn() }
    const request = {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      query: { year: 2026 },
      yar: { get: vi.fn(() => ({ firstName: 'Test', lastName: 'User' })) },
      pre: {
        currentOrganisation: { organisationNumber: '100003' },
        organisation: { name: 'Example Org' },
        declarations: []
      }
    }

    let error
    try {
      await certificateViewController.handler(request, h)
    } catch (caught) {
      error = caught
    }

    expect(Boom.isBoom(error)).toBe(true)
    expect(error.output.statusCode).toBe(404)
    expect(h.view).not.toHaveBeenCalled()
  })
})

describe('certificateViewUrl', () => {
  test('builds the certificate view path with year', () => {
    expect(certificateViewUrl('org-1', 2026, 'en')).toBe(
      '/compliance/org-1/certificate/view?year=2026'
    )
  })

  test('appends Welsh lang query when locale is cy', () => {
    expect(certificateViewUrl('org-1', 2026, 'cy')).toBe(
      '/compliance/org-1/certificate/view?year=2026&lang=cy'
    )
  })
})
