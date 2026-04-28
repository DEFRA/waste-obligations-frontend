import { config } from '#/config/config.js'
import { BaseApiService } from './base/base-api.service.js'

export class WasteOrganisationsApiService extends BaseApiService {
  async getOrganisation(organisationId, traceId) {
    const cacheKey = this.buildCacheKey(
      'waste-organisations',
      'organisation',
      organisationId
    )
    const cachedOrganisation = await this.getCachedJson(cacheKey)

    if (cachedOrganisation) {
      return cachedOrganisation
    }

    let organisation
    try {
      organisation = await this.getJson(
        `/organisations/${organisationId}`,
        this.getTracingHeader(traceId)
      )
    } catch (error) {
      const statusCode = String(error.message).match(/status (\d+)/)?.[1]
      if (statusCode) {
        throw new Error(
          `Waste Organisations API request failed with status ${statusCode}`
        )
      }

      throw error
    }
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
