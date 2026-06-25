import {
  RedisCacheValidationError,
  validateRedisCache
} from '#/server/common/helpers/validate-redis-cache.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { findUserOrganisation } from '#/server/routes/compliance/_middlewares/current-organisation.js'
import {
  formatOrganisationAddress,
  formatOrganisationName
} from '#/server/routes/compliance/producer/certificate-submit/utils.js'

import { statementSubmitCacheSchema } from './schemas.js'

const STATEMENT_SUBMIT_CACHE_LABEL = 'statement-submit'

const STATEMENT_SUBMIT_DECLARATION_BULLET_KEYS = [
  'compliance.statementSubmit.declarationBullet1',
  'compliance.statementSubmit.declarationBullet2',
  'compliance.statementSubmit.declarationBullet3'
]

export function buildStatementSubmitDeclarationText(
  locale,
  complianceSchemeName
) {
  const intro = translate(locale, 'compliance.statementSubmit.declarationIntro')
  const bullets = STATEMENT_SUBMIT_DECLARATION_BULLET_KEYS.map((key) =>
    translate(locale, key, { complianceSchemeName })
  )

  return {
    intro,
    language: locale,
    bullets
  }
}

export function formatComplianceSchemeName(organisation, year) {
  return formatOrganisationName(organisation, year)
}

export function formatSchemeOperatorName(organisation) {
  return organisation?.name ?? ''
}

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
  return `compliance-statement-submit:${userId}:${schemeId}:${year}`
}

function validateStatementSubmitCachePayload(data) {
  return validateRedisCache(
    statementSubmitCacheSchema,
    data,
    STATEMENT_SUBMIT_CACHE_LABEL
  )
}

export async function writeStatementSubmitCache(
  cacheClient,
  cacheKey,
  payload
) {
  const validated = validateStatementSubmitCachePayload(payload)
  await cacheClient.set(cacheKey, JSON.stringify(validated))
}

function parseStatementSubmitCacheRaw(raw) {
  if (raw == null || raw === '') {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new RedisCacheValidationError(STATEMENT_SUBMIT_CACHE_LABEL, [
      'Invalid JSON payload'
    ])
  }
}

export async function readStatementSubmitCacheRaw(cacheClient, cacheKey) {
  const raw = await cacheClient.get(cacheKey)
  const parsed = parseStatementSubmitCacheRaw(raw)

  if (parsed == null) {
    return null
  }

  return validateStatementSubmitCachePayload(parsed)
}

export { formatOrganisationAddress }
