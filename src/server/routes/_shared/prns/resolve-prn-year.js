/**
 * Resolve the obligation year shown on the PRN detail page.
 *
 * The page shows this as the PRN's "year of issue", so the PRN's own
 * `obligationYear` is authoritative and always wins. `?year=` is optional
 * and is used only when the PRN has no year of its own.
 *
 * @param {number|undefined} queryYear - the validated `year` query param
 * @param {{ obligationYear?: number }|undefined} prn - the loaded PRN
 * @returns {number|undefined}
 */
export function resolvePrnYear(queryYear, prn) {
  return prn?.obligationYear ?? queryYear
}
