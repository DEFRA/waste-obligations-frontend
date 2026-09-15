/**
 * Compliance year for EPR packaging obligations.
 * Runs Feb–Jan in Europe/London (January belongs to the previous year).
 *
 * @param {Date} [date]
 * @returns {number}
 */
export function getComplianceYear(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)

  return month === 1 ? year - 1 : year
}

/**
 * Latest year accepted on query strings. Packaging can select the current
 * compliance year plus one (ObligationYearOptions).
 *
 * @param {Date} [date]
 * @returns {number}
 */
export function getMaxQueryYear(date = new Date()) {
  return getComplianceYear(date) + 1
}
