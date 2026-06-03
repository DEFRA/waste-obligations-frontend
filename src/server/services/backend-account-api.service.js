import { config } from '#/config/config.js'
import { BaseApiService } from '#/server/services/base/base-api.service.js'

export class BackendAccountApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'backend-account'
    })
  }

  async getUserOrganisations(userId, traceId) {
    const path = `/users/user-organisations?userId=${encodeURIComponent(userId)}`

    return this.getJson(path, this.getTracingHeader(traceId))
  }
}

export function createBackendAccountApiService(options = {}) {
  return new BackendAccountApiService({
    baseUrl: config.get('backendAccountApi.baseUrl'),
    authMode: config.get('backendAccountApi.authMode'),
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
