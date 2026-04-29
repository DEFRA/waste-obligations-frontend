import { config } from '#/config/config.js'
import { BaseApiService } from './base/base-api.service.js'

export class WasteOrganisationsApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'waste-organisations'
    })
  }

  async getOrganisation(organisationId, traceId) {
    const cacheKey = this.buildCacheKey('organisation', organisationId)

    return this.getJson(
      `/organisations/${organisationId}`,
      this.getTracingHeader(traceId),
      cacheKey
    )
  }
}

export function createWasteOrganisationsApiService(options = {}) {
  return new WasteOrganisationsApiService({
    baseUrl: config.get('wasteOrganisationsApi.baseUrl'),
    authMode: config.get('wasteOrganisationsApi.authMode'),
    clientId: config.get('wasteOrganisationsApi.clientId'),
    clientSecret: config.get('wasteOrganisationsApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
