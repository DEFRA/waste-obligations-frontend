import { config } from '#/config/config.js'
import { BaseApiService } from './base/base-api.service.js'

function organisationSearchQuery(filters = {}) {
  const params = new URLSearchParams()
  const { registrations, registrationYears, statuses } = filters

  if (registrations != null && registrations !== '') {
    params.set('registrations', String(registrations))
  }

  if (registrationYears != null && registrationYears !== '') {
    params.set('registrationYears', String(registrationYears))
  }

  if (statuses != null && statuses !== '') {
    params.set('statuses', String(statuses))
  }

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function registrationPath(organisationId, registrationType, registrationYear) {
  return `/organisations/${organisationId}/registrations/${registrationType}-${registrationYear}`
}

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

  async searchOrganisations(filters, traceId) {
    const query = organisationSearchQuery(filters ?? {})
    const path = `/organisations${query}`
    const cacheKey = this.buildCacheKey('organisation-search', query || '_')

    return this.getJson(path, this.getTracingHeader(traceId), cacheKey)
  }

  async upsertOrganisation(organisationId, payload, traceId) {
    return this.putJson(
      `/organisations/${organisationId}`,
      payload,
      this.getTracingHeader(traceId)
    )
  }

  async upsertOrganisationRegistration(
    organisationId,
    registrationType,
    registrationYear,
    payload,
    traceId
  ) {
    return this.putJson(
      registrationPath(organisationId, registrationType, registrationYear),
      payload,
      this.getTracingHeader(traceId)
    )
  }

  async deleteOrganisationRegistration(
    organisationId,
    registrationType,
    registrationYear,
    traceId
  ) {
    return this.deleteJson(
      registrationPath(organisationId, registrationType, registrationYear),
      this.getTracingHeader(traceId)
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
