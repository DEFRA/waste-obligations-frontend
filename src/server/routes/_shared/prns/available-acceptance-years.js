import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'

// 2025 December waste is a one-off: users cannot choose between two years.
const DECEMBER_WASTE_NO_CHOICE_YEAR = 2025
const DECEMBER_WASTE_NO_CHOICE_UNTIL_YEAR = 2026

/**
 * Years a PRN/PERN may be accepted against right now (UI perspective).
 *
 * Ported from epr-packaging-frontend `PrnAvailableAcceptanceYearsResolver`:
 * - most PRNs: current compliance year only
 * - December waste: may offer one or two years inside the Dec–Jan window
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
 * Standard PRNs and December-waste single-year PRNs only.
 *
 * @param {{ obligationYear?: number, decemberWaste?: boolean }} prn
 * @param {{ now?: Date }} [options]
 * @returns {boolean}
 */
export function canMultiSelectPrn(prn, options) {
  return resolveAvailableAcceptanceYears(prn, options).length === 1
}
