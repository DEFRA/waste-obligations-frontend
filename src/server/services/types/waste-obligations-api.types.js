/**
 * JSDoc types aligned with the Waste Obligations REST API OpenAPI contract.
 *
 * @module waste-obligations-api.types
 */

export {}

/**
 * @typedef {'Plastic'|'Glass'|'Aluminium'|'Steel'|'Wood'|'GlassRemelt'|'Paper'} WasteObligationsMaterial
 */

/**
 * @typedef {'NoDataYet'|'Met'|'NotMet'} WasteObligationsObligationStatus
 */

/**
 * @typedef {Object} WasteObligationsObligationTonnages
 * @property {number|string} [material]
 * @property {number|string} [awaitingAcceptance]
 * @property {number|string} [accepted]
 * @property {number|string} [outstanding]
 * @property {number|string} [obligated]
 */

/**
 * @typedef {Object} WasteObligationsObligation
 * @property {WasteObligationsMaterial|string} material API may extend enums over time
 * @property {number|string} [recyclingTarget]
 * @property {WasteObligationsObligationTonnages} tonnages
 * @property {WasteObligationsObligationStatus} status
 */

/**
 * GET `/organisations/{organisationId}/obligations` success body.
 *
 * @typedef {Object} WasteObligationsOrganisationObligations
 * @property {WasteObligationsObligation[]} [obligations]
 */

/**
 * @typedef {Object} WasteObligationsAddress
 * @property {string|null} [addressLine1]
 * @property {string|null} [addressLine2]
 * @property {string|null} [town]
 * @property {string|null} [county]
 * @property {string|null} [postcode]
 * @property {string|null} [country]
 */

/**
 * Nested organisation snapshot on compliance declarations (OpenAPI `OrganisationRequest`).
 *
 * @typedef {Object} WasteObligationsOrganisationRequest
 * @property {string} [id] UUID
 * @property {string|null} [name]
 * @property {string|null} [complianceSchemeName]
 * @property {string|null} [schemeOperatorName]
 * @property {string|null} [referenceNumber]
 * @property {WasteObligationsAddress|null} [address]
 * @property {string|null} [regulator]
 */

/**
 * @typedef {Object} WasteObligationsLocalizedText
 * @property {string} text
 * @property {string} language ISO 639-1 or BCP 47 (e.g. `en`, `en-GB`)
 */

/**
 * @typedef {Object} WasteObligationsUser
 * @property {string} id
 * @property {string} email
 */

/**
 * @typedef {'Met'|'NotMet'} WasteObligationsDeclarationObligationStatus
 */

/**
 * @typedef {'Submitted'} WasteObligationsComplianceDeclarationStatus
 */

/**
 * GET/POST compliance declaration resource.
 *
 * @typedef {Object} WasteObligationsComplianceDeclaration
 * @property {string} [id] UUID
 * @property {string} [created] ISO 8601 date-time
 * @property {string} [updated] ISO 8601 date-time
 * @property {WasteObligationsComplianceDeclarationStatus} [status]
 * @property {WasteObligationsOrganisationRequest} organisation
 * @property {number|string} obligationYear
 * @property {WasteObligationsObligation[]} [obligations]
 * @property {WasteObligationsDeclarationObligationStatus} obligationStatus
 * @property {WasteObligationsLocalizedText} declarationText
 * @property {string} submitterName
 * @property {WasteObligationsUser} user
 */

/**
 * POST `/organisations/{organisationId}/compliance-declarations` request body.
 *
 * @typedef {Object} WasteObligationsCreateComplianceDeclarationRequest
 * @property {WasteObligationsOrganisationRequest} organisation
 * @property {number|string} obligationYear
 * @property {WasteObligationsObligation[]} [obligations]
 * @property {WasteObligationsDeclarationObligationStatus} obligationStatus
 * @property {WasteObligationsLocalizedText} declarationText
 * @property {string} submitterName
 * @property {WasteObligationsUser} user
 */

/**
 * GET `/organisations/{organisationId}/compliance-declarations` success body.
 *
 * @typedef {Object} WasteObligationsOrganisationComplianceDeclarations
 * @property {WasteObligationsComplianceDeclaration[]} [complianceDeclarations]
 */
