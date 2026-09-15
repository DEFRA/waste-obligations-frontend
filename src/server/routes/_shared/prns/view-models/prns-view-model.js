import { formatDate } from '#/config/nunjucks/filters/format-date.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { canMultiSelectPrn } from '#/server/routes/_shared/prns/available-acceptance-years.js'
import {
  csoPrnPath,
  producerPrnPath
} from '#/server/routes/_shared/prns/prns-paths.js'

/**
 * Ordered column keys for the awaiting-acceptance PRNs table.
 * Each key doubles as the `prns.list.table.<key>` locale heading and the
 * property name of the matching cell on each row object.
 */
const COLUMN_KEYS = [
  'number',
  'material',
  'issuedAt',
  'decemberWaste',
  'issuer',
  'tonnage',
  'issuerNote'
]

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function decemberWasteText(locale, prn) {
  return prn.decemberWaste
    ? translate(locale, 'prns.list.yes')
    : translate(locale, 'prns.list.no')
}

function issuerNoteText(locale, prn) {
  const note = prn.additionalNotes?.trim()

  return note || translate(locale, 'prns.list.notProvided')
}

function resultsRange({ page, pageSize, count }) {
  if (count === 0) {
    return { from: 0, to: 0 }
  }

  const currentPage = Number.isInteger(page) && page > 0 ? page : 1
  const currentPageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : count
  const from = (currentPage - 1) * currentPageSize + 1

  return {
    from,
    to: from + count - 1
  }
}

function buildNumberCellHtml({ prn, viewHref, canMultiSelect, locale }) {
  const number = escapeHtml(prn.number)
  const link = `<a class="govuk-link" href="${viewHref}">${number}</a>`

  if (!canMultiSelect) {
    return link
  }

  const checkboxId = `prn-select-${escapeHtml(prn.id)}`
  const hint = escapeHtml(
    translate(locale, 'prns.list.selectPrnHiddenText', { number: prn.number })
  )

  return `<div class="govuk-checkboxes govuk-checkboxes--small" data-module="govuk-checkboxes">
  <div class="govuk-checkboxes__item">
    <input class="govuk-checkboxes__input" id="${checkboxId}" name="selectedPrnIds" type="checkbox" value="${escapeHtml(prn.id)}">
    <label class="govuk-label govuk-checkboxes__label" for="${checkboxId}">
      <span class="govuk-visually-hidden">${hint}</span>
      ${link}
    </label>
  </div>
</div>`
}

function prnDetailPath(userType, pathId, prnId, year) {
  return userType === 'cso'
    ? csoPrnPath(pathId, prnId, year)
    : producerPrnPath(pathId, prnId, year)
}

function buildRow({ prn, pathId, userType, locale, request, now }) {
  const year = request?.query?.year ?? prn.obligationYear
  const viewHref = withForwardedPrefix(
    request,
    prnDetailPath(userType, pathId, prn.id, year)
  )
  const canMultiSelect = canMultiSelectPrn(prn, { now })

  return {
    canMultiSelect,
    number: {
      html: buildNumberCellHtml({ prn, viewHref, canMultiSelect, locale })
    },
    material: { text: prn.material ?? '' },
    issuedAt: {
      text: prn.issuedAt ? formatDate(prn.issuedAt, 'dd MMM yyyy') : ''
    },
    decemberWaste: { text: decemberWasteText(locale, prn) },
    issuer: { text: prn.issuer?.organisationName ?? '' },
    tonnage: { text: prn.tonnage, format: 'numeric' },
    issuerNote: { text: issuerNoteText(locale, prn) }
  }
}

/**
 * Build the view model for the organisation PRNs/PERNs awaiting-acceptance list.
 *
 * @param {object} options
 * @param {Array} [options.prns]
 * @param {string} options.pathId
 * @param {'producer'|'cso'} options.userType
 * @param {string} [options.locale]
 * @param {object} [options.request]
 * @param {Date} [options.now]
 * @param {number} [options.page]
 * @param {number} [options.pageSize]
 */
export function buildPrnsViewModel({
  prns = [],
  pathId,
  userType,
  locale = 'en',
  request,
  now = new Date(),
  page,
  pageSize
} = {}) {
  const columns = COLUMN_KEYS.map((key) => ({
    key,
    heading: translate(locale, `prns.list.table.${key}`)
  }))
  const rows = prns.map((prn) =>
    buildRow({ prn, pathId, userType, locale, request, now })
  )
  const count = rows.length
  const { from: resultsFrom, to: resultsTo } = resultsRange({
    page,
    pageSize,
    count
  })

  return {
    classes: 'app-prns-table',
    columns,
    rows,
    count,
    resultsFrom,
    resultsTo,
    showAcceptSelectedButton: rows.some((row) => row.canMultiSelect)
  }
}
