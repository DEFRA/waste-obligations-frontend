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
 * The awaiting-acceptance PRNs/PERNs that can be accepted into `year`, and how
 * many there are: the first page of the API's list for that year and its total.
 * The count is the list's total, so the two cannot disagree; the notes let the
 * obligations page tell whether a December waste note can go to either year.
 *
 * @param {object} wasteObligationsApi
 * @param {string} id organisation or scheme id
 * @param {number|string} year
 * @param {number} [pageSize]
 */
export async function loadAcceptablePrnsSummary(
  wasteObligationsApi,
  id,
  year,
  pageSize = 100
) {
  const response = await wasteObligationsApi.getOrganisationPrns(id, {
    status: AWAITING_ACCEPTANCE,
    acceptableIntoYear: year,
    page: 1,
    pageSize
  })

  return { prns: response.prns ?? [], total: response.total }
}
