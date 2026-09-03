import { formatDate } from '#/config/nunjucks/filters/format-date.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { PRN_STATUS } from '#/server/services/schemas/waste-obligations.schemas.js'

const PRN_STATUS_LOCALE_KEY = {
  [PRN_STATUS.AWAITING_ACCEPTANCE]: 'awaitingAcceptance',
  [PRN_STATUS.ACCEPTED]: 'accepted',
  [PRN_STATUS.REJECTED]: 'rejected',
  [PRN_STATUS.CANCELLED]: 'cancelled'
}

/**
 * Ordered column keys for the PRNs table. Each key doubles as:
 * - the `prns.list.table.<key>` locale key used for the column heading
 * - the property name of the matching cell on each row object
 *
 * The view iterates these columns to build both the table head and the
 * ordered cells for every row, so the heading order always matches the
 * cell order.
 */
const COLUMN_KEYS = [
  'number',
  'type',
  'status',
  'material',
  'tonnage',
  'issuedAt',
  'issuer',
  'view'
]

function statusText(locale, prn) {
  const statusKey = PRN_STATUS_LOCALE_KEY[prn.status]

  return statusKey
    ? translate(locale, `prns.prn.statusTypes.${statusKey}`)
    : prn.status
}

function buildRow({ prn, pathId, userType, locale, request }) {
  const viewHref = withForwardedPrefix(
    request,
    `/organisations/${userType}/${pathId}/prns/${prn.id}?year=${prn.obligationYear}`
  )

  return {
    number: { text: prn.number },
    type: { text: prn.type },
    status: { text: statusText(locale, prn) },
    material: { text: prn.material },
    tonnage: { text: prn.tonnage },
    issuedAt: {
      text: prn.issuedAt ? formatDate(prn.issuedAt, 'dd MMM yyyy') : ''
    },
    issuer: { text: prn.issuer?.organisationName ?? '' },
    view: {
      html: `<a class="govuk-link" href="${viewHref}">${translate(
        locale,
        'prns.list.table.view'
      )}</a>`
    }
  }
}

/**
 * Build the view model for the organisation PRNs/PERNs list.
 *
 * Returns the table `classes`, an ordered list of `columns`
 * (`{ key, heading }`), `rows` (objects keyed by column key whose values
 * are govukTable cells) and the row `count`. The view builds the govukTable
 * head and rows by iterating `columns`.
 */
export function buildPrnsViewModel({
  prns = [],
  pathId,
  userType,
  locale = 'en',
  request
} = {}) {
  const columns = COLUMN_KEYS.map((key) => ({
    key,
    heading: translate(locale, `prns.list.table.${key}`)
  }))
  const rows = prns.map((prn) =>
    buildRow({ prn, pathId, userType, locale, request })
  )

  return {
    classes: 'app-prns-table',
    columns,
    rows,
    count: rows.length
  }
}
