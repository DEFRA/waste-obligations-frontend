import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'

import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import {
  buildCertificateSubmitDeclarationText,
  formatOrganisationAddress,
  formatOrganisationName
} from './utils.js'

export function buildCertificateSubmitViewModel(
  request,
  cachedPayload,
  options = {}
) {
  const { formErrors, fullNameInput } = options
  const locale = getLocale(request)
  const { year } = request.query
  const user = request.yar.get('user')
  const {
    organisation,
    obligations,
    obligationStatus: overallStatus,
    regulatorName,
    regulatorEmail
  } = cachedPayload

  const { obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(obligations)
  const organisationName = formatOrganisationName(organisation, year)
  const declarationText = buildCertificateSubmitDeclarationText(
    locale,
    organisationName
  )
  const basePageTitle = translate(
    locale,
    'compliance.certificateSubmit.pageTitle'
  )

  return {
    locale,
    year,
    pageTitle: formErrors ? `Error: ${basePageTitle}` : basePageTitle,
    regulatorName,
    regulatorEmail,
    overallStatus,
    obligationsTableRows: buildCertificateObligationTableRows(
      obligationsRows,
      locale
    ),
    glassTableRows: buildCertificateObligationTableRows(glassRows, locale),
    organisationName,
    organisationNumber: request.pre.currentOrganisation.organisationNumber,
    organisationAddress: formatOrganisationAddress(organisation?.address),
    declarationText,
    nameOnAccount: formatNameOnAccount(user),
    fullNameInput: fullNameInput ?? '',
    formErrors: formErrors ?? null
  }
}
