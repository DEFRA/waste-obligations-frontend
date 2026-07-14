import {
  resolveComponentLocaleKey,
  translate
} from '#/server/common/helpers/i18n/translate.js'
import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'

/** Matches epr-packaging `_prnMaterialTable` null-cell markup. */
function numericOrNotAvailableYetCell(value, notAvailableYetLabel) {
  if (value == null) {
    return {
      html: `<span class="govuk-visually-hidden">${notAvailableYetLabel}</span><span aria-hidden="true">-</span>`,
      format: 'numeric'
    }
  }

  return { text: String(value), format: 'numeric' }
}

/** Builds govukTable row data. Status cells mirror govukTag output (see renderObligationStatusTagHtml). */
export function buildCertificateObligationTableRows(rows, locale) {
  const notAvailableYetLabel = translate(
    locale,
    resolveComponentLocaleKey(
      locale,
      null,
      'obligationsTable',
      'notAvailableYet'
    )
  )

  return rows.map((row) => {
    const statusHtml = renderObligationStatusTagHtml(locale, row.tag)

    return [
      {
        text: translate(locale, row.materialKey, row.materialParams ?? {})
      },
      numericOrNotAvailableYetCell(row.obligationToMeet, notAvailableYetLabel),
      { text: String(row.awaitingAcceptance ?? 0), format: 'numeric' },
      { text: String(row.accepted ?? 0), format: 'numeric' },
      numericOrNotAvailableYetCell(row.outstanding, notAvailableYetLabel),
      { html: statusHtml }
    ]
  })
}
