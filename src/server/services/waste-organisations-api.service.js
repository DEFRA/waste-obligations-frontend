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
    const cachedOrganisation = await this.getCachedJson(cacheKey)

    if (cachedOrganisation) {
      return cachedOrganisation
    }

    const organisation = await this.getJson(
      `/organisations/${organisationId}`,
      this.getTracingHeader(traceId)
    )

    await this.setCachedJson(cacheKey, organisation)

    return organisation
  }
}

export function createWasteOrganisationsApiService(options = {}) {
  return new WasteOrganisationsApiService({
    baseUrl: config.get('wasteOrganisationsApi.baseUrl'),
    cacheTtlMs: config.get('wasteOrganisationsApi.cacheTtlMs'),
    authMode: config.get('wasteOrganisationsApi.authMode'),
    clientId: config.get('wasteOrganisationsApi.clientId'),
    clientSecret: config.get('wasteOrganisationsApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
