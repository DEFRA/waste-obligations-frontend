import { describe, expect, test, vi } from 'vitest'

import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'

import {
  buildCertificateSubmitCacheKey,
  buildCertificateSubmitDeclarationText,
  formatOrganisationAddress,
  formatOrganisationName,
  readCertificateSubmitCacheRaw,
  writeCertificateSubmitCache
} from './utils.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const userId = 'e72be574-8b5b-4836-af47-dd7e0c0d1d87'

function validCachePayload(overrides = {}) {
  return {
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
    regulatorEmail: 'packaging-producers@environment-agency.gov.uk',
    ...overrides
  }
}

describe('buildCertificateSubmitCacheKey', () => {
  test('builds a namespaced cache key', () => {
    expect(buildCertificateSubmitCacheKey(userId, organisationId, 2026)).toBe(
      `compliance-certificate-submit:${userId}:${organisationId}:2026`
    )
  })
})

describe('formatOrganisationAddress', () => {
  test('returns empty string for null address', () => {
    expect(formatOrganisationAddress(null)).toBe('')
  })

  test('trims a string address', () => {
    expect(formatOrganisationAddress('  10 High Street  ')).toBe(
      '10 High Street'
    )
  })

  test('joins structured address fields', () => {
    expect(
      formatOrganisationAddress({
        addressLine1: '1 The Street',
        town: 'Cardiff',
        postcode: 'CF10 1AA'
      })
    ).toBe('1 The Street, Cardiff, CF10 1AA')
  })
})

describe('formatOrganisationName', () => {
  test('returns organisation name for large producer', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Direct Producer Ltd',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Direct Producer Ltd')
  })

  test('returns trading name for compliance scheme', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Scheme Parent Ltd',
          tradingName: 'Scheme Trading Name',
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Scheme Trading Name')
  })

  test('throws when no registration exists for the year', () => {
    expect(() =>
      formatOrganisationName(
        {
          name: 'Example Org',
          registrations: []
        },
        2026
      )
    ).toThrow('No registration found, using year 2026')
  })

  test('returns empty string when organisation is null', () => {
    expect(formatOrganisationName(null, 2026)).toBe('')
  })

  test('returns empty string when organisation is not an object', () => {
    expect(formatOrganisationName('invalid', 2026)).toBe('')
  })

  test('throws when registrations property is missing', () => {
    expect(() =>
      formatOrganisationName(
        {
          name: 'Example Org'
        },
        2026
      )
    ).toThrow('No registration found, using year 2026')
  })
})

describe('buildCertificateSubmitDeclarationText', () => {
  test('builds declaration text for the locale', () => {
    const declarationText = buildCertificateSubmitDeclarationText(
      'en',
      'Example Org'
    )

    expect(declarationText.language).toBe('en')
    expect(declarationText.intro).toEqual(expect.any(String))
    expect(declarationText.bullets.length).toBeGreaterThan(0)
  })
})

describe('writeCertificateSubmitCache', () => {
  test('validates and writes JSON to Redis', async () => {
    const cacheClient = { set: vi.fn().mockResolvedValue('OK') }
    const payload = validCachePayload()

    await writeCertificateSubmitCache(cacheClient, 'cache-key', payload)

    expect(cacheClient.set).toHaveBeenCalledWith(
      'cache-key',
      expect.any(String)
    )
    expect(JSON.parse(cacheClient.set.mock.calls[0][1])).toMatchObject({
      organisationId,
      obligationYear: 2026
    })
  })

  test('rejects invalid payload before writing to Redis', async () => {
    const cacheClient = { set: vi.fn() }

    await expect(
      writeCertificateSubmitCache(cacheClient, 'cache-key', {
        organisationId: 'not-a-guid'
      })
    ).rejects.toBeInstanceOf(RedisCacheValidationError)
    expect(cacheClient.set).not.toHaveBeenCalled()
  })
})

describe('readCertificateSubmitCacheRaw', () => {
  test('returns null when cache entry is missing', async () => {
    const cacheClient = { get: vi.fn().mockResolvedValue(null) }

    await expect(
      readCertificateSubmitCacheRaw(cacheClient, 'cache-key')
    ).resolves.toBeNull()
  })

  test('returns validated payload when cache entry is valid', async () => {
    const payload = validCachePayload()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify(payload))
    }

    await expect(
      readCertificateSubmitCacheRaw(cacheClient, 'cache-key')
    ).resolves.toMatchObject({
      organisationId,
      obligationStatus: 'Met'
    })
  })

  test('throws RedisCacheValidationError for invalid JSON', async () => {
    const cacheClient = {
      get: vi.fn().mockResolvedValue('{not-valid-json')
    }

    await expect(
      readCertificateSubmitCacheRaw(cacheClient, 'cache-key')
    ).rejects.toMatchObject({
      name: 'RedisCacheValidationError',
      cacheLabel: 'certificate-submit'
    })
  })

  test('throws RedisCacheValidationError when payload fails schema', async () => {
    const cacheClient = {
      get: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify(validCachePayload({ obligationStatus: 'Pending' }))
        )
    }

    await expect(
      readCertificateSubmitCacheRaw(cacheClient, 'cache-key')
    ).rejects.toBeInstanceOf(RedisCacheValidationError)
  })
})
