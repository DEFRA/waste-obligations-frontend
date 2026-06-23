import { certificateSubmitCacheSchema } from './schemas.js'
import {
  RedisCacheValidationError,
  validateRedisCache
} from '#/server/common/helpers/validate-redis-cache.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

const CERTIFICATE_SUBMIT_CACHE_LABEL = 'certificate-submit'

const CERTIFICATE_SUBMIT_DECLARATION_BULLET_KEYS = [
  'compliance.certificateSubmit.declarationBullet1',
  'compliance.certificateSubmit.declarationBullet2',
  'compliance.certificateSubmit.declarationBullet3'
]

export function buildCertificateSubmitDeclarationText(
  locale,
  organisationName
) {
  const intro = translate(
    locale,
    'compliance.certificateSubmit.declarationIntro'
  )
  const bullets = CERTIFICATE_SUBMIT_DECLARATION_BULLET_KEYS.map((key) =>
    translate(locale, key, { organisationName })
  )

  return {
    intro,
    language: locale,
    bullets
  }
}

export function formatCertificateSubmitDeclarationApiText(declarationText) {
  return `${declarationText.intro}\n*${declarationText.bullets.join('*')}`
}

export function formatOrganisationAddress(address) {
  if (address == null) {
    return ''
  }

  if (typeof address !== 'object') {
    return String(address).trim()
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.town,
    address.county,
    address.postcode,
    address.country
  ]
    .filter(Boolean)
    .map((p) => p.toString().trim())
    .filter(Boolean)
    .join(', ')
}

export function formatOrganisationName(organisation, year) {
  if (organisation == null || typeof organisation !== 'object') {
    return ''
  }

  const registrations = organisation.registrations ?? []
  const matchingRegistrations = registrations
    .filter((x) => x.registrationYear === Number(year))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))
  const registration =
    matchingRegistrations.find((x) => x.status === 'REGISTERED') ??
    matchingRegistrations[0]

  if (!registration) {
    throw new Error(`No registration found, using year ${year}`)
  }

  const result = (() => {
    switch (registration.type) {
      case 'LARGE_PRODUCER':
        return organisation.name

      case 'COMPLIANCE_SCHEME':
        return organisation.tradingName

      default:
        return organisation.name
    }
  })()

  return result ?? organisation.name
}

export function buildCertificateSubmitCacheKey(userId, organisationId, year) {
  return `compliance-certificate-submit:${userId}:${organisationId}:${year}`
}

function validateCertificateSubmitCachePayload(data) {
  return validateRedisCache(
    certificateSubmitCacheSchema,
    data,
    CERTIFICATE_SUBMIT_CACHE_LABEL
  )
}

export async function writeCertificateSubmitCache(
  cacheClient,
  cacheKey,
  payload
) {
  const validated = validateCertificateSubmitCachePayload(payload)
  await cacheClient.set(cacheKey, JSON.stringify(validated))
}

function parseCertificateSubmitCacheRaw(raw) {
  if (raw == null || raw === '') {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new RedisCacheValidationError(CERTIFICATE_SUBMIT_CACHE_LABEL, [
      'Invalid JSON payload'
    ])
  }
}

export async function readCertificateSubmitCacheRaw(cacheClient, cacheKey) {
  const raw = await cacheClient.get(cacheKey)
  const parsed = parseCertificateSubmitCacheRaw(raw)

  if (parsed == null) {
    return null
  }

  return validateCertificateSubmitCachePayload(parsed)
}
