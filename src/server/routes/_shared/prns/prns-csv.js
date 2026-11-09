import { formatDate } from '#/config/nunjucks/filters/format-date.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { PRN_STATUS } from '#/server/services/schemas/waste-obligations.schemas.js'

const CSV_DATE_FORMAT = 'dd/MM/yyyy'
const FORMULA_PREFIX = /^[=+\-@\t\r]/
const NEEDS_QUOTING = /[",\r\n]/

const STATUS_KEYS = Object.freeze({
  [PRN_STATUS.AWAITING_ACCEPTANCE]: 'awaitingAcceptance',
  [PRN_STATUS.ACCEPTED]: 'accepted',
  [PRN_STATUS.REJECTED]: 'rejected',
  [PRN_STATUS.CANCELLED]: 'cancelled'
})

const MATERIAL_KEYS = Object.freeze({
  Aluminium: 'aluminium',
  Glass: 'glassOther',
  GlassRemelt: 'glassRemelt',
  Paper: 'paper',
  Fibre: 'fibre',
  Plastic: 'plastic',
  Steel: 'steel',
  Wood: 'wood'
})

const COLUMNS = Object.freeze([
  'prnOrPernNumber',
  'prnOrPern',
  'status',
  'issuedBy',
  'issuedTo',
  'accreditationNumber',
  'dateIssued',
  'decemberWaste',
  'obligationYear',
  'material',
  'recyclingProcess',
  'tonnes',
  'dateAccepted',
  'dateCancelled',
  'issuerNote'
])

/**
 * One CSV cell. Text starting with a spreadsheet formula character is prefixed
 * with an apostrophe so a spreadsheet shows it as text rather than running it.
 * Numbers are written as they are.
 *
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function csvCell(value) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return String(value)
  }

  const text = FORMULA_PREFIX.test(value) ? `'${value}` : value

  return NEEDS_QUOTING.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function materialName(locale, material) {
  if (!material) {
    return ''
  }

  const key = MATERIAL_KEYS[material]

  return key ? translate(locale, `prns.list.material.${key}`) : material
}

function csvDate(value) {
  return value ? formatDate(value, CSV_DATE_FORMAT) : ''
}

function rowFor(prn, locale) {
  const t = (key) => translate(locale, `prns.csv.${key}`)
  const status = prn.status
  const statusKey = STATUS_KEYS[status]

  return [
    prn.number,
    prn.type,
    statusKey ? t(`status.${statusKey}`) : (status ?? ''),
    prn.issuer?.organisationName,
    prn.recipient?.displayName ?? prn.recipient?.name,
    prn.accreditationNumber,
    csvDate(prn.issuedAt),
    t(prn.decemberWaste ? 'yes' : 'no'),
    prn.obligationYear,
    materialName(locale, prn.material),
    prn.recyclingProcess,
    prn.tonnage ?? 0,
    status === PRN_STATUS.ACCEPTED
      ? csvDate(prn.audit?.acceptedAt)
      : t('notAccepted'),
    status === PRN_STATUS.CANCELLED
      ? csvDate(prn.audit?.cancelledAt)
      : t('notCancelled'),
    prn.additionalNotes?.trim() ? prn.additionalNotes : t('notProvided')
  ]
}

/**
 * The CSV of a list of PRNs and PERNs, with the same columns as the Packaging
 * service's download. Returns an empty string when there are none.
 *
 * @param {object[]} prns
 * @param {string} locale
 * @returns {string}
 */
export function buildPrnsCsv(prns, locale) {
  if (prns.length === 0) {
    return ''
  }

  const header = COLUMNS.map((column) =>
    csvCell(translate(locale, `prns.csv.columns.${column}`))
  )
  const lines = [header, ...prns.map((prn) => rowFor(prn, locale).map(csvCell))]

  return `${lines.map((line) => line.join(',')).join('\r\n')}\r\n`
}
