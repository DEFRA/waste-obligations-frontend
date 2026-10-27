const DEFAULT_PAGE_SIZE = 20
const AWAITING_ACCEPTANCE = 'AwaitingAcceptance'

/**
 * Loads one page of the awaiting-acceptance PRNs/PERNs list for the
 * Accept/reject page. The Waste Obligations API owns the rule for which notes
 * can be accepted into `year` and returns the filtered page and total, so the
 * list and the count on the obligations page cannot disagree.
 *
 * @param {object} wasteObligationsApi
 * @param {string} id organisation or scheme id
 * @param {{ search?: string, material?: string, sort?: string, page?: number, pageSize?: number, year?: number }} options
 */
export async function loadAwaitingAcceptancePrns(
  wasteObligationsApi,
  id,
  { search, material, sort, page, pageSize, year } = {}
) {
  const effectivePage = page ?? 1
  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE

  const response = await wasteObligationsApi.getOrganisationPrns(id, {
    search,
    material,
    sort,
    status: AWAITING_ACCEPTANCE,
    acceptableIntoYear: year,
    page: effectivePage,
    pageSize: effectivePageSize
  })

  return {
    prns: response.prns,
    total: response.total,
    page: effectivePage,
    pageSize: effectivePageSize
  }
}

/**
 * How many awaiting-acceptance PRNs/PERNs can be accepted into `year`: the
 * total of the list for that year.
 *
 * @param {object} wasteObligationsApi
 * @param {string} id organisation or scheme id
 * @param {number|string} year
 */
export async function countAcceptablePrnsForYear(
  wasteObligationsApi,
  id,
  year
) {
  const response = await wasteObligationsApi.getOrganisationPrns(id, {
    status: AWAITING_ACCEPTANCE,
    acceptableIntoYear: year,
    page: 1,
    pageSize: 1
  })

  return response.total
}
