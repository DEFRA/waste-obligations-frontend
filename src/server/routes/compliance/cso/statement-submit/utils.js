import { findUserOrganisation } from '../../../../common/routes/middleware/current-organisation.js'
import {
  buildSubmitCacheKey,
  createSubmitCacheOperations
} from '#/server/routes/compliance/_shared/compliance-submit/submit-cache.js'
import { formatOrganisationName } from '#/server/routes/compliance/_shared/compliance-submit/organisation-formatters.js'

import { statementSubmitCacheSchema } from './schemas.js'

const STATEMENT_SUBMIT_CACHE_LABEL = 'statement-submit'

const statementSubmitCache = createSubmitCacheOperations({
  label: STATEMENT_SUBMIT_CACHE_LABEL,
  schema: statementSubmitCacheSchema
})

export function formatComplianceSchemeName(organisation, year) {
  return formatOrganisationName(organisation, year)
}

export {
  formatOrganisationAddress,
  formatSchemeOperatorName
} from '#/server/routes/compliance/_shared/compliance-submit/organisation-formatters.js'

export function resolveOperatorOrganisationNumber(request) {
  const operatorOrganisationId =
    request.pre?.currentComplianceScheme?.operatorOrganisationId
  const user = request.yar.get('user')

  if (!operatorOrganisationId) {
    return ''
  }

  return (
    findUserOrganisation(user, operatorOrganisationId)?.organisationNumber ?? ''
  )
}

export function buildStatementSubmitCacheKey(userId, schemeId, year) {
  return buildSubmitCacheKey('statement', userId, schemeId, year)
}

export const writeStatementSubmitCache = statementSubmitCache.write
export const readStatementSubmitCacheRaw = statementSubmitCache.readRaw
