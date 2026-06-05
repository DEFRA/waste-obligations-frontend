import { config } from '#/config/config.js'
import {
  complianceDeclarationSchema,
  createComplianceDeclarationRequestSchema,
  organisationComplianceDeclarationsResponseSchema,
  organisationObligationsResponseSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'
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

  async getOrganisationObligations(organisationId, obligationYear) {
    const cacheKey = this.buildCacheKey(
      'obligations',
      organisationId,
      String(obligationYear ?? '')
    )

    return this.getJson(
      `/organisations/${organisationId}/obligations${obligationYearQuery(obligationYear)}`,
      cacheKey,
      organisationObligationsResponseSchema
    )
  }

  async getComplianceDeclarations(organisationId, obligationYear) {
    const cacheKey = this.buildCacheKey(
      'compliance-declarations',
      organisationId,
      String(obligationYear ?? '')
    )

    return this.getJson(
      `/organisations/${organisationId}/compliance-declarations${obligationYearQuery(obligationYear)}`,
      cacheKey,
      organisationComplianceDeclarationsResponseSchema
    )
  }

  async getComplianceDeclaration(organisationId, complianceDeclarationId) {
    const cacheKey = this.buildCacheKey(
      'compliance-declaration',
      organisationId,
      complianceDeclarationId
    )

    return this.getJson(
      `/organisations/${organisationId}/compliance-declarations/${complianceDeclarationId}`,
      cacheKey,
      complianceDeclarationSchema
    )
  }

  async createComplianceDeclaration(organisationId, payload) {
    return this.postJson(
      `/organisations/${organisationId}/compliance-declarations`,
      payload,
      {
        request: createComplianceDeclarationRequestSchema,
        response: complianceDeclarationSchema
      }
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
