const FETCH_PAGE_SIZE = 100

/**
 * Every PRN and PERN issued to `id` for an obligation year, in any status.
 *
 * The API cannot filter by obligation year, so every page is fetched, one at a
 * time, and filtered here. A PRN repeated across pages is kept once.
 *
 * @param {object} wasteObligationsApi
 * @param {string} id organisation or scheme id
 * @param {number} obligationYear
 * @returns {Promise<object[]>}
 */
export async function loadPrnsForObligationYear(
  wasteObligationsApi,
  id,
  obligationYear
) {
  const seenIds = new Set()
  const prns = []
  let page = 1
  let total = 0

  do {
    // Pages depend on each other (the total comes from the first), so they
    // are fetched in turn.
    const response = await wasteObligationsApi.getOrganisationPrns(id, {
      page,
      pageSize: FETCH_PAGE_SIZE
    })
    const items = response.prns ?? []

    total = response.total ?? items.length

    for (const prn of items) {
      if (!seenIds.has(prn.id)) {
        seenIds.add(prn.id)
        prns.push(prn)
      }
    }

    if (items.length === 0) {
      break
    }

    page += 1
  } while ((page - 1) * FETCH_PAGE_SIZE < total)

  return prns.filter((prn) => prn.obligationYear === obligationYear)
}
