import { describe, expect, test, vi } from 'vitest'

import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'

import {
  buildStatementSubmitCacheKey,
  formatComplianceSchemeName,
  readStatementSubmitCacheRaw,
  resolveOperatorOrganisationNumber,
  writeStatementSubmitCache
} from './utils.js'

const schemeId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const operatorOrganisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const userId = 'e72be574-8b5b-4836-af47-dd7e0c0d1d87'

function validCachePayload(overrides = {}) {
  return {
    organisation: {
      id: schemeId,
      name: 'Compliance Scheme Ltd',
      address: {
        addressLine1: '1 High Street',
        town: 'Bristol',
        postcode: 'BS1 1AA'
      },
      registrations: [
        {
          type: 'COMPLIANCE_SCHEME',
          status: 'REGISTERED',
          registrationYear: 2026,
          updated: '2026-05-18T11:20:00Z'
        }
      ]
    },
    schemeId,
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
    organisationNumber: '100003',
    ...overrides
  }
}

describe('buildStatementSubmitCacheKey', () => {
  test('builds a namespaced cache key', () => {
    expect(buildStatementSubmitCacheKey(userId, schemeId, 2026)).toBe(
      `compliance-statement-submit:${userId}:${schemeId}:2026`
    )
  })
})

describe('formatComplianceSchemeName', () => {
  test('returns trading name for compliance scheme organisation', () => {
    expect(
      formatComplianceSchemeName(
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
})

describe('resolveOperatorOrganisationNumber', () => {
  test('returns empty string when operator organisation id is missing', () => {
    const request = {
      pre: {},
      yar: {
        get: () => ({
          organisations: [
            { id: operatorOrganisationId, organisationNumber: '100003' }
          ]
        })
      }
    }

    expect(resolveOperatorOrganisationNumber(request)).toBe('')
  })

  test('returns organisation number for the operator organisation', () => {
    const request = {
      pre: {
        currentComplianceScheme: {
          operatorOrganisationId
        }
      },
      yar: {
        get: () => ({
          organisations: [
            { id: operatorOrganisationId, organisationNumber: '100003' }
          ]
        })
      }
    }

    expect(resolveOperatorOrganisationNumber(request)).toBe('100003')
  })
})

describe('writeStatementSubmitCache', () => {
  test('validates and writes JSON to Redis', async () => {
    const cacheClient = { set: vi.fn().mockResolvedValue('OK') }
    const payload = validCachePayload()

    await writeStatementSubmitCache(cacheClient, 'cache-key', payload)

    expect(cacheClient.set).toHaveBeenCalledWith(
      'cache-key',
      expect.any(String)
    )
    expect(JSON.parse(cacheClient.set.mock.calls[0][1])).toMatchObject({
      schemeId,
      obligationYear: 2026
    })
  })

  test('rejects invalid payload before writing to Redis', async () => {
    const cacheClient = { set: vi.fn() }

    await expect(
      writeStatementSubmitCache(cacheClient, 'cache-key', {
        schemeId: 'not-a-guid'
      })
    ).rejects.toBeInstanceOf(RedisCacheValidationError)
    expect(cacheClient.set).not.toHaveBeenCalled()
  })
})

describe('readStatementSubmitCacheRaw', () => {
  test('returns null when cache entry is missing', async () => {
    const cacheClient = { get: vi.fn().mockResolvedValue(null) }

    await expect(
      readStatementSubmitCacheRaw(cacheClient, 'cache-key')
    ).resolves.toBeNull()
  })

  test('returns validated payload when cache entry is valid', async () => {
    const payload = validCachePayload()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify(payload))
    }

    await expect(
      readStatementSubmitCacheRaw(cacheClient, 'cache-key')
    ).resolves.toMatchObject({
      schemeId,
      obligationStatus: 'Met'
    })
  })
})
