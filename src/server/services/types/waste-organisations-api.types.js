/**
 * JSDoc types aligned with the Waste Organisations REST API OpenAPI contract.
 *
 * @module waste-organisations-api.types
 */

export {}

/**
 * @typedef {'GB-ENG'|'GB-NIR'|'GB-SCT'|'GB-WLS'|null} WasteOrganisationsBusinessCountry
 */

/**
 * @typedef {Object} WasteOrganisationsAddress
 * @property {string|null} [addressLine1]
 * @property {string|null} [addressLine2]
 * @property {string|null} [town]
 * @property {string|null} [county]
 * @property {string|null} [postcode]
 * @property {string|null} [country]
 */

/**
 * @typedef {'REGISTERED'|'CANCELLED'} WasteOrganisationsRegistrationStatus
 */

/**
 * @typedef {'SMALL_PRODUCER'|'LARGE_PRODUCER'|'COMPLIANCE_SCHEME'|'REPROCESSOR'|'EXPORTER'} WasteOrganisationsRegistrationType
 */

/**
 * @typedef {Object} WasteOrganisationsRegistration
 * @property {WasteOrganisationsRegistrationStatus} status
 * @property {WasteOrganisationsRegistrationType} type
 * @property {number|string} registrationYear
 */

/**
 * @typedef {Object} WasteOrganisationsRegistrationResponse
 * @property {string} [created] ISO 8601 date-time
 * @property {string} [updated] ISO 8601 date-time
 * @property {WasteOrganisationsRegistrationStatus} status
 * @property {WasteOrganisationsRegistrationType} type
 * @property {number|string} registrationYear
 */

/**
 * GET `/organisations/{id}` success body.
 *
 * @typedef {Object} WasteOrganisationsOrganisation
 * @property {string} id UUID
 * @property {string} name
 * @property {string|null} [tradingName]
 * @property {WasteOrganisationsBusinessCountry} [businessCountry]
 * @property {string|null} [companiesHouseNumber]
 * @property {WasteOrganisationsAddress} address
 * @property {WasteOrganisationsRegistrationResponse[]} [registrations]
 */

/**
 * GET `/organisations` search success body.
 *
 * @typedef {Object} WasteOrganisationsOrganisationSearch
 * @property {WasteOrganisationsOrganisation[]} [organisations]
 */

/**
 * PUT `/organisations/{id}` request body.
 *
 * @typedef {Object} WasteOrganisationsOrganisationRegistration
 * @property {string} name
 * @property {string|null} [tradingName]
 * @property {WasteOrganisationsBusinessCountry} [businessCountry]
 * @property {string|null} [companiesHouseNumber]
 * @property {WasteOrganisationsAddress} address
 * @property {WasteOrganisationsRegistration} registration
 */

/**
 * PUT `/organisations/{id}/registrations/{type}-{registrationYear}` request body.
 *
 * @typedef {Object} WasteOrganisationsRegistrationRequest
 * @property {WasteOrganisationsRegistrationStatus} status
 */
