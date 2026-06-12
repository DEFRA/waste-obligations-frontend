import { translate } from '#/server/common/helpers/i18n/translate.js'
import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'

/** Builds govukTable row data. Status cells mirror govukTag output (see renderObligationStatusTagHtml). */
export function buildCertificateObligationTableRows(rows, locale) {
  return rows.map((row) => [
    {
      text: translate(locale, row.materialKey, row.materialParams ?? {})
    },
    { text: String(row.obligationToMeet), format: 'numeric' },
    { text: String(row.awaitingAcceptance), format: 'numeric' },
    { text: String(row.accepted), format: 'numeric' },
    { text: String(row.outstanding), format: 'numeric' },
    { html: renderObligationStatusTagHtml(locale, row.tag) }
  ])
}
