import { INTEGRATION_OBLIGATION_YEAR } from './shared.js'

export { INTEGRATION_OBLIGATION_YEAR }
export {
  CSOC_INTEGRATION_USER_EMAIL,
  CSOC_INTEGRATION_USER_ID
} from './users.js'

export const CSOC_OPERATOR_ORGANISATION_ID =
  'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

export const CSOC_COMPLIANCE_SCHEME_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

export const CSOC_ALREADY_SUBMITTED_SCHEME_ID =
  'a1b2c3d4-e5f6-4789-abcd-ef1234567891'

export const CSOC_NOT_MET_SCHEME_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567892'

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
    return `/compliance/cso/${CSOC_COMPLIANCE_SCHEME_ID}/statement${schemeIdOrSuffix}`
  }

  const schemeId = schemeIdOrSuffix ?? CSOC_COMPLIANCE_SCHEME_ID
  return `/compliance/cso/${schemeId}/statement${suffix}`
}
