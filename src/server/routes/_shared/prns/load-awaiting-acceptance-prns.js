import { now } from '#/server/common/helpers/clock.js'
import { resolveAvailableAcceptanceYears } from './available-acceptance-years.js'

const DEFAULT_PAGE_SIZE = 20
const FETCH_PAGE_SIZE = 100

function reportedPageSize(response) {
  return Number.isInteger(response.pageSize) && response.pageSize > 0
    ? response.pageSize
    : null
}

function pageCountFor(total, step, page) {
  if (step <= 0) {
    return page
  }

  return Math.ceil(total / step)
}

function isNewPrn(seenIds, prn) {
  return prn?.id == null || !seenIds.has(prn.id)
}

function rememberPrn(seenIds, prn) {
  if (prn?.id != null) {
    seenIds.add(prn.id)
  }
}

// A page cached on its own can repeat a PRN from an earlier page. Keep the
// first copy so the stitched list and its total describe the same rows.
function appendUnseenPrns(prns, seenIds, items) {
  const fresh = items.filter((prn) => isNewPrn(seenIds, prn))

  for (const prn of fresh) {
    rememberPrn(seenIds, prn)
    prns.push(prn)
  }

  return fresh.length
}

function fetchPage(api, id, filters, page, pageSize) {
  return api.getOrganisationPrns(id, {
    ...filters,
    status: 'AwaitingAcceptance',
    page,
    pageSize
  })
}

// The API offsets a page by (page - 1) * the page size of that request, and
// echoes the size it used. Trust a smaller size only when the first page is
// full at that size: a later page must not change the offset.
function pageSizeFromFirstResponse(response, requested) {
  const reported = reportedPageSize(response)
  const count = response.prns?.length ?? 0

  if (reported != null && reported < requested && count === reported) {
    return reported
  }

  return requested
}

/**
 * Every awaiting-acceptance page, fetched one at a time.
 *
 * Each page is cached on its own, so a parallel fetch can stitch two
 * generations together and show a PRN twice. The page count and page size
 * stay on the first response, and a repeated note is kept once, so one stale
 * page cannot end the walk or shift the next offset.
 *
 * @param {object} api
 * @param {string} id
 * @param {object} filters
 */
async function loadAllAwaitingAcceptancePrns(api, id, filters) {
  const seenIds = new Set()
  const prns = []
  const first = await fetchPage(api, id, filters, 1, FETCH_PAGE_SIZE)
  const pageSize = pageSizeFromFirstResponse(first, FETCH_PAGE_SIZE)
  const total = first.total ?? first.prns?.length ?? 0

  appendUnseenPrns(prns, seenIds, first.prns ?? [])

  const pageCount = pageCountFor(total, pageSize, 1)
  const laterPages = Array.from(
    { length: Math.max(pageCount - 1, 0) },
    (_, index) => index + 2
  )

  // The next page is requested only after this one arrives.
  await laterPages.reduce(
    (pending, page) =>
      pending.then(async () => {
        const response = await fetchPage(api, id, filters, page, pageSize)

        appendUnseenPrns(prns, seenIds, response.prns ?? [])
      }),
    Promise.resolve()
  )

  return prns
}

/**
 * Every awaiting-acceptance PRN/PERN that can be accepted into `year`.
 * The single definition of "acceptable into a year" shared by the list and
 * the counts on the obligations page.
 *
 * @param {object} wasteObligationsApi
 * @param {string} id organisation or scheme id
 * @param {number|string} year
 * @param {object} [filters]
 */
export async function loadAcceptablePrnsForYear(
  wasteObligationsApi,
  id,
  year,
  filters = {}
) {
  const all = await loadAllAwaitingAcceptancePrns(
    wasteObligationsApi,
    id,
    filters
  )
  const clock = now()

  return all.filter((prn) =>
    resolveAvailableAcceptanceYears(prn, { now: clock }).includes(Number(year))
  )
}

/**
 * Loads the awaiting-acceptance PRNs/PERNs list for the Accept/reject page.
 *
 * The route always supplies a year, defaulting a missing one to the current
 * compliance year. The API cannot filter by acceptance year, so every page is
 * loaded, filtered, then paged here.
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
  const matching = await loadAcceptablePrnsForYear(
    wasteObligationsApi,
    id,
    year,
    { search, material, sort }
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
