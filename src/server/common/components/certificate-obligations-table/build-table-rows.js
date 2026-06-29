import { translate } from '#/server/common/helpers/i18n/translate.js'
import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'

const NUMERIC_NO_DATA = { text: '-', format: 'numeric' }

function numericCell(row, value) {
  if (row.status === 'NoDataYet') {
    return NUMERIC_NO_DATA
  }

  return { text: String(value), format: 'numeric' }
}

/** Builds govukTable row data. Status cells mirror govukTag output (see renderObligationStatusTagHtml). */
export function buildCertificateObligationTableRows(rows, locale) {
  return rows.map((row) => [
    {
      text: translate(locale, row.materialKey, row.materialParams ?? {})
    },
    numericCell(row, row.obligationToMeet),
    numericCell(row, row.awaitingAcceptance),
    numericCell(row, row.accepted),
    numericCell(row, row.outstanding),
    { html: renderObligationStatusTagHtml(locale, row.tag) }
  ])
}
