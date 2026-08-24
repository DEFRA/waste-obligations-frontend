import { formatDate } from '#/config/nunjucks/filters/format-date.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

const PRN_STATUS_LOCALE_KEY = {
  AwaitingAcceptance: 'awaitingAcceptance',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Cancelled: 'cancelled'
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
 * View model for the organisation PRNs/PERNs list.
 *
 * Exposes the table `classes`, an ordered list of `columns`
 * (`{ key, heading }`) and `rows` (objects keyed by column key whose values
 * are govukTable cells). The view builds the govukTable head and rows by
 * iterating `columns`.
 */
export class PrnsViewModel {
  constructor({ prns = [], pathId, userType, locale = 'en', request } = {}) {
    this.classes = 'app-prns-table'
    this.columns = COLUMN_KEYS.map((key) => ({
      key,
      heading: translate(locale, `prns.list.table.${key}`)
    }))
    this.rows = prns.map((prn) =>
      buildRow({ prn, pathId, userType, locale, request })
    )
  }

  get count() {
    return this.rows.length
  }
}
