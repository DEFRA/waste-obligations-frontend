import {
  getComplianceYear,
  getUkYearMonth
} from '#/server/common/helpers/compliance-year.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { isPrnStatusEditable } from './prn-status.js'

// UK calendar months, 1-based.
const JANUARY = 1
const DECEMBER = 12
// 2025 December waste is a one-off: users cannot choose between two years.
const DECEMBER_WASTE_NO_CHOICE_YEAR = 2025
const DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR = 2026

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
export function isDecemberWasteWindow(accreditationYear, now = new Date()) {
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
  { now = new Date() } = {}
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
    // 2025 December waste never offers a year choice — only the current
    // compliance year while it remains actionable.
    if (
      prnYear === DECEMBER_WASTE_NO_CHOICE_YEAR &&
      (thisComplianceYear === DECEMBER_WASTE_NO_CHOICE_YEAR ||
        thisComplianceYear === DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR)
    ) {
      return [thisComplianceYear]
    }

    const nowMs = now.getTime()
    const windowStartMs = Date.UTC(prnYear, DECEMBER - 1, 1)
    const windowEndMs = Date.UTC(prnYear + 1, 1, 1)

    if (nowMs >= windowStartMs && nowMs < windowEndMs) {
      return [prnYear, prnYear + 1]
    }

    // Before the window the note can only be accepted into its own year.
    if (prnYear === thisComplianceYear) {
      return [prnYear]
    }

    if (prnYear + 1 === thisComplianceYear) {
      return [thisComplianceYear]
    }

    return []
  }

  if (prnYear === thisComplianceYear) {
    return [prnYear]
  }

  return []
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
export function shouldShowDecemberWasteFlash(prn, { now = new Date() } = {}) {
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
  { now = new Date() } = {}
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
