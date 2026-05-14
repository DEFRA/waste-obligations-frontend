import { config } from '#/config/config.js'
import { BaseApiService } from './base/base-api.service.js'

function obligationYearQuery(obligationYear) {
  if (obligationYear === undefined || obligationYear === null) {
    return ''
  }

  const params = new URLSearchParams()
  params.set('obligationYear', String(obligationYear))
  return `?${params.toString()}`
}

export class WasteObligationsApiService extends BaseApiService {
  constructor(options = {}) {
    super({
      ...options,
      serviceName: 'waste-obligations'
    })
  }

  async getOrganisationObligations(organisationId, obligationYear, traceId) {
    const cacheKey = this.buildCacheKey(
      'obligations',
      organisationId,
      String(obligationYear ?? '')
    )

    return this.getJson(
      `/organisations/${organisationId}/obligations${obligationYearQuery(obligationYear)}`,
      this.getTracingHeader(traceId),
      cacheKey
    )
  }

  async getComplianceDeclarations(organisationId, obligationYear, traceId) {
    const cacheKey = this.buildCacheKey(
      'compliance-declarations',
      organisationId,
      String(obligationYear ?? '')
    )

    return this.getJson(
      `/organisations/${organisationId}/compliance-declarations${obligationYearQuery(obligationYear)}`,
      this.getTracingHeader(traceId),
      cacheKey
    )
  }

  async getComplianceDeclaration(
    organisationId,
    complianceDeclarationId,
    traceId
  ) {
    const cacheKey = this.buildCacheKey(
      'compliance-declaration',
      organisationId,
      complianceDeclarationId
    )

    return this.getJson(
      `/organisations/${organisationId}/compliance-declarations/${complianceDeclarationId}`,
      this.getTracingHeader(traceId),
      cacheKey
    )
  }

  async createComplianceDeclaration(organisationId, payload, traceId) {
    return this.postJson(
      `/organisations/${organisationId}/compliance-declarations`,
      payload,
      this.getTracingHeader(traceId)
    )
  }
}

export function createWasteObligationsApiService(options = {}) {
  return new WasteObligationsApiService({
    baseUrl: config.get('wasteObligationsApi.baseUrl'),
    authMode: config.get('wasteObligationsApi.authMode'),
    clientId: config.get('wasteObligationsApi.clientId'),
    clientSecret: config.get('wasteObligationsApi.clientSecret'),
    tracingHeader: config.get('tracing.header'),
    ...options
  })
}
