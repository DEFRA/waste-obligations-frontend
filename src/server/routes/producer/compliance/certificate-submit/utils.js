import {
  buildSubmitCacheKey,
  createSubmitCacheOperations
} from '#/server/routes/_shared/compliance/compliance-submit/submit-cache.js'

import { certificateSubmitCacheSchema } from './schemas.js'

const CERTIFICATE_SUBMIT_CACHE_LABEL = 'certificate-submit'

const certificateSubmitCache = createSubmitCacheOperations({
  label: CERTIFICATE_SUBMIT_CACHE_LABEL,
  schema: certificateSubmitCacheSchema
})

export {
  formatOrganisationAddress,
  formatOrganisationName
} from '#/server/routes/_shared/compliance/compliance-submit/organisation-formatters.js'

export function buildCertificateSubmitCacheKey(userId, organisationId, year) {
  return buildSubmitCacheKey('certificate', userId, organisationId, year)
}

export const writeCertificateSubmitCache = certificateSubmitCache.write
export const readCertificateSubmitCacheRaw = certificateSubmitCache.readRaw
