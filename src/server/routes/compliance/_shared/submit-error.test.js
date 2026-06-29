import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '#/server/services/base/api-error.js'

import {
  COMPLIANCE_SUBMIT_TYPES,
  handleComplianceSubmitFailure,
  isComplianceSubmitApiUnavailable,
  logComplianceSubmitFailure,
  renderComplianceSubmitError
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

describe('renderComplianceSubmitError', () => {
  test('renders shared submit error view for certificate', () => {
    const view = vi.fn().mockReturnValue('VIEW')
    const result = renderComplianceSubmitError({ view }, 'certificate')

    expect(view).toHaveBeenCalledWith(
      'compliance/submit-error/index',
      expect.objectContaining({
        complianceType: 'certificate'
      })
    )
    expect(result).toBe('VIEW')
  })

  test('renders shared submit error view for statement', () => {
    const view = vi.fn().mockReturnValue('VIEW')
    renderComplianceSubmitError({ view }, 'statement')

    expect(view).toHaveBeenCalledWith(
      'compliance/submit-error/index',
      expect.objectContaining({
        complianceType: 'statement'
      })
    )
  })
})

describe('handleComplianceSubmitFailure', () => {
  test('renders submit error page when API is unavailable', () => {
    const logger = { error: vi.fn() }
    const view = vi.fn().mockReturnValue('VIEW')
    const request = { logger, query: {} }
    const error = new ApiError({ status: 503 })

    const result = handleComplianceSubmitFailure(
      request,
      { view },
      {
        organisationId: 'org-1',
        year: 2026,
        complianceType: COMPLIANCE_SUBMIT_TYPES.certificate,
        error
      }
    )

    expect(result).toBe('VIEW')
    expect(logger.error).toHaveBeenCalled()
  })

  test('throws when API error is not an availability failure', () => {
    const logger = { error: vi.fn() }
    const request = { logger, query: {} }
    const error = new ApiError({ status: 404 })

    expect(() =>
      handleComplianceSubmitFailure(
        request,
        { view: vi.fn() },
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
