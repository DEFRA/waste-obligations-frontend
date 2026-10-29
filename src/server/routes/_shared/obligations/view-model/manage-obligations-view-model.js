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
  csoPrnsPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { statementViewUrl } from '#/server/routes/cso/compliance/statement-view/controller.js'
import { certificateViewUrl } from '#/server/routes/producer/compliance/certificate-view/controller.js'
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

function resolveRegulatorDisplayName(businessCountry, locale) {
  const country =
    businessCountry in REGULATOR_LOCALE_KEYS
      ? businessCountry
      : DEFAULT_BUSINESS_COUNTRY

  return translate(
    locale,
    `${PAGE_LOCALE_BASE}.${REGULATOR_LOCALE_KEYS[country]}`
  )
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
 * bold material names styled as links (destinations inactive for now),
 * red/green/grey status tags, bold totals row.
 */
function buildManageObligationsTableRows(rows, locale) {
  const notAvailableYetLabel = translate(
    locale,
    resolveComponentLocaleKey(
      locale,
      null,
      'obligationsTable',
      'notAvailableYet'
    )
  )

  return rows.map((row) => {
    const materialName = translate(
      locale,
      row.materialKey,
      row.materialParams ?? {}
    )
    const isTotals = row.isTotals === true || row.material === 'Totals'
    const tag = withManageObligationsTagColour(row.tag)
    const boldClass = isTotals ? 'govuk-!-font-weight-bold' : undefined

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
        html: isTotals
          ? `<strong>${materialName}</strong>`
          : `<strong><a class="govuk-link" href="#">${materialName}</a></strong>`
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

function buildObligationTables(obligations, locale) {
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
      locale
    ),
    glassTableRows: buildManageObligationsTableRows(glassRows, locale)
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
    regulator: getRegulatorDetails(organisation?.businessCountry, locale).name
  }

  return {
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}MissedDeadlineHeading`
    ),
    paragraphPrefix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}MissedDeadlineParagraphPrefix`,
      params
    ),
    paragraphSuffix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}MissedDeadlineParagraphSuffix`,
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
    regulator: getRegulatorDetails(organisation?.businessCountry, locale).name,
    year: obligationYear,
    futureYear: deadlineYear
  }

  return {
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}CancelledHeading`
    ),
    paragraph: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}CancelledParagraph`,
      params
    ),
    buttonLabel: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}CancelledButtonLabel`
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
    locale
  ).name

  return {
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}CancelledMissedDeadlineHeading`
    ),
    paragraphPrefix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}CancelledMissedDeadlineParagraphPrefix`,
      { regulator, year: obligationYear }
    ),
    paragraphSuffix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.${keyPrefix}CancelledMissedDeadlineParagraphSuffix`,
      { regulator, year: deadlineYear }
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

  const { obligationsTableRows, glassTableRows } = buildObligationTables(
    obligations,
    locale
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

  const submittedDeclaration = buildSubmittedDeclaration({
    request,
    locale,
    isProducer,
    pathId,
    declarations: request.pre.declarations,
    obligationYear
  })

  const date = now()
  const afterDeadline = isAfterSubmissionDeadline(deadlineYear, date)
  const cancelledInput = {
    locale,
    isProducer,
    organisation,
    obligationYear,
    deadlineYear,
    declarations: request.pre.declarations
  }

  // A cancelled year can only be resubmitted while the deadline is open
  const cancelledSubmission =
    submittedDeclaration || afterDeadline
      ? null
      : buildCancelledSubmission(cancelledInput)
  const cancelledMissedDeadline =
    submittedDeclaration || !afterDeadline
      ? null
      : buildCancelledMissedDeadline(cancelledInput)

  const isCancelled = Boolean(cancelledSubmission || cancelledMissedDeadline)
  const missedDeadline =
    submittedDeclaration || isCancelled
      ? null
      : buildMissedDeadline({
          locale,
          isProducer,
          organisation,
          obligationYear,
          deadlineYear,
          date
        })

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
    submittedDeclaration,
    cancelledSubmission,
    cancelledMissedDeadline,
    missedDeadline,
    isProducer
  }
}
