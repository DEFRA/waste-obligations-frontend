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

export const ALL_COLUMNS = Object.freeze([
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

const COMPLIANCE_ONLY_COLUMNS = new Set(['dateIssued', 'obligationYear'])

/** The columns of the Manage Obligations download: all but the two the compliance record download adds. */
export const OBLIGATIONS_COLUMNS = Object.freeze(
  ALL_COLUMNS.filter((column) => !COMPLIANCE_ONLY_COLUMNS.has(column))
)

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

// The API does not send acceptedAt for every PRN yet. An accepted PRN's last
// update is the nearest date it holds, so use that when acceptedAt is missing.
function acceptedDate(prn) {
  return prn.audit?.acceptedAt ?? prn.audit?.updatedAt
}

function cancelledDate(prn) {
  return prn.audit?.cancelledAt ?? prn.audit?.updatedAt
}

function cellGetters(prn, locale) {
  const t = (key) => translate(locale, `prns.csv.${key}`)
  const status = prn.status
  const statusKey = STATUS_KEYS[status]

  return {
    prnOrPernNumber: () => prn.number,
    prnOrPern: () => prn.type,
    status: () => (statusKey ? t(`status.${statusKey}`) : (status ?? '')),
    issuedBy: () => prn.issuer?.organisationName,
    issuedTo: () => prn.recipient?.displayName ?? prn.recipient?.name,
    accreditationNumber: () => prn.accreditationNumber,
    dateIssued: () => csvDate(prn.issuedAt),
    decemberWaste: () => t(prn.decemberWaste ? 'yes' : 'no'),
    obligationYear: () => prn.obligationYear,
    material: () => materialName(locale, prn.material),
    recyclingProcess: () => prn.recyclingProcess,
    tonnes: () => prn.tonnage ?? 0,
    dateAccepted: () =>
      status === PRN_STATUS.ACCEPTED
        ? csvDate(acceptedDate(prn))
        : t('notAccepted'),
    dateCancelled: () =>
      status === PRN_STATUS.CANCELLED
        ? csvDate(cancelledDate(prn))
        : t('notCancelled'),
    issuerNote: () =>
      prn.additionalNotes?.trim() ? prn.additionalNotes : t('notProvided')
  }
}

/**
 * The CSV of a list of PRNs and PERNs, with the same columns as the Packaging
 * service's download. Returns an empty string when there are none.
 *
 * @param {object[]} prns
 * @param {string} locale
 * @param {readonly string[]} [columns] The columns to write, in order.
 * @returns {string}
 */
export function buildPrnsCsv(prns, locale, columns = ALL_COLUMNS) {
  if (prns.length === 0) {
    return ''
  }

  const header = columns.map((column) =>
    csvCell(translate(locale, `prns.csv.columns.${column}`))
  )
  const lines = [
    header,
    ...prns.map((prn) => {
      const getters = cellGetters(prn, locale)

      return columns.map((column) => csvCell(getters[column]()))
    })
  ]

  return `${lines.map((line) => line.join(',')).join('\r\n')}\r\n`
}
