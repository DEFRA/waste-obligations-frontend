import { translate } from '#/server/common/helpers/i18n/translate.js'
import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'

function outstandingCell(row) {
  if (row.status === 'NoDataYet') {
    return { text: '-', format: 'numeric' }
  }

  return { text: String(row.outstanding), format: 'numeric' }
}

/** Builds govukTable row data. Status cells mirror govukTag output (see renderObligationStatusTagHtml). */
export function buildCertificateObligationTableRows(rows, locale) {
  return rows.map((row) => [
    {
      text: translate(locale, row.materialKey, row.materialParams ?? {})
    },
    { text: String(row.obligationToMeet), format: 'numeric' },
    { text: String(row.awaitingAcceptance), format: 'numeric' },
    { text: String(row.accepted), format: 'numeric' },
    outstandingCell(row),
    { html: renderObligationStatusTagHtml(locale, row.tag) }
  ])
}
