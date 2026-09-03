import { describe, expect, test, vi } from 'vitest'
import Boom from '@hapi/boom'

import { ApiError } from '#/server/services/base/api-error.js'

import {
  COMPLIANCE_SUBMIT_TYPES,
  handleComplianceSubmitFailure,
  isComplianceSubmitApiUnavailable,
  logComplianceSubmitFailure
} from './submit-error.js'

describe('isComplianceSubmitApiUnavailable', () => {
  test('returns true for 5xx API errors', () => {
    expect(
      isComplianceSubmitApiUnavailable(new ApiError({ status: 503 }))
    ).toBe(true)
  })

  test('returns true for request timeout API errors', () => {
    expect(
      isComplianceSubmitApiUnavailable(new ApiError({ status: 408 }))
    ).toBe(true)
  })

  test('returns false for 404 API errors', () => {
    expect(
      isComplianceSubmitApiUnavailable(new ApiError({ status: 404 }))
    ).toBe(false)
  })

  test('returns true for network errors', () => {
    expect(
      isComplianceSubmitApiUnavailable(new TypeError('fetch failed'))
    ).toBe(true)
  })
})

describe('logComplianceSubmitFailure', () => {
  test('logs organisationId and year without PII', () => {
    const logger = { error: vi.fn() }
    const error = new ApiError({ status: 503 })

    logComplianceSubmitFailure(
      { logger },
      {
        organisationId: 'org-1',
        year: 2026,
        complianceType: COMPLIANCE_SUBMIT_TYPES.certificate,
        error
      }
    )

    expect(logger.error).toHaveBeenCalledWith(
      { err: error },
      'Failed to create compliance declaration (organisationId=org-1, year=2026, complianceType=certificate, status=503)'
    )
  })
})

describe('handleComplianceSubmitFailure', () => {
  test('throws bad implementation when API is unavailable', () => {
    const logger = { error: vi.fn() }
    const request = { logger, query: {} }
    const error = new ApiError({ status: 503 })

    try {
      handleComplianceSubmitFailure(
        request,
        {},
        {
          organisationId: 'org-1',
          year: 2026,
          complianceType: COMPLIANCE_SUBMIT_TYPES.certificate,
          error
        }
      )
      expect.fail('Expected handleComplianceSubmitFailure to throw')
    } catch (thrown) {
      expect(thrown).toEqual(Boom.badImplementation())
    }

    expect(logger.error).toHaveBeenCalled()
  })

  test('throws when API error is not an availability failure', () => {
    const logger = { error: vi.fn() }
    const request = { logger, query: {} }
    const error = new ApiError({ status: 404 })

    expect(() =>
      handleComplianceSubmitFailure(
        request,
        {},
        {
          organisationId: 'org-1',
          year: 2026,
          complianceType: COMPLIANCE_SUBMIT_TYPES.certificate,
          error
        }
      )
    ).toThrow('Unable to submit compliance declaration')
  })
})
