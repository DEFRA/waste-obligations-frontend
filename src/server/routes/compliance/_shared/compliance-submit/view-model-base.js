import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'

import { formatOrganisationAddress } from './organisation-formatters.js'

export function buildSubmitObligationTables(
  obligations,
  locale,
  pageLocaleBase
) {
  const { obligationsRows, glassRows } = presentObligationsForCertificateSubmit(
    obligations,
    {
      locale,
      pageLocaleBase
    }
  )

  return {
    obligationsTableRows: buildCertificateObligationTableRows(
      obligationsRows,
      locale
    ),
    glassTableRows: buildCertificateObligationTableRows(glassRows, locale)
  }
}

export function buildSubmitPageTitle(locale, pageTitleKey, formErrors) {
  const pageTitle = translate(locale, pageTitleKey)

  return formErrors ? `Error: ${pageTitle}` : pageTitle
}

export function buildOrganisationAddress(organisation) {
  return formatOrganisationAddress(organisation?.address)
}
