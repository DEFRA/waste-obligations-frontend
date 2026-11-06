// UK calendar months, 1-based.
const JANUARY = 1
const DECEMBER = 12
const MONTHS_PER_YEAR = 12

// Built once. Resolving acceptance years calls this for every PRN on a list.
const ukYearMonthFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: 'numeric'
})

/**
 * Return Intl.DateTimeFormatPart[] from a date
 * @param {Date} [date]
 * @returns { Intl.DateTimeFormatPart[] }
 */
function getUkDateParts(date) {
  return ukYearMonthFormat.formatToParts(date)
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
 * Whether next year can be chosen at `date`: only in December and January (UK
 * time), as in the Packaging service. From 1 February the window closes.
 *
 * @param {Date} [date]
 * @returns {boolean}
 */
export function isFutureYearWindow(date = new Date()) {
  const { month } = getUkYearMonth(date)

  return month === DECEMBER || month === JANUARY
}

/**
 * Latest year accepted on query strings: the current compliance year, plus
 * next year while it can be chosen (December and January).
 *
 * @param {Date} [date]
 * @returns {number}
 */
export function getMaxQueryYear(date = new Date()) {
  return getComplianceYear(date) + (isFutureYearWindow(date) ? 1 : 0)
}

/**
 * Whether the submission deadline for an obligation year has passed: 31
 * January of the following year, inclusive, in UK time.
 *
 * @param {number} obligationYear
 * @param {Date} [date]
 * @returns {boolean}
 */
export function isSubmissionDeadlinePassed(obligationYear, date = new Date()) {
  const { year, month } = getUkYearMonth(date)

  return (
    year * MONTHS_PER_YEAR + month >
    (obligationYear + 1) * MONTHS_PER_YEAR + JANUARY
  )
}
