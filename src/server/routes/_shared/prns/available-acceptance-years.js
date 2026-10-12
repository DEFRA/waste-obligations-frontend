import {
  getComplianceYear,
  getUkYearMonth
} from '#/server/common/helpers/compliance-year.js'
import { now as applicationNow } from '#/server/common/helpers/clock.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { isPrnStatusEditable } from './prn-status.js'

// UK calendar months, 1-based.
const JANUARY = 1
const DECEMBER = 12
// 2025 December waste is a one-off: users cannot choose between two years.
const DECEMBER_WASTE_NO_CHOICE_YEAR = 2025
const DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR = 2026

// Date.UTC months are zero-based.
const DECEMBER_MONTH_INDEX = 11
const FEBRUARY_MONTH_INDEX = 1

/**
 * December waste: a choice of two years only in December of the PRN's year and
 * January of the next (1 Dec to 31 Jan); otherwise a single year, or none once
 * the PRN has expired.
 *
 * @param {number} prnYear
 * @param {number} thisComplianceYear
 * @param {Date} now
 * @returns {number[]}
 */
function resolveDecemberWasteYears(prnYear, thisComplianceYear, now) {
  // 2025 December waste never offers a year choice: only the current
  // compliance year while it remains actionable.
  if (
    prnYear === DECEMBER_WASTE_NO_CHOICE_YEAR &&
    (thisComplianceYear === DECEMBER_WASTE_NO_CHOICE_YEAR ||
      thisComplianceYear === DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR)
  ) {
    return [thisComplianceYear]
  }

  const nowMs = now.getTime()
  const windowStartMs = Date.UTC(prnYear, DECEMBER_MONTH_INDEX, 1)
  const windowEndMs = Date.UTC(prnYear + 1, FEBRUARY_MONTH_INDEX, 1)

  if (nowMs >= windowStartMs && nowMs < windowEndMs) {
    return [prnYear, prnYear + 1]
  }

  // Before the window the PRN can only be accepted into its own year; after it,
  // into the next compliance year only.
  if (prnYear === thisComplianceYear) {
    return [prnYear]
  }

  return prnYear + 1 === thisComplianceYear ? [thisComplianceYear] : []
}

/**
 * Whether `accreditationYear` falls in the immediate UK December/January flash window
 * i.e. isDecemberJanuaryFlashWindow is true if:
 * accreditationYear is the current year and it's December, show flash
 * accreditationYear is the year BEFORE the current year and it's January, show flash
 *
 * @param {number} accreditationYear
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isDecemberWasteWindow(
  accreditationYear,
  now = applicationNow()
) {
  const isNotValidAccreditationYear =
    !accreditationYear || Number.isNaN(accreditationYear)
  const { month } = getUkYearMonth(now)
  const isDecemberWasteMonth = [JANUARY, DECEMBER].includes(month)

  if (isNotValidAccreditationYear || !isDecemberWasteMonth) {
    return false
  }

  const nowDateParts = getUkYearMonth(now)

  return (
    (accreditationYear === nowDateParts.year &&
      nowDateParts.month === DECEMBER) ||
    (accreditationYear === nowDateParts.year - 1 &&
      nowDateParts.month === JANUARY)
  )
}

/**
 * Acceptance years for a December waste PRN: its own year before the choice
 * window opens (1 December), both years inside it (until 1 February), then the
 * next year only while that is the current compliance year. 2025 December
 * waste never offers a choice.
 *
 * @param {number} prnYear
 * @param {number} thisComplianceYear
 * @param {Date} now
 * @returns {number[]}
 */
function resolveDecemberWasteYears(prnYear, thisComplianceYear, now) {
  const isNoChoiceYear =
    prnYear === DECEMBER_WASTE_NO_CHOICE_YEAR &&
    thisComplianceYear <= DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR

  if (isNoChoiceYear) {
    return [thisComplianceYear]
  }

  const nowMs = now.getTime()
  const windowStartMs = Date.UTC(prnYear, DECEMBER - 1, 1)
  const windowEndMs = Date.UTC(prnYear + 1, 1, 1)

  if (nowMs >= windowStartMs && nowMs < windowEndMs) {
    return [prnYear, prnYear + 1]
  }

  if (prnYear === thisComplianceYear) {
    return [prnYear]
  }

  return prnYear + 1 === thisComplianceYear ? [thisComplianceYear] : []
}

/**
 * Years a PRN/PERN may be accepted against right now (UI perspective).
 *
 * - most PRNs: the current compliance year only
 * - December waste: its own year only until 1 December, both the PRN's year
 *   and the next until the end of the following January, then the next year
 *   only; 2025 December waste offers
 *   one year with no choice
 * - an empty array when the PRN can't be accepted into any year
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean }} prn
 * @param {{ now?: Date }} [options]
 * @returns {number[]}
 */
export function resolveAvailableAcceptanceYears(
  prn,
  { now = applicationNow() } = {}
) {
  const prnYear = prn?.obligationYear

  if (!Number.isInteger(prnYear)) {
    return []
  }

  const thisComplianceYear = getComplianceYear(now)

  if (prnYear > thisComplianceYear) {
    return []
  }

  if (prn?.decemberWaste) {
    return resolveDecemberWasteYears(prnYear, thisComplianceYear, now)
  }

  return prnYear === thisComplianceYear ? [prnYear] : []
}

/**
 * Whether the PRN may be included in bulk multi-select accept.
 * Standard PRNs and December-waste year PRNs only.
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean }} prn
 * @param {{ now?: Date }} [options]
 * @returns {boolean}
 */
export function canMultiSelectPrn(prn, options) {
  return resolveAvailableAcceptanceYears(prn, options).length === 1
}

/**
 * The obligation year a multi-selection is accepted into: the single
 * available acceptance year its PRNs share. Undefined when any PRN offers no
 * year or a choice of years, or the PRNs resolve to different years, because
 * one bulk accept records one year for every PRN.
 *
 * Only December waste can resolve to the year after its own obligation year;
 * a standard PRN only ever resolves to its own year. Bulk accept always sends
 * this value, and the Waste Obligations API records it as sent without
 * checking it against the PRNs, so these rules are the only ones applied.
 *
 * @param {Array<{ obligationYear?: number, decemberWaste?: boolean }>} prns
 * @param {{ now?: Date }} [options]
 * @returns {number|undefined}
 */
export function resolveSelectionAcceptanceYear(prns, options) {
  const years = new Set()

  for (const prn of prns) {
    const available = resolveAvailableAcceptanceYears(prn, options)

    if (available.length !== 1) {
      return undefined
    }

    years.add(available[0])
  }

  return years.size === 1 ? [...years][0] : undefined
}

/**
 * Whether the December waste "can be accepted towards ..." flash should show
 * for this PRN right now.
 *
 * Only for awaiting-acceptance December waste PRNs, during the immediate
 * Dec/Jan flash window for that PRN's accreditation year, while it offers a choice
 * of two acceptance years.
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean, status?: string, accreditationYear?: string }} prn
 * @param {{ now?: Date }} [options]
 * @returns {boolean}
 */
export function shouldShowDecemberWasteFlash(
  prn,
  { now = applicationNow() } = {}
) {
  return (
    Boolean(prn?.decemberWaste) &&
    isPrnStatusEditable(prn) &&
    isDecemberWasteWindow(prn?.accreditationYear, now) &&
    resolveAvailableAcceptanceYears(prn, { now }).length === 2
  )
}

/**
 * Builds the December waste flash label text for the given acceptance years.
 *
 * @param {string} locale
 * @param {number[]} availableAcceptanceYears
 * @returns {string}
 */
export function decemberWasteFlashText(locale, availableAcceptanceYears) {
  if (availableAcceptanceYears.length === 2) {
    return translate(locale, 'prns.prn.acceptanceYears', {
      yearOne: availableAcceptanceYears[0],
      yearTwo: availableAcceptanceYears[1]
    })
  }

  return ''
}

/**
 * December waste flash state for a PRN: whether to show it and, if so, its
 * text. The single place the PRN detail pages and the PRNs list build the
 * flash from.
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean, status?: string, accreditationYear?: string }} prn
 * @param {string} locale
 * @param {{ now?: Date }} [options]
 * @returns {{ show: boolean, text: string }}
 */
export function buildDecemberWasteFlash(
  prn,
  locale,
  { now = applicationNow() } = {}
) {
  if (!shouldShowDecemberWasteFlash(prn, { now })) {
    return { show: false, text: '' }
  }

  return {
    show: true,
    text: decemberWasteFlashText(
      locale,
      resolveAvailableAcceptanceYears(prn, { now })
    )
  }
}

/**
 * Whether the user must choose which obligation year to accept the PRN into
 * (a December waste PRN inside the Dec–Jan window).
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean }} prn
 * @param {{ now?: Date }} [options]
 * @returns {boolean}
 */
export function hasAcceptanceYearChoice(prn, options) {
  return resolveAvailableAcceptanceYears(prn, options).length > 1
}
