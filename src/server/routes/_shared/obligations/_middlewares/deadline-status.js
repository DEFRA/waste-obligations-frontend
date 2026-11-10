import { isSubmissionDeadlinePassed } from '#/server/common/helpers/compliance-year.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { pickCancelledDeclarationForYear } from '#/server/routes/_shared/compliance/compliance-declaration.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import { PAGE_LOCALE_BASE } from './constants.js'

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
  if (!isSubmissionDeadlinePassed(deadlineYear, date)) {
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
 * Which deadline-related tile applies. Only one of the three is non-null, and
 * none is shown once the year is submitted.
 */
export function buildDeadlineStatus({
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
  if (!isSubmissionDeadlinePassed(deadlineYear, date)) {
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
