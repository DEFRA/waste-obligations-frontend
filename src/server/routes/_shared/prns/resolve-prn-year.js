/**
 * Resolve the obligation year for the PRN detail page.
 *
 * The page shows this as the PRN's "year of issue", so the PRN's own
 * `obligationYear` is authoritative and always wins. PRN list links pass a
 * matching `?year=` param, but direct links may omit it or carry a stale value:
 * fall back to the query param only when the PRN has no year, and finally to the
 * current year. A missing or mismatched param never fails the request.
 *
 * @param {number|undefined} queryYear - the validated `year` query param
 * @param {{ obligationYear?: number }|undefined} prn - the loaded PRN
 * @returns {number}
 */
export function resolvePrnYear(queryYear, prn) {
  return prn?.obligationYear ?? queryYear ?? new Date().getFullYear()
}
