import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import {
  csoPrnsPath,
  producerPrnsPath
} from '#/server/routes/_shared/prns/prns-paths.js'

const ELLIPSIS = 0

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

  if (before > 3) {
    pages.push(1, ELLIPSIS, before)
  } else {
    for (let page = 1; page <= before; page++) {
      pages.push(page)
    }
  }

  pages.push(currentPage)

  if (after > 3) {
    pages.push(currentPage + 1, ELLIPSIS, pageCount)
  } else {
    for (let page = currentPage + 1; page <= currentPage + after; page++) {
      pages.push(page)
    }
  }

  return pages
}

function buildPageHref({ basePath, query, page }) {
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

  const currentPage = Math.min(
    Math.max(Number.isInteger(page) ? page : 1, 1),
    pageCount
  )
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
