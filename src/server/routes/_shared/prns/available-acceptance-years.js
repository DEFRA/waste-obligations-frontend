import {
  getComplianceYear,
  getUkYearMonth
} from '#/server/common/helpers/compliance-year.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { isPrnStatusEditable } from './prn-status.js'

const TWELVE = 12;
// 2025 December waste is a one-off: users cannot choose between two years.
const DECEMBER_WASTE_NO_CHOICE_YEAR = 2025
const DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR = 2026

/**
 * Whether `now` falls within the UK December/January flash window, i.e.
 * whether the UK calendar month is December or January.
 *
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isInDecemberJanuaryFlashWindow(now = new Date()) {
  const { month } = getUkYearMonth(now)
  return month === 1 || month === TWELVE
}

/**
 * Whether `issuedAt` falls in the immediate UK December/January flash window
 * for `now` - i.e. `now` is in the same Dec/Jan period the PRN was issued in,
 * not a prior year's January.
 *
 * @param {string|Date|undefined} issuedAt
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isIssuedInImmediateDecemberJanuaryFlashWindow(
  issuedAt,
  now = new Date()
) {
  const isNotValidDate = Number.isNaN(new Date(issuedAt).getTime())

  if (!issuedAt || isNotValidDate || !isInDecemberJanuaryFlashWindow(now)) {
    return false
  }

  const nowParts = getUkYearMonth(now)
  const windowStartYear =
    nowParts.month === TWELVE ? nowParts.year : nowParts.year - 1

  const issueParts = getUkYearMonth(new Date(issuedAt))

  return (
    (issueParts.year === windowStartYear && issueParts.month === TWELVE) ||
    (issueParts.year === windowStartYear + 1 && issueParts.month === 1)
  )
}

/**
 * Years a PRN/PERN may be accepted against right now (UI perspective).
 *
 * available acceptance years resolver:
 * - most PRNs: current compliance year only
 * - December waste: offers two years inside the Dec–Jan window
 *   as an array of numbers or an empty arrray
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

    const windowEndMs = Date.UTC(prnYear + 1, 1, 1)

    if (now.getTime() < windowEndMs) {
      return [prnYear, prnYear + 1]
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
 * Dec/Jan flash window for that PRN's issue date, while at least one
 * acceptance year remains available.
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean, status?: string, issuedAt?: string }} prn
 * @param {{ now?: Date }} [options]
 * @returns {boolean}
 */
export function shouldShowDecemberWasteFlash(prn, { now = new Date() } = {}) {
  return (
    Boolean(prn?.decemberWaste) &&
    isPrnStatusEditable(prn) &&
    isIssuedInImmediateDecemberJanuaryFlashWindow(prn?.issuedAt, now) &&
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
 * @param {{ obligationYear?: number, decemberWaste?: boolean, status?: string, issuedAt?: string }} prn
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
