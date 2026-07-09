import { INTEGRATION_OBLIGATION_YEAR } from './shared.js'

export { INTEGRATION_OBLIGATION_YEAR }
export {
  PRODUCER_INTEGRATION_USER_EMAIL,
  PRODUCER_INTEGRATION_USER_ID
} from '#/test-helpers/integration-users.js'

export const PRODUCER_ORGANISATION_ID = 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423'

export const PRODUCER_ALREADY_SUBMITTED_ORGANISATION_ID =
  'd8f98659-87d8-4ef4-a9f2-e72f1bc98424'

export const PRODUCER_NOT_MET_ORGANISATION_ID =
  'd8f98659-87d8-4ef4-a9f2-e72f1bc98425'

export const PRODUCER_ORGANISATION_NAME = 'Producer Integration Organisation'

export const PRODUCER_COMPLIANCE_DECLARATION_ID = '8b41d0e6e943b7c0f586d4b0'

export const PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID =
  '7a30c9e5d8f32a6b9e4f75c3'

export const PRODUCER_SUBMIT_FAILURE_FULL_NAME =
  'Producer Integration Failure User'

export const PRODUCER_ALREADY_SUBMITTED_SUBMITTER_NAME = 'Taylor Producer'

export function producerCertificatePath(organisationIdOrSuffix, suffix = '') {
  if (
    typeof organisationIdOrSuffix === 'string' &&
    organisationIdOrSuffix.startsWith('/')
  ) {
    return `/compliance/producer/${PRODUCER_ORGANISATION_ID}/certificate${organisationIdOrSuffix}`
  }

  const organisationId = organisationIdOrSuffix ?? PRODUCER_ORGANISATION_ID
  return `/compliance/producer/${organisationId}/certificate${suffix}`
}
