import { config } from '#/config/config.js'
import {
  organisationRegistrationUpsertRequestSchema,
  organisationSearchResponseSchema,
  registrationSchema,
  registrationUpsertRequestSchema,
  wasteOrganisationSchema
} from '#/server/services/schemas/waste-organisations.schemas.js'
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

  async getOrganisation(organisationId) {
    const cacheKey = this.buildCacheKey('organisation', organisationId)

    return this.getJson(
      `/organisations/${organisationId}`,
      cacheKey,
      wasteOrganisationSchema
    )
  }

  async searchOrganisations(filters) {
    const query = organisationSearchQuery(filters ?? {})
    const path = `/organisations${query}`
    const cacheKey = this.buildCacheKey('organisation-search', query || '_')

    return this.getJson(path, cacheKey, organisationSearchResponseSchema)
  }

  async upsertOrganisation(organisationId, payload) {
    return this.putJson(
      `/organisations/${organisationId}`,
      payload,
      {
        request: organisationRegistrationUpsertRequestSchema,
        response: wasteOrganisationSchema
      }
    )
  }

  async upsertOrganisationRegistration(
    organisationId,
    registrationType,
    registrationYear,
    payload
  ) {
    return this.putJson(
      registrationPath(organisationId, registrationType, registrationYear),
      payload,
      {
        request: registrationUpsertRequestSchema,
        response: registrationSchema
      }
    )
  }

  async deleteOrganisationRegistration(
    organisationId,
    registrationType,
    registrationYear
  ) {
    return this.deleteJson(
      registrationPath(organisationId, registrationType, registrationYear)
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
