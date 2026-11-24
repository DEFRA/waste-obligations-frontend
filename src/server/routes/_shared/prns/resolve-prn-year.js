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

/**
 * The years and confirmation state a PRN or PERN page needs.
 *
 * The year the user chose (`?year=`) carries through the PRN pages; the note's
 * own year is used only when none was chosen. Straight after an acceptance
 * (`confirmed=1` on an accepted note) the obligations button opens the year
 * the note was accepted into, which differs from the chosen year for a
 * December Waste note accepted into the next year.
 *
 * @param {{ year?: number, confirmed?: string }|undefined} query - the validated query
 * @param {{ obligationYear?: number, status?: string }|undefined} prn - the loaded PRN
 */
export function resolvePrnPageYears(query, prn) {
  const queryYear = query?.year
  const year = resolvePrnYear(queryYear, prn)
  const isAcceptanceConfirmation =
    query?.confirmed === '1' && prn?.status === 'Accepted'
  const isRejectionConfirmation =
    query?.confirmed === '1' && prn?.status === 'Rejected'
  const chosenYear = queryYear ?? year

  return {
    year,
    chosenYear,
    obligationsYear: isAcceptanceConfirmation ? year : chosenYear,
    isAcceptanceConfirmation,
    isRejectionConfirmation
  }
}
