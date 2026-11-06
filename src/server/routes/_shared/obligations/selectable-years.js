import {
  getComplianceYear,
  isFutureYearWindow
} from '#/server/common/helpers/compliance-year.js'

/** The earliest year a user can choose. */
export const EARLIEST_SELECTABLE_YEAR = 2025

/**
 * The last year whose obligations were calculated before the certificate of
 * compliance replaced them: 2025 has no obligations to manage, so choosing it
 * leads to the compliance page instead.
 */
export const CSOC_UNAVAILABLE_PAST_YEAR = EARLIEST_SELECTABLE_YEAR

/**
 * The years a user can choose to manage, newest first: next year only in
 * December and January (UK time), then the current compliance year, then each
 * earlier year back to the earliest.
 *
 * @param {Date} date
 * @returns {number[]}
 */
export function getSelectableYears(date) {
  const currentYear = getComplianceYear(date)
  const years = []

  if (isFutureYearWindow(date)) {
    years.push(currentYear + 1)
  }

  for (let year = currentYear; year >= EARLIEST_SELECTABLE_YEAR; year--) {
    years.push(year)
  }

  return years
}
