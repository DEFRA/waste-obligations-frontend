import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { complianceDeclaration } from './compliance-declaration.js'

describe('complianceDeclaration middleware', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
  const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

  test('loads compliance declaration from path params', async () => {
    const declaration = { id: complianceDeclarationId, obligationYear: 2026 }
    const getComplianceDeclaration = vi.fn().mockResolvedValue(declaration)
    const request = {
      params: { organisationId, complianceDeclarationId },
      query: {},
      server: { app: { wasteObligationsApi: { getComplianceDeclaration } } },
      logger: { warn: vi.fn() }
    }

    const result = await complianceDeclaration.method(request)

    expect(getComplianceDeclaration).toHaveBeenCalledWith(
      organisationId,
      complianceDeclarationId
    )
    expect(result).toBe(declaration)
  })

  test('loads compliance declaration from query when path param is absent', async () => {
    const declaration = { id: complianceDeclarationId, obligationYear: 2026 }
    const getComplianceDeclaration = vi.fn().mockResolvedValue(declaration)
    const request = {
      params: { organisationId },
      query: { complianceDeclarationId },
      server: { app: { wasteObligationsApi: { getComplianceDeclaration } } },
      logger: { warn: vi.fn() }
    }

    const result = await complianceDeclaration.method(request)

    expect(getComplianceDeclaration).toHaveBeenCalledWith(
      organisationId,
      complianceDeclarationId
    )
    expect(result).toBe(declaration)
  })

  test('throws not found when API returns 404', async () => {
    const getComplianceDeclaration = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ status: statusCodes.notFound, message: 'Not found' })
      )
    const request = {
      params: { organisationId },
      query: { complianceDeclarationId },
      server: { app: { wasteObligationsApi: { getComplianceDeclaration } } },
      logger: { warn: vi.fn() }
    }

    let error
    try {
      await complianceDeclaration.method(request)
    } catch (caught) {
      error = caught
    }

    expect(Boom.isBoom(error)).toBe(true)
    expect(error.output.statusCode).toBe(statusCodes.notFound)
  })

  test('throws bad implementation when API returns a non-404 error', async () => {
    const upstreamError = new ApiError({
      status: statusCodes.badGateway,
      message: 'upstream failure'
    })
    const getComplianceDeclaration = vi.fn().mockRejectedValue(upstreamError)
    const logger = { warn: vi.fn() }
    const request = {
      params: { organisationId },
      query: { complianceDeclarationId },
      server: { app: { wasteObligationsApi: { getComplianceDeclaration } } },
      logger
    }

    let error
    try {
      await complianceDeclaration.method(request)
    } catch (caught) {
      error = caught
    }

    expect(Boom.isBoom(error)).toBe(true)
    expect(error.output.statusCode).toBe(statusCodes.internalServerError)
    expect(logger.warn).toHaveBeenCalledWith(
      { err: upstreamError },
      `Failed to load compliance declaration: organisationId=${organisationId}, complianceDeclarationId=${complianceDeclarationId}`
    )
  })
})
