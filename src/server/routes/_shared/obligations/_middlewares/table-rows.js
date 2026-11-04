import { renderObligationStatusTagHtml } from '#/server/common/components/obligation-status-tag/render-obligation-status-tag.js'
import {
  resolveComponentLocaleKey,
  translate
} from '#/server/common/helpers/i18n/translate.js'
import { obligationMaterialAriaLabelKey } from '#/server/routes/_shared/obligations/obligation-materials.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'

/**
 * A material's link, named for screen readers as the Azure page names it: the
 * hidden text says which page the link opens.
 */
function materialLinkHtml({
  href,
  materialName,
  ariaLabelKey,
  locale,
  labelId
}) {
  const label = translate(
    locale,
    `obligations.material.ariaLabels.${ariaLabelKey}`
  )
  const hiddenLabel = `<span id="${labelId}" class="govuk-visually-hidden">${label}</span>`
  const link = `<strong><a class="govuk-link" href="${href}" aria-labelledby="${labelId}">${materialName}</a></strong>`

  return hiddenLabel + link
}

/** Manage Obligations design uses red for Not met (certificate pages keep yellow). */
function withManageObligationsTagColour(tag) {
  if (tag?.variant !== 'yellow') {
    return tag
  }

  return { ...tag, variant: 'red' }
}

function numericOrDashCell(value, notAvailableYetLabel) {
  if (value == null) {
    return {
      html: `<span class="govuk-visually-hidden">${notAvailableYetLabel}</span><span aria-hidden="true">-</span>`,
      format: 'numeric'
    }
  }

  return { text: String(value), format: 'numeric' }
}

/**
 * Builds table rows matching the packaging Manage Obligations look:
 * bold material names styled as links to their calculation page (`materialHref`
 * returns the page for a row; no link where it returns nothing), red/green/grey
 * status tags, bold totals row.
 */
export function buildManageObligationsTableRows(
  rows,
  locale,
  materialHref = () => undefined,
  pageLocaleBase = null,
  idPrefix = 'material-link-label'
) {
  const notAvailableYetLabel = translate(
    locale,
    resolveComponentLocaleKey(
      locale,
      pageLocaleBase,
      'obligationsTable',
      'notAvailableYet'
    )
  )

  return rows.map((row, index) => {
    const materialName = translate(
      locale,
      row.materialKey,
      row.materialParams ?? {}
    )
    const isTotals = row.isTotals === true || row.material === 'Totals'
    const tag = withManageObligationsTagColour(row.tag)
    const boldClass = isTotals ? 'govuk-!-font-weight-bold' : undefined
    const href = isTotals ? undefined : materialHref(row)
    const ariaLabelKey = obligationMaterialAriaLabelKey(row.material)

    const obligationCell = numericOrDashCell(
      row.obligationToMeet,
      notAvailableYetLabel
    )
    const outstandingCell = numericOrDashCell(
      row.outstanding,
      notAvailableYetLabel
    )

    return [
      {
        html: href
          ? materialLinkHtml({
              href,
              materialName,
              ariaLabelKey,
              locale,
              labelId: `${idPrefix}-${index}`
            })
          : `<strong>${materialName}</strong>`
      },
      { ...obligationCell, classes: boldClass },
      {
        text: String(row.awaitingAcceptance ?? 0),
        format: 'numeric',
        classes: boldClass
      },
      {
        text: String(row.accepted ?? 0),
        format: 'numeric',
        classes: boldClass
      },
      { ...outstandingCell, classes: boldClass },
      { html: renderObligationStatusTagHtml(locale, tag) }
    ]
  })
}

export function buildObligationTables(obligations, locale, materialHref) {
  const { obligationsRows, glassRows } = presentObligationsForCertificateSubmit(
    obligations,
    {
      locale,
      pageLocaleBase: null,
      dashWhenNoData: true
    }
  )

  return {
    obligationsTableRows: buildManageObligationsTableRows(
      obligationsRows,
      locale,
      materialHref
    ),
    glassTableRows: buildManageObligationsTableRows(
      glassRows,
      locale,
      materialHref
    )
  }
}
