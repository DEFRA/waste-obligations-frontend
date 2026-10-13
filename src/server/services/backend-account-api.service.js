import { config } from '#/config/config.js'
import { BaseApiService } from '#/server/services/base/base-api.service.js'
import {
  userOrganisationsResponseSchema,
  operatorComplianceSchemesResponseSchema
} from '#/server/services/schemas/backend-account.schemas.js'

export class BackendAccountApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'backend-account'
    })
  }

  async getUserOrganisations(userId) {
    const path = `/users/user-organisations?userId=${encodeURIComponent(userId)}`

    return this.getJson(path, null, userOrganisationsResponseSchema)
  }

  async getComplianceSchemesForOperator(organisationId) {
    const path = `/compliance-schemes/get-for-operator?organisationId=${encodeURIComponent(organisationId)}`

    return this.getJson(path, null, operatorComplianceSchemesResponseSchema)
  }
}

export function createBackendAccountApiService(options = {}) {
  return new BackendAccountApiService({
    baseUrl: config.get('backendAccountApi.baseUrl'),
    authMode: config.get('backendAccountApi.authMode'),
    tracingHeader: config.get('tracing.header'),
    clientId: config.get('backendAccountApi.clientId'),
    clientSecret: config.get('backendAccountApi.clientSecret'),
    scope: config.get('backendAccountApi.scope'),
    tokenEndpoint: config.get('backendAccountApi.tokenEndpoint'),
    ...options
  })
}
