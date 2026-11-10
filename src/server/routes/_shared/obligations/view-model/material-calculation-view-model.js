import { PRODUCER_RESPONSIBILITY_REGULATIONS_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  csoObligationsHomePath,
  producerObligationsHomePath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import { buildManageObligationsTableRows } from '#/server/routes/_shared/obligations/_middlewares/index.js'

const PAGE_LOCALE_BASE = 'obligations.material'

/** The year of the regulations that set the recycling targets. */
const REGULATIONS_YEAR = 2024

const OBLIGATION_MATERIAL = {
  aluminium: 'Aluminium',
  paper: 'Paper',
  plastic: 'Plastic',
  steel: 'Steel',
  wood: 'Wood'
}

const GLASS = 'glass'

function numberFormat(locale) {
  return new Intl.NumberFormat(locale === 'cy' ? 'cy-GB' : 'en-GB', {
    maximumFractionDigits: 0
  })
}

function percent(target) {
  return Math.round((target ?? 0) * 100)
}

function standardCalculation(obligation, format) {
  const reported = Number(obligation?.tonnages?.material ?? 0)

  if (reported <= 0) {
    return null
  }

  return {
    type: 'standard',
    regulationsYear: REGULATIONS_YEAR,
    reportedTonnage: format.format(reported),
    targetPercent: percent(obligation.recyclingTarget),
    obligationTonnage: format.format(Number(obligation.tonnages.obligated ?? 0))
  }
}

function hasNoData(obligation) {
  return !obligation || obligation.status === 'NoDataYet'
}

function glassCalculation(obligations, obligationYear, format) {
  const remelt = obligations.find((o) => o.material === 'GlassRemelt')
  const remaining = obligations.find((o) => o.material === 'Glass')

  const reported = Number(remaining?.tonnages?.material ?? 0)

  // The worked example needs both glass obligations. Without re-melt or
  // remaining glass data the table says "No data yet", so show no example.
  if (reported <= 0 || hasNoData(remelt) || hasNoData(remaining)) {
    return null
  }

  const remeltObligation = Number(remelt?.tonnages?.obligated ?? 0)
  const remainingObligation = Number(remaining?.tonnages?.obligated ?? 0)

  return {
    type: 'glass',
    regulationsYear: REGULATIONS_YEAR,
    reportedYear: obligationYear - 1,
    reportedTonnage: format.format(reported),
    totalTargetPercent: percent(remaining?.recyclingTarget),
    remeltTargetPercent: percent(remelt?.recyclingTarget),
    totalObligationTonnage: format.format(
      remeltObligation + remainingObligation
    ),
    remeltObligationTonnage: format.format(remeltObligation),
    remainingObligationTonnage: format.format(remainingObligation)
  }
}

/**
 * The page that explains how one material's recycling obligation was worked out.
 * Glass covers glass re-melt and remaining glass.
 *
 * @param {object} options
 * @param {import('@hapi/hapi').Request} options.request
 * @param {string} options.userType - 'producer' or 'cso'
 * @param {number} options.obligationYear
 * @param {string} options.material - a slug from OBLIGATION_MATERIAL_SLUGS
 */
export function buildMaterialCalculationViewModel({
  request,
  userType,
  obligationYear,
  material
}) {
  const locale = getLocale(request)
  const organisation = request.pre.organisation
  const obligations = request.pre.obligations ?? []
  const format = numberFormat(locale)

  const isProducer = userType === 'producer'
  const isGlass = material === GLASS
  const pathId = isProducer
    ? request.params.organisationId
    : request.params.schemeId

  const { obligationsRows, glassRows } = presentObligationsForCertificateSubmit(
    obligations,
    { locale, pageLocaleBase: PAGE_LOCALE_BASE, dashWhenNoData: true }
  )
  const viewedMaterial = OBLIGATION_MATERIAL[material]
  const rows = isGlass
    ? glassRows
    : obligationsRows.filter((row) => row.material === viewedMaterial)

  const materialName = translate(
    locale,
    `${PAGE_LOCALE_BASE}.names.${material}`
  )
  const homePath = isProducer
    ? producerObligationsHomePath
    : csoObligationsHomePath

  // The compliance scheme record names the scheme; the Waste Organisations
  // record is for its operator organisation, which can have another name.
  const schemeName =
    request.pre.currentComplianceScheme?.scheme?.name ?? organisation?.name

  const { name } = getRegulatorDetails(organisation?.businessCountry, locale)

  return {
    locale,
    localeBase: PAGE_LOCALE_BASE,
    obligationYear,
    materialSlug: material,
    materialName,
    isGlass,
    title: translate(locale, `${PAGE_LOCALE_BASE}.title`, {
      year: obligationYear,
      material: materialName
    }),
    organisationName: isProducer ? organisation?.name : null,
    complianceSchemeName: isProducer ? null : schemeName,
    isProducer,
    regulatorName: name,
    tableRows: buildManageObligationsTableRows(
      rows,
      locale,
      undefined,
      PAGE_LOCALE_BASE
    ),
    calculation: isGlass
      ? glassCalculation(obligations, obligationYear, format)
      : standardCalculation(
          obligations.find((o) => o.material === viewedMaterial),
          format
        ),
    regulationsUrl: PRODUCER_RESPONSIBILITY_REGULATIONS_URL,
    backLink: withForwardedPrefix(request, homePath(pathId, obligationYear))
  }
}
