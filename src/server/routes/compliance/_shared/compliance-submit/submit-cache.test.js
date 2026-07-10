import { describe, expect, test, vi } from 'vitest'

import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'
import { certificateSubmitCacheSchema } from '#/server/routes/compliance/producer/certificate-submit/schemas.js'

import {
  buildSubmitCacheKey,
  createSubmitCacheOperations
} from './submit-cache.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const userId = 'e72be574-8b5b-4836-af47-dd7e0c0d1d87'

const { write, readRaw } = createSubmitCacheOperations({
  label: 'certificate-submit',
  schema: certificateSubmitCacheSchema
})

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
    regulatorEmail: 'packagingproducers@environment-agency.gov.uk',
    ...overrides
  }
}

describe('buildSubmitCacheKey', () => {
  test('builds a namespaced cache key', () => {
    expect(
      buildSubmitCacheKey('certificate', userId, organisationId, 2026)
    ).toBe(`compliance-certificate-submit:${userId}:${organisationId}:2026`)
    expect(buildSubmitCacheKey('statement', userId, organisationId, 2026)).toBe(
      `compliance-statement-submit:${userId}:${organisationId}:2026`
    )
  })
})

describe('createSubmitCacheOperations', () => {
  test('writes validated JSON to Redis', async () => {
    const cacheClient = { set: vi.fn().mockResolvedValue('OK') }
    const payload = validCachePayload()

    await write(cacheClient, 'cache-key', payload)

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
      write(cacheClient, 'cache-key', { organisationId: 'not-a-guid' })
    ).rejects.toBeInstanceOf(RedisCacheValidationError)
    expect(cacheClient.set).not.toHaveBeenCalled()
  })

  test('returns null when cache entry is missing', async () => {
    const cacheClient = { get: vi.fn().mockResolvedValue(null) }

    await expect(readRaw(cacheClient, 'cache-key')).resolves.toBeNull()
  })

  test('returns null when cache entry is empty', async () => {
    const cacheClient = { get: vi.fn().mockResolvedValue('') }

    await expect(readRaw(cacheClient, 'cache-key')).resolves.toBeNull()
  })

  test('returns validated payload when cache entry is valid', async () => {
    const payload = validCachePayload()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify(payload))
    }

    await expect(readRaw(cacheClient, 'cache-key')).resolves.toMatchObject({
      organisationId,
      obligationStatus: 'Met'
    })
  })

  test('throws RedisCacheValidationError for invalid JSON', async () => {
    const cacheClient = {
      get: vi.fn().mockResolvedValue('{not-valid-json')
    }

    await expect(readRaw(cacheClient, 'cache-key')).rejects.toMatchObject({
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

    await expect(readRaw(cacheClient, 'cache-key')).rejects.toBeInstanceOf(
      RedisCacheValidationError
    )
  })
})
