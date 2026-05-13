/**
 * HTTP client for the Waste Organisations REST API.
 */

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

  /**
   * @param {string} organisationId Organisation UUID
   * @param {string|null|undefined} traceId
   * @returns {Promise<import('./types/waste-organisations-api.types.js').WasteOrganisationsOrganisation>}
   */
  async getOrganisation(organisationId, traceId) {
    const cacheKey = this.buildCacheKey('organisation', organisationId)

    return this.getJson(
      `/organisations/${organisationId}`,
      this.getTracingHeader(traceId),
      cacheKey
    )
  }

  /**
   * @param {object} [filters]
   * @param {string} [filters.registrations] Comma-separated registration types (e.g. `SMALL_PRODUCER`)
   * @param {string} [filters.registrationYears] Comma-separated years
   * @param {string} [filters.statuses] Comma-separated statuses (e.g. `REGISTERED`)
   * @param {string|null|undefined} traceId
   * @returns {Promise<import('./types/waste-organisations-api.types.js').WasteOrganisationsOrganisationSearch>}
   */
  async searchOrganisations(filters, traceId) {
    const query = organisationSearchQuery(filters ?? {})
    const path = `/organisations${query}`
    const cacheKey = this.buildCacheKey('organisation-search', query || '_')

    return this.getJson(path, this.getTracingHeader(traceId), cacheKey)
  }

  /**
   * @param {string} organisationId Organisation UUID
   * @param {import('./types/waste-organisations-api.types.js').WasteOrganisationsOrganisationRegistration} payload
   * @param {string|null|undefined} traceId
   * @returns {Promise<import('./types/waste-organisations-api.types.js').WasteOrganisationsOrganisation>}
   */
  async upsertOrganisation(organisationId, payload, traceId) {
    return this.putJson(
      `/organisations/${organisationId}`,
      payload,
      this.getTracingHeader(traceId)
    )
  }

  /**
   * @param {string} organisationId Organisation UUID
   * @param {import('./types/waste-organisations-api.types.js').WasteOrganisationsRegistrationType} registrationType Route segment value (e.g. `SMALL_PRODUCER`)
   * @param {number|string} registrationYear
   * @param {import('./types/waste-organisations-api.types.js').WasteOrganisationsRegistrationRequest} payload
   * @param {string|null|undefined} traceId
   * @returns {Promise<import('./types/waste-organisations-api.types.js').WasteOrganisationsRegistration>}
   */
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

  /**
   * @param {string} organisationId Organisation UUID
   * @param {import('./types/waste-organisations-api.types.js').WasteOrganisationsRegistrationType} registrationType
   * @param {number|string} registrationYear
   * @param {string|null|undefined} traceId
   * @returns {Promise<null|*>} `204` responses typically have no JSON body (`null`)
   */
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
