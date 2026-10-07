import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import {
  csoPrnsPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'

const ELLIPSIS = 0
const THREE = 3

/**
 * Page numbers to show: the first page(s) before the current page, the current
 * page, then the last page(s) after it. Up to three neighbours are listed in
 * full on each side; beyond that the run collapses to `first, …, current - 1`
 * and `current + 1, …, last`. `0` marks an ellipsis.
 *
 * @param {number} currentPage
 * @param {number} pageCount
 * @returns {number[]}
 */
export function buildPageList(currentPage, pageCount) {
  if (pageCount < 1) {
    return []
  }

  const before = currentPage - 1
  const after = pageCount - currentPage
  const pages = []

  if (before > THREE) {
    pages.push(1, ELLIPSIS, before)
  } else {
    for (let page = 1; page <= before; page++) {
      pages.push(page)
    }
  }

  pages.push(currentPage)

  if (after > THREE) {
    pages.push(currentPage + 1, ELLIPSIS, pageCount)
  } else {
    for (let page = currentPage + 1; page <= currentPage + after; page++) {
      pages.push(page)
    }
  }

  return pages
}

/**
 * Clamps a possibly out-of-range page number into `[1, pageCount]`. Returns 1
 * when `pageCount` is less than 1 or `page` isn't a positive integer.
 *
 * @param {number} page
 * @param {number} pageCount
 * @returns {number}
 */
export function clampPrnsPage(page, pageCount) {
  if (pageCount < 1) {
    return 1
  }

  return Math.min(Math.max(Number.isInteger(page) ? page : 1, 1), pageCount)
}

export function buildPageHref({ basePath, query, page }) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (
      key !== 'page' &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      params.set(key, String(value))
    }
  }
  params.set('page', String(page))

  return `${basePath}?${params.toString()}`
}

/**
 * Build the GOV.UK pagination params for the PRNs list, or `null` when there
 * is only one page. Links keep the current query (year, sort, material, ...)
 * and only change `page`.
 *
 * @param {object} options
 * @param {number} [options.page]
 * @param {number} [options.pageSize]
 * @param {number} [options.total]
 * @param {'producer'|'cso'} options.userType
 * @param {string} options.pathId
 * @param {string} [options.locale]
 * @param {object} [options.request]
 */
export function buildPrnsPagination({
  page,
  pageSize,
  total,
  userType,
  pathId,
  locale = 'en',
  request
}) {
  if (!(pageSize > 0) || !(total > 0)) {
    return null
  }

  const pageCount = Math.ceil(total / pageSize)

  if (pageCount <= 1) {
    return null
  }

  const currentPage = clampPrnsPage(page, pageCount)
  const buildPath = userType === 'cso' ? csoPrnsPath : producerPrnsPath
  const basePath = withForwardedPrefix(request, buildPath(pathId))
  const hrefFor = (target) =>
    buildPageHref({ basePath, query: request?.query ?? {}, page: target })

  const pagination = {
    landmarkLabel: translate(locale, 'prns.list.pagination.landmark'),
    items: buildPageList(currentPage, pageCount).map((number) =>
      number === ELLIPSIS
        ? { ellipsis: true }
        : { number, href: hrefFor(number), current: number === currentPage }
    )
  }

  if (currentPage > 1) {
    pagination.previous = {
      href: hrefFor(currentPage - 1),
      text: translate(locale, 'prns.list.pagination.previous')
    }
  }

  if (currentPage < pageCount) {
    pagination.next = {
      href: hrefFor(currentPage + 1),
      text: translate(locale, 'prns.list.pagination.next')
    }
  }

  return pagination
}

/**
 * Local redirect target for a PRNs list request that landed on an empty page
 * beyond the current results, e.g. a bookmarked or shared later page after
 * the underlying list shrank (items accepted/rejected elsewhere). The
 * pagination links above already clamp the *displayed* page number to a
 * valid one; this clamps which page actually gets **fetched** by sending the
 * browser to the last page that can hold rows.
 *
 * Returns `null` when the request doesn't need correcting.
 *
 * @param {object} options
 * @param {Array} options.prns
 * @param {number} [options.page]
 * @param {number} [options.pageSize]
 * @param {number} [options.total]
 * @param {'producer'|'cso'} options.userType
 * @param {string} options.pathId
 * @param {object} [options.request]
 * @returns {string|null} an application-local path (no forwarded prefix -
 *   pass straight to `h.redirect()`, which prefixes local redirects itself)
 */
export function buildPrnsOutOfRangePageRedirect({
  prns,
  page,
  pageSize,
  total,
  userType,
  pathId,
  request
}) {
  if (prns.length > 0 || !(pageSize > 0) || !(total > 0)) {
    return null
  }

  const pageCount = Math.ceil(total / pageSize)
  const validPage = clampPrnsPage(page, pageCount)

  if (validPage === page) {
    return null
  }

  const buildPath = userType === 'cso' ? csoPrnsPath : producerPrnsPath

  return buildPageHref({
    basePath: buildPath(pathId),
    query: request?.query ?? {},
    page: validPage
  })
}
