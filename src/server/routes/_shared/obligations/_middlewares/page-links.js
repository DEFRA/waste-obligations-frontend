import { config } from '#/config/config.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { obligationMaterialSlug } from '#/server/routes/_shared/obligations/obligation-materials.js'
import {
  csoObligationMaterialPath,
  producerObligationMaterialPath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import {
  csoPrnsPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'

/**
 * Links to the PRN list and to the submit page. Both are prefix-aware.
 */
export function buildPageLinks(request, pathId, isProducer, obligationYear) {
  const prnsPath = isProducer
    ? producerPrnsPath(pathId, obligationYear)
    : csoPrnsPath(pathId, obligationYear)
  const acceptRejectPath = config.get('features.showPrns')
    ? withForwardedPrefix(request, prnsPath)
    : null
  const submitPath = isProducer
    ? `/producer/${pathId}/compliance/certificate?year=${obligationYear}`
    : `/cso/${pathId}/compliance/statement?year=${obligationYear}`

  return {
    acceptRejectPath,
    submitCertificatePath: withForwardedPrefix(request, submitPath)
  }
}

/**
 * Organisation name for the header: the business for a producer, the scheme for a CSO.
 */
export function buildOrganisationFields(organisation, isProducer) {
  return {
    organisationName: isProducer ? organisation?.name : null,
    complianceSchemeName: isProducer ? null : organisation?.name
  }
}

/**
 * @param {object} options
 * @param {import('@hapi/hapi').Request} options.request
 * @param {string} options.userType - 'producer' or 'cso'
 * @param {number} options.obligationYear
 */
export function buildMaterialHref(
  request,
  { isProducer, pathId, obligationYear }
) {
  const materialPath = isProducer
    ? producerObligationMaterialPath
    : csoObligationMaterialPath

  return (row) => {
    const slug = obligationMaterialSlug(row.material)

    return slug
      ? withForwardedPrefix(request, materialPath(pathId, slug, obligationYear))
      : undefined
  }
}

export function buildAcceptRejectPath(
  request,
  { isProducer, pathId, obligationYear }
) {
  if (!config.get('features.showPrns')) {
    return null
  }

  const prnsPath = isProducer
    ? producerPrnsPath(pathId, obligationYear)
    : csoPrnsPath(pathId, obligationYear)

  return withForwardedPrefix(request, prnsPath)
}

export function buildSubmitCertificatePath(
  request,
  { isProducer, pathId, obligationYear }
) {
  const submitPath = isProducer
    ? `/producer/${pathId}/compliance/certificate?year=${obligationYear}`
    : `/cso/${pathId}/compliance/statement?year=${obligationYear}`

  return withForwardedPrefix(request, submitPath)
}
