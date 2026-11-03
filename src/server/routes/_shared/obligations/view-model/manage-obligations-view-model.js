import { config } from '#/config/config.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  resolveComponentLocaleKey,
  translate
} from '#/server/common/helpers/i18n/translate.js'
import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { DEFAULT_BUSINESS_COUNTRY } from '#/server/routes/_shared/compliance/regulator.js'
import {
  csoObligationMaterialPath,
  producerObligationMaterialPath
} from '#/server/routes/_shared/obligations/obligations-paths.js'
import {
  obligationMaterialAriaLabelKey,
  obligationMaterialSlug
} from '#/server/routes/_shared/obligations/obligation-materials.js'
import {
  csoPrnsPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'

const PAGE_LOCALE_BASE = 'obligations.home'
const DEFAULT_GLASS_REMELT_TARGET_PERCENT = 76

const REGULATOR_LOCALE_KEYS = {
  'GB-ENG': 'regulatorEngland',
  'GB-SCT': 'regulatorScotland',
  'GB-WLS': 'regulatorWales',
  'GB-NIR': 'regulatorNorthernIreland'
}

function resolveGlassTarget(obligations) {
  const glass = (obligations ?? []).find((o) => o.material === 'GlassRemelt')

  if (glass?.recyclingTarget != null) {
    return Math.round(glass.recyclingTarget * 100)
  }

  return DEFAULT_GLASS_REMELT_TARGET_PERCENT
}

export function resolveRegulatorDisplayName(businessCountry, locale) {
  const country =
    businessCountry in REGULATOR_LOCALE_KEYS
      ? businessCountry
      : DEFAULT_BUSINESS_COUNTRY

  return translate(
    locale,
    `${PAGE_LOCALE_BASE}.${REGULATOR_LOCALE_KEYS[country]}`
  )
}

/**
 * A material's link, named for screen readers as the Azure page names it: the
 * hidden text says which page the link opens.
 */
function materialLinkHtml({
  href,
  materialName,
  ariaLabelKey,
  locale,
  labelId
}) {
  const label = translate(
    locale,
    `obligations.material.ariaLabels.${ariaLabelKey}`
  )
  const hiddenLabel = `<span id="${labelId}" class="govuk-visually-hidden">${label}</span>`
  const link = `<strong><a class="govuk-link" href="${href}" aria-labelledby="${labelId}">${materialName}</a></strong>`

  return hiddenLabel + link
}

/** Manage Obligations design uses red for Not met (certificate pages keep yellow). */
function withManageObligationsTagColour(tag) {
  if (tag?.variant !== 'yellow') {
    return tag
  }

  return { ...tag, variant: 'red' }
}

function numericOrDashCell(value, notAvailableYetLabel) {
  if (value == null) {
    return {
      html: `<span class="govuk-visually-hidden">${notAvailableYetLabel}</span><span aria-hidden="true">-</span>`,
      format: 'numeric'
    }
  }

  return { text: String(value), format: 'numeric' }
}

/**
 * Builds table rows matching the packaging Manage Obligations look:
 * bold material names styled as links to their calculation page (`materialHref`
 * returns the page for a row; no link where it returns nothing), red/green/grey
 * status tags, bold totals row.
 */
export function buildManageObligationsTableRows(
  rows,
  locale,
  materialHref = () => undefined,
  pageLocaleBase = null,
  idPrefix = 'material-link-label'
) {
  const notAvailableYetLabel = translate(
    locale,
    resolveComponentLocaleKey(
      locale,
      pageLocaleBase,
      'obligationsTable',
      'notAvailableYet'
    )
  )

  return rows.map((row, index) => {
    const materialName = translate(
      locale,
      row.materialKey,
      row.materialParams ?? {}
    )
    const isTotals = row.isTotals === true || row.material === 'Totals'
    const tag = withManageObligationsTagColour(row.tag)
    const boldClass = isTotals ? 'govuk-!-font-weight-bold' : undefined
    const href = isTotals ? undefined : materialHref(row)
    const ariaLabelKey = obligationMaterialAriaLabelKey(row.material)

    const obligationCell = numericOrDashCell(
      row.obligationToMeet,
      notAvailableYetLabel
    )
    const outstandingCell = numericOrDashCell(
      row.outstanding,
      notAvailableYetLabel
    )

    return [
      {
        html: href
          ? materialLinkHtml({
              href,
              materialName,
              ariaLabelKey,
              locale,
              labelId: `${idPrefix}-${index}`
            })
          : `<strong>${materialName}</strong>`
      },
      { ...obligationCell, classes: boldClass },
      {
        text: String(row.awaitingAcceptance ?? 0),
        format: 'numeric',
        classes: boldClass
      },
      {
        text: String(row.accepted ?? 0),
        format: 'numeric',
        classes: boldClass
      },
      { ...outstandingCell, classes: boldClass },
      { html: renderObligationStatusTagHtml(locale, tag) }
    ]
  })
}

function buildObligationTables(obligations, locale, materialHref) {
  const { obligationsRows, glassRows } = presentObligationsForCertificateSubmit(
    obligations,
    {
      locale,
      pageLocaleBase: null,
      dashWhenNoData: true
    }
  )

  return {
    obligationsTableRows: buildManageObligationsTableRows(
      obligationsRows,
      locale,
      materialHref,
      null,
      'obligations-material'
    ),
    glassTableRows: buildManageObligationsTableRows(
      glassRows,
      locale,
      materialHref,
      null,
      'glass-material'
    )
  }
}

/**
 * @param {object} options
 * @param {import('@hapi/hapi').Request} options.request
 * @param {string} options.userType - 'producer' or 'cso'
 * @param {number} options.obligationYear
 */
export function buildManageObligationsViewModel({
  request,
  userType,
  obligationYear
}) {
  const locale = getLocale(request)
  const organisation = request.pre.organisation
  const obligations = request.pre.obligations
  const awaitingAcceptancePrns = request.pre.awaitingAcceptancePrns

  const isProducer = userType === 'producer'
  const pathId = isProducer
    ? request.params.organisationId
    : request.params.schemeId

  const deadlineYear = obligationYear + 1

  const materialPath = isProducer
    ? producerObligationMaterialPath
    : csoObligationMaterialPath
  const materialHref = (row) => {
    const slug = obligationMaterialSlug(row.material)

    return slug
      ? withForwardedPrefix(request, materialPath(pathId, slug, obligationYear))
      : undefined
  }

  const { obligationsTableRows, glassTableRows } = buildObligationTables(
    obligations,
    locale,
    materialHref
  )

  const prnsPath = isProducer
    ? producerPrnsPath(pathId, obligationYear)
    : csoPrnsPath(pathId, obligationYear)
  const acceptRejectPath = config.get('features.showPrns')
    ? withForwardedPrefix(request, prnsPath)
    : null
  const submitCertificatePath = isProducer
    ? withForwardedPrefix(
        request,
        `/producer/${pathId}/compliance/certificate?year=${obligationYear}`
      )
    : withForwardedPrefix(
        request,
        `/cso/${pathId}/compliance/statement?year=${obligationYear}`
      )

  return {
    locale,
    localeBase: PAGE_LOCALE_BASE,
    obligationYear,
    deadlineYear,
    organisationName: isProducer ? organisation?.name : null,
    complianceSchemeName: isProducer ? null : organisation?.name,
    regulatorName: resolveRegulatorDisplayName(
      organisation?.businessCountry,
      locale
    ),
    awaitingAcceptanceCount: awaitingAcceptancePrns?.total ?? 0,
    glassTarget: resolveGlassTarget(obligations),
    obligationsTableRows,
    glassTableRows,
    acceptRejectPath,
    submitCertificatePath,
    isProducer
  }
}
