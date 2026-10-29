import { INTEGRATION_OBLIGATION_YEAR } from './shared.js'

export { INTEGRATION_OBLIGATION_YEAR }
export {
  CSOC_INTEGRATION_USER_EMAIL,
  CSOC_INTEGRATION_USER_ID
} from '#/test-helpers/integration-users.js'

export const CSOC_OPERATOR_ORGANISATION_ID =
  'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

export const CSOC_COMPLIANCE_SCHEME_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

export const CSOC_AWAITING_ACCEPTANCE_PRN_ID =
  'b2c3d4e5-f6a7-5890-bcde-000000000001'

// Dedicated PERN for the reject click-through. Its WireMock scenario starts
// awaiting acceptance and moves to Rejected after the status PATCH.
export const CSOC_REJECT_FLOW_PRN_ID = 'b2c3d4e5-f6a7-5890-bcde-000000000005'

export const CSOC_PERN_REJECT_SCENARIO = 'csoc-pern-reject'

// December waste PRN issued in December 2026. The integration server's clock
// starts at 15 Dec 2026, inside its flash window.
export const CSOC_DECEMBER_WASTE_PRN_ID = 'b2c3d4e5-f6a7-5890-bcde-000000000002'

export const CSOC_ALREADY_SUBMITTED_SCHEME_ID =
  'a1b2c3d4-e5f6-4789-abcd-ef1234567891'

export const CSOC_NOT_MET_SCHEME_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567892'

export const CSOC_NO_DATA_YET_SCHEME_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567893'

export const CSOC_NO_DATA_YET_DECLARATION_ID = '7d63f2a8b5c97e14d2f68c3a'

export const CSOC_COMPLIANCE_DECLARATION_ID = '6830b9d4c7e21f5a8d3e64b2'

export const CSOC_ALREADY_SUBMITTED_DECLARATION_ID = '41095a7f38964347b367136f'

export const CSOC_REG43_NO_DECLARATION_ID = '51095a7f38964347b367136f'

export const CSOC_REG43_NO_SUBMITTER_NAME = 'Alex Reg43'

export const CSOC_SUBMIT_FAILURE_FULL_NAME = 'CSoC Integration Failure User'

export function csoStatementPath(schemeIdOrSuffix, suffix = '') {
  if (
    typeof schemeIdOrSuffix === 'string' &&
    schemeIdOrSuffix.startsWith('/')
  ) {
    return `/cso/${CSOC_COMPLIANCE_SCHEME_ID}/compliance/statement${schemeIdOrSuffix}`
  }

  const schemeId = schemeIdOrSuffix ?? CSOC_COMPLIANCE_SCHEME_ID
  return `/cso/${schemeId}/compliance/statement${suffix}`
}

export function csoObligationsPath(schemeId) {
  return `/cso/${schemeId ?? CSOC_COMPLIANCE_SCHEME_ID}/obligations`
}

export function csoPrnsPath(schemeId) {
  return `/cso/${schemeId ?? CSOC_COMPLIANCE_SCHEME_ID}/prns`
}

export function csoPrnPath(prnId, schemeId) {
  return `/cso/${schemeId ?? CSOC_COMPLIANCE_SCHEME_ID}/prns/${prnId}`
}

export function csoConfirmAcceptPrnPath(prnId, schemeId) {
  return `${csoPrnPath(prnId, schemeId)}/confirm-accept`
}

export function csoConfirmRejectPrnPath(prnId, schemeId) {
  return `${csoPrnPath(prnId, schemeId)}/confirm-reject`
}
