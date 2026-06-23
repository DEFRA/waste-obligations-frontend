import { describe, expect, test, vi, beforeEach } from 'vitest'
import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { currentComplianceScheme } from './current-compliance-scheme.js'

const operatorOrganisationId = '94bfc917-b9b6-45d7-847b-e5f500bfe198'
const complianceSchemeId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'

function buildRequest(overrides = {}) {
  const yarStore = new Map([
    [
      'user',
      {
        id: '579c319d-d552-47a2-bf4c-5a125a3183bc',
        organisations: [{ id: operatorOrganisationId }]
      }
    ]
  ])

  return {
    params: { schemeId: complianceSchemeId },
    query: { year: '2026' },
    yar: {
      get: (key) => yarStore.get(key),
      set: (key, value) => yarStore.set(key, value)
    },
    logger: { warn: vi.fn() },
    server: {
      app: {
        backendAccountApi: {
          getComplianceSchemesForOperator: vi.fn(),
          getUserOrganisations: vi.fn().mockResolvedValue({
            user: {
              organisations: [{ id: operatorOrganisationId }]
            }
          })
        }
      }
    },
    ...overrides
  }
}

describe('currentComplianceScheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('loads organisations from account service for the logged-in user', async () => {
    const request = buildRequest()
    const scheme = {
      id: complianceSchemeId,
      name: 'Compliance Scheme Name'
    }

    request.server.app.backendAccountApi.getComplianceSchemesForOperator.mockResolvedValue(
      [scheme]
    )

    await currentComplianceScheme.method(request)

    expect(
      request.server.app.backendAccountApi.getUserOrganisations
    ).toHaveBeenCalledWith('579c319d-d552-47a2-bf4c-5a125a3183bc')
  })

  test('resolves scheme when path schemeId matches operator scheme', async () => {
    const request = buildRequest()
    const scheme = {
      id: complianceSchemeId,
      name: 'Compliance Scheme Name'
    }

    request.server.app.backendAccountApi.getComplianceSchemesForOperator.mockResolvedValue(
      [scheme]
    )

    const result = await currentComplianceScheme.method(request)

    expect(result).toEqual({
      scheme,
      schemeId: complianceSchemeId,
      operatorOrganisationId
    })
    expect(
      request.server.app.backendAccountApi.getComplianceSchemesForOperator
    ).toHaveBeenCalledWith(operatorOrganisationId)
  })

  test('resolves single scheme when path schemeId is the operator organisation id', async () => {
    const request = buildRequest({
      params: { schemeId: operatorOrganisationId }
    })
    const scheme = {
      id: complianceSchemeId,
      name: 'Compliance Scheme Name'
    }

    request.server.app.backendAccountApi.getComplianceSchemesForOperator.mockResolvedValue(
      [scheme]
    )

    const result = await currentComplianceScheme.method(request)

    expect(result).toEqual({
      scheme,
      schemeId: complianceSchemeId,
      operatorOrganisationId
    })
  })

  test('loads organisations from account service when session org list is empty', async () => {
    const yarStore = new Map([
      [
        'user',
        {
          id: '579c319d-d552-47a2-bf4c-5a125a3183bc',
          organisations: []
        }
      ]
    ])
    const request = buildRequest({
      yar: {
        get: (key) => yarStore.get(key),
        set: (key, value) => yarStore.set(key, value)
      }
    })
    const scheme = {
      id: complianceSchemeId,
      name: 'Compliance Scheme Name'
    }

    request.server.app.backendAccountApi.getUserOrganisations.mockResolvedValue(
      {
        user: {
          organisations: [{ id: operatorOrganisationId }]
        }
      }
    )
    request.server.app.backendAccountApi.getComplianceSchemesForOperator.mockResolvedValue(
      [scheme]
    )

    const result = await currentComplianceScheme.method(request)

    expect(result.scheme).toEqual(scheme)
    expect(yarStore.get('user')).toEqual({
      id: '579c319d-d552-47a2-bf4c-5a125a3183bc',
      organisations: [{ id: operatorOrganisationId }]
    })
  })

  test('returns forbidden when operator scheme cannot be resolved', async () => {
    const request = buildRequest()

    request.server.app.backendAccountApi.getComplianceSchemesForOperator.mockResolvedValue(
      []
    )

    await expect(currentComplianceScheme.method(request)).rejects.toEqual(
      Boom.forbidden()
    )
  })

  test('returns bad implementation when operator scheme lookup fails', async () => {
    const request = buildRequest()

    request.server.app.backendAccountApi.getComplianceSchemesForOperator.mockRejectedValue(
      new ApiError({
        message: 'upstream failure',
        status: statusCodes.badGateway
      })
    )

    await expect(currentComplianceScheme.method(request)).rejects.toEqual(
      Boom.badImplementation()
    )
  })
})
