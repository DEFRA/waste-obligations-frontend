/**
 * Return Intl.DateTimeFormatPart[] from a date
 * @param {Date} [date]
 * @returns { Intl.DateTimeFormatPart[] }
 */
function getUkDateParts(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(date)
}

/**
 * UK (Europe/London) calendar year and month for a date, as numbers. The
 * month is 1-based (January is 1). Throws a RangeError for an invalid date,
 * so callers handling untrusted input must check the date first.
 *
 * @param {Date} [date]
 * @returns {{ year: number, month: number }}
 */
export function getUkYearMonth(date = new Date()) {
  const parts = getUkDateParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value)
  }
}

/**
 * Compliance year for EPR packaging obligations.
 * Runs Feb–Jan in Europe/London (January belongs to the previous year).
 *
 * @param {Date} [date]
 * @returns {number}
 */
export function getComplianceYear(date = new Date()) {
  const { year, month } = getUkYearMonth(date)

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
