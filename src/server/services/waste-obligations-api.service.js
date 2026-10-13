import { config } from '#/config/config.js'
import {
  complianceDeclarationSchema,
  createComplianceDeclarationRequestSchema,
  organisationComplianceDeclarationsResponseSchema,
  organisationObligationsResponseSchema,
  organisationPrnsResponseSchema,
  prnSchema,
  updatePrnStatusRequestSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'
import { BaseApiService } from './base/base-api.service.js'

function setIfTruthy(params, key, value) {
  if (value) {
    params.set(key, value)
  }
}

function setIfDefined(params, key, value) {
  if (value !== undefined && value !== null) {
    params.set(key, String(value))
  }
}

function organisationPrnsQuery({
  search,
  status,
  material,
  sort,
  page,
  pageSize
} = {}) {
  const params = new URLSearchParams()

  setIfTruthy(params, 'search', search)
  setIfTruthy(params, 'status', status)
  setIfTruthy(params, 'material', material)
  setIfTruthy(params, 'sort', sort)
  setIfDefined(params, 'page', page)
  setIfDefined(params, 'pageSize', pageSize)

  const query = params.toString()
  return query ? `?${query}` : ''
}

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

  async getPrn(organisationId, prnId) {
    const cacheKey = this.buildCacheKey('prn', organisationId, prnId)

    return this.getJson(
      `/organisations/${organisationId}/prns/${prnId}`,
      cacheKey,
      prnSchema
    )
  }

  async updatePrnStatus(organisationId, prnId, payload) {
    return this.patchJson(
      `/organisations/${organisationId}/prns/${prnId}`,
      payload,
      {
        request: updatePrnStatusRequestSchema
      }
    )
  }

  async getOrganisationPrns(organisationId, options = {}) {
    const { search, status, material, sort, page, pageSize } = options
    const cacheKey = this.buildCacheKey(
      'prns',
      organisationId,
      search ?? '',
      status ?? '',
      material ?? '',
      sort ?? '',
      String(page ?? ''),
      String(pageSize ?? '')
    )

    return this.getJson(
      `/organisations/${organisationId}/prns${organisationPrnsQuery(options)}`,
      cacheKey,
      organisationPrnsResponseSchema
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
