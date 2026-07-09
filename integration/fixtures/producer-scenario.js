export const PRODUCER_INTEGRATION_USER_ID =
  '00000000-0000-4000-8000-000000000002'

export const PRODUCER_INTEGRATION_USER_EMAIL =
  'producer.integration@example.com'

export const PRODUCER_ORGANISATION_ID = 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423'

export const PRODUCER_ORGANISATION_NAME = 'Producer Integration Organisation'

export const PRODUCER_COMPLIANCE_DECLARATION_ID = '8b41d0e6e943b7c0f586d4b0'

export const PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID =
  '7a30c9e5d8f32a6b9e4f75c3'

export const PRODUCER_OBLIGATION_YEAR = 2026

export const PRODUCER_ALREADY_SUBMITTED_YEAR = 2025

export const PRODUCER_NOT_MET_OBLIGATIONS_YEAR = 2024

export const PRODUCER_SUBMIT_FAILURE_FULL_NAME =
  'Producer Integration Failure User'

export const PRODUCER_ALREADY_SUBMITTED_SUBMITTER_NAME = 'Taylor Producer'

export function producerCertificatePath(suffix = '') {
  return `/compliance/producer/${PRODUCER_ORGANISATION_ID}/certificate${suffix}`
}
