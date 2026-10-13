import { now } from '#/server/common/helpers/clock.js'
import { resolveAvailableAcceptanceYears } from './available-acceptance-years.js'

const DEFAULT_PAGE_SIZE = 20
const FETCH_PAGE_SIZE = 100

async function loadAllAwaitingAcceptancePrns(api, id, filters) {
  const fetchPage = (page) =>
    api.getOrganisationPrns(id, {
      ...filters,
      status: 'AwaitingAcceptance',
      page,
      pageSize: FETCH_PAGE_SIZE
    })

  const first = await fetchPage(1)
  const total = first.total ?? 0
  const pageCount = Math.ceil(total / FETCH_PAGE_SIZE)

  const rest = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, i) =>
      fetchPage(i + 2)
    )
  )

  return [first, ...rest].flatMap((response) => response.prns ?? [])
}

/**
 * Loads the awaiting-acceptance PRNs/PERNs list for the Accept/reject page.
 *
 * Without a `year` the API page is returned as is. With a `year`, only PRNs
 * that can be accepted into that obligation year are kept. The API cannot
 * filter by acceptance year, so every page is loaded, filtered, then paged
 * here.
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
  if (year === undefined || year === null) {
    return wasteObligationsApi.getOrganisationPrns(id, {
      search,
      status: 'AwaitingAcceptance',
      material,
      sort,
      page,
      pageSize
    })
  }

  const all = await loadAllAwaitingAcceptancePrns(wasteObligationsApi, id, {
    search,
    material,
    sort
  })
  const clock = now()
  const matching = all.filter((prn) =>
    resolveAvailableAcceptanceYears(prn, { now: clock }).includes(Number(year))
  )

  const effectivePage = page ?? 1
  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE
  const start = (effectivePage - 1) * effectivePageSize

  return {
    prns: matching.slice(start, start + effectivePageSize),
    total: matching.length,
    page: effectivePage,
    pageSize: effectivePageSize
  }
}
