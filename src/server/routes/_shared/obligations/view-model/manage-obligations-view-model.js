import { config } from '#/config/config.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  resolveComponentLocaleKey,
  translate
} from '#/server/common/helpers/i18n/translate.js'
import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { now } from '#/server/common/helpers/clock.js'
import { getUkYearMonth } from '#/server/common/helpers/compliance-year.js'
import {
  pickCancelledDeclarationForYear,
  pickLatestSubmittedDeclarationForYear
} from '#/server/routes/_shared/compliance/compliance-declaration.js'
import {
  DEFAULT_BUSINESS_COUNTRY,
  getRegulatorDetails
} from '#/server/routes/_shared/compliance/regulator.js'
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
import { statementViewUrl } from '#/server/routes/cso/compliance/statement-view/controller.js'
import { certificateViewUrl } from '#/server/routes/producer/compliance/certificate-view/controller.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'
import { isApprovedOrDelegatedUser } from '../../../../common/routes/shared/user-permissions.js'

const PAGE_LOCALE_BASE = 'obligations.home'
const DEFAULT_GLASS_REMELT_TARGET_PERCENT = 76

const REGULATOR_LOCALE_KEYS = {
  'GB-ENG': 'regulatorEngland',
  'GB-SCT': 'regulatorScotland',
  'GB-WLS': 'regulatorWales',
  'GB-NIR': 'regulatorNorthernIreland'
}

/**
 * True once any material has data. A year with no obligations, or only
 * materials marked NoDataYet, has nothing to certify yet.
 */
function hasObligationData(obligations) {
  return (obligations ?? []).some((o) => o.status !== 'NoDataYet')
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
      materialHref
    ),
    glassTableRows: buildManageObligationsTableRows(
      glassRows,
      locale,
      materialHref
    )
  }
}

/**
 * The link to a declaration already submitted for the year, in place of the submit link.
 * Returns null when nothing has been submitted for that year.
 */
function buildSubmittedDeclaration({
  request,
  locale,
  isProducer,
  pathId,
  declarations,
  obligationYear
}) {
  const declaration = pickLatestSubmittedDeclarationForYear(
    declarations,
    obligationYear
  )

  if (!declaration) {
    return null
  }

  if (isProducer) {
    return {
      href: withForwardedPrefix(
        request,
        certificateViewUrl(pathId, locale, declaration.id)
      ),
      buttonLabel: translate(
        locale,
        'compliance.components.success.viewCertificateButton'
      ),
      heading: translate(
        locale,
        `${PAGE_LOCALE_BASE}.certificate.submitted.heading`,
        {
          year: obligationYear
        }
      ),
      paragraphPrefix: translate(
        locale,
        `${PAGE_LOCALE_BASE}.certificate.submitted.paragraph`,
        {
          year: obligationYear
        }
      )
    }
  }

  return {
    href: withForwardedPrefix(
      request,
      statementViewUrl(pathId, locale, declaration.id)
    ),
    buttonLabel: translate(
      locale,
      'compliance.components.success.viewStatementButton'
    ),
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.statement.submitted.heading`,
      {
        year: obligationYear
      }
    ),
    paragraphPrefix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.statement.submitted.paragraph`,
      {
        year: obligationYear
      }
    )
  }
}

/**
 * The submission deadline is 31 January of the deadline year, so it has passed
 * once the UK calendar reaches February of that year.
 */
function isAfterSubmissionDeadline(deadlineYear, date) {
  const { year, month } = getUkYearMonth(date)

  return year > deadlineYear || (year === deadlineYear && month > 1)
}

/**
 * Copy for a year that passed its deadline without a submission. Returns null
 * while the deadline is still open.
 */
function buildMissedDeadline({
  locale,
  isProducer,
  organisation,
  obligationYear,
  deadlineYear,
  date
}) {
  if (!isAfterSubmissionDeadline(deadlineYear, date)) {
    return null
  }

  const keyPrefix = isProducer ? 'certificate' : 'statement'
  const params = {
    year: deadlineYear,
    yearBefore: obligationYear,
    regulator: getRegulatorDetails(organisation?.businessCountry, locale, true)
      .nameWithArticle
  }

  return {
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.missedDeadline.heading`
    ),
    paragraphPrefix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.missedDeadline.paragraphPrefix`,
      params
    ),
    paragraphSuffix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.missedDeadline.paragraphSuffix`,
      params
    )
  }
}

/**
 * Copy asking the organisation to resubmit a year the regulator cancelled. Only
 * shown while the deadline is still open. Returns null when nothing was cancelled.
 */
function buildCancelledSubmission({
  locale,
  isProducer,
  organisation,
  obligationYear,
  deadlineYear,
  declarations
}) {
  if (!pickCancelledDeclarationForYear(declarations, obligationYear)) {
    return null
  }

  const keyPrefix = isProducer ? 'certificate' : 'statement'
  const params = {
    regulator: getRegulatorDetails(organisation?.businessCountry, locale, true)
      .nameWithArticle,
    year: obligationYear,
    futureYear: deadlineYear
  }

  return {
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.cancelled.heading`
    ),
    paragraph: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.cancelled.paragraph`,
      params
    ),
    buttonLabel: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.cancelled.buttonLabel`
    )
  }
}

/**
 * Copy for a year the regulator cancelled after its deadline has passed: the
 * organisation can no longer resubmit. Returns null when nothing was cancelled.
 */
function buildCancelledMissedDeadline({
  locale,
  isProducer,
  organisation,
  obligationYear,
  deadlineYear,
  declarations
}) {
  if (!pickCancelledDeclarationForYear(declarations, obligationYear)) {
    return null
  }

  const keyPrefix = isProducer ? 'certificate' : 'statement'
  const regulator = getRegulatorDetails(
    organisation?.businessCountry,
    locale,
    true
  ).nameWithArticle

  return {
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.cancelledMissedDeadline.heading`
    ),
    paragraphPrefix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.cancelledMissedDeadline.paragraphPrefix`,
      { regulator, year: obligationYear }
    ),
    paragraphSuffix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}.cancelledMissedDeadline.paragraphSuffix`,
      { regulator, year: deadlineYear }
    )
  }
}

/**
 * Links to the PRN list and to the submit page. Both are prefix-aware.
 */
function buildPageLinks(request, pathId, isProducer, obligationYear) {
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
 * Which deadline-related tile applies. Only one of the three is non-null, and
 * none is shown once the year is submitted.
 */
function buildDeadlineStatus({
  locale,
  isProducer,
  organisation,
  obligationYear,
  deadlineYear,
  declarations,
  submittedDeclaration,
  date
}) {
  const none = {
    cancelledSubmission: null,
    cancelledMissedDeadline: null,
    missedDeadline: null
  }

  if (submittedDeclaration) {
    return none
  }

  const input = {
    locale,
    isProducer,
    organisation,
    obligationYear,
    deadlineYear,
    declarations
  }

  // A cancelled year can only be resubmitted while the deadline is open
  if (!isAfterSubmissionDeadline(deadlineYear, date)) {
    return { ...none, cancelledSubmission: buildCancelledSubmission(input) }
  }

  const cancelledMissedDeadline = buildCancelledMissedDeadline(input)

  return {
    ...none,
    cancelledMissedDeadline,
    missedDeadline: cancelledMissedDeadline
      ? null
      : buildMissedDeadline({ ...input, date })
  }
}

/**
 * Organisation name for the header: the business for a producer, the scheme for a CSO.
 */
function buildOrganisationFields(organisation, isProducer) {
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
export function buildManageObligationsViewModel({
  request,
  userType,
  obligationYear
}) {
  const locale = getLocale(request)
  const user = request.yar.get('user')
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

  const submittedDeclaration = buildSubmittedDeclaration({
    request,
    locale,
    isProducer,
    pathId,
    declarations: request.pre.declarations,
    obligationYear
  })
  const deadlineStatus = buildDeadlineStatus({
    locale,
    isProducer,
    organisation,
    obligationYear,
    deadlineYear,
    declarations: request.pre.declarations,
    submittedDeclaration,
    date: now()
  })
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
    ...buildOrganisationFields(organisation, isProducer),
    organisationName: isProducer ? organisation?.name : null,
    complianceSchemeName: isProducer ? null : organisation?.name,
    regulatorName: resolveRegulatorDisplayName(
      organisation?.businessCountry,
      locale
    ),
    awaitingAcceptanceCount: awaitingAcceptancePrns?.total ?? 0,
    hasObligationData: hasObligationData(obligations),
    showButton: Boolean(isApprovedOrDelegatedUser(user)),
    glassTarget: resolveGlassTarget(obligations),
    obligationsTableRows,
    glassTableRows,
    acceptRejectPath,
    submitCertificatePath,
    ...buildPageLinks(request, pathId, isProducer, obligationYear),
    submittedDeclaration,
    ...deadlineStatus,
    isProducer
  }
}
