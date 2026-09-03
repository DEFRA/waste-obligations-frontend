import { describe, expect, test } from 'vitest'

import { validateRedisCache } from '#/server/common/helpers/validate-redis-cache.js'

import {
  certificateSubmitCacheSchema,
  certificateSubmitPostPayloadSchema
} from './schemas.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

const validCachePayload = {
  organisation: {
    id: organisationId,
    name: 'Example Org',
    address: {
      addressLine1: '1 High Street',
      town: 'Bristol',
      postcode: 'BS1 1AA'
    },
    registrations: [
      {
        type: 'LARGE_PRODUCER',
        status: 'REGISTERED',
        registrationYear: 2026,
        updated: '2026-05-18T11:20:00Z'
      }
    ]
  },
  organisationId,
  obligationYear: 2026,
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
  ],
  obligationStatus: 'Met',
  regulatorName: 'Environment Agency',
  regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
}

describe('certificateSubmitPostPayloadSchema', () => {
  test('accepts fullName values', () => {
    const value = validateRedisCache(
      certificateSubmitPostPayloadSchema,
      { fullName: '  Jane Doe  ' },
      'certificate-submit-post'
    )

    expect(value.fullName).toBe('  Jane Doe  ')
  })

  test('defaults missing fullName to empty string', () => {
    const value = validateRedisCache(
      certificateSubmitPostPayloadSchema,
      {},
      'certificate-submit-post'
    )

    expect(value.fullName).toBe('')
  })
})

describe('certificateSubmitCacheSchema', () => {
  test('accepts valid certificate submit cache payload', () => {
    const value = validateRedisCache(
      certificateSubmitCacheSchema,
      validCachePayload,
      'certificate-submit'
    )

    expect(value.organisationId).toBe(organisationId)
  })

  test('rejects payload without organisation id', () => {
    const { id: _removed, ...organisationWithoutId } =
      validCachePayload.organisation

    expect(() =>
      validateRedisCache(
        certificateSubmitCacheSchema,
        {
          ...validCachePayload,
          organisation: organisationWithoutId
        },
        'certificate-submit'
      )
    ).toThrow()
  })

  test('rejects invalid obligation status', () => {
    expect(() =>
      validateRedisCache(
        certificateSubmitCacheSchema,
        {
          ...validCachePayload,
          obligationStatus: 'Pending'
        },
        'certificate-submit'
      )
    ).toThrow()
  })

  test('rejects declarationText in cache payload', () => {
    expect(() =>
      validateRedisCache(
        certificateSubmitCacheSchema,
        {
          ...validCachePayload,
          declarationText: {
            intro: 'Intro',
            language: 'en',
            bullets: ['Bullet']
          }
        },
        'certificate-submit'
      )
    ).toThrow()
  })
})
