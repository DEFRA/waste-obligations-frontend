import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'

import {
  buildStatementSubmitDeclarationText,
  formatComplianceSchemeName,
  formatOrganisationAddress,
  formatSchemeOperatorName
} from './utils.js'

export function buildStatementSubmitViewModel(
  request,
  cachedPayload,
  options = {}
) {
  const { formErrors, fullNameInput, regulation43Input, regulation43Url } =
    options
  const locale = getLocale(request)
  const { year } = request.query
  const user = request.yar.get('user')
  const {
    organisation,
    obligations,
    obligationStatus: overallStatus,
    regulatorName,
    regulatorEmail,
    organisationNumber
  } = cachedPayload

  const { obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(obligations)
  const complianceSchemeName = formatComplianceSchemeName(organisation, year)
  const declarationText = buildStatementSubmitDeclarationText(
    locale,
    complianceSchemeName
  )
  const basePageTitle = translate(
    locale,
    'compliance.statementSubmit.pageTitle'
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
    complianceSchemeName,
    schemeOperatorName: formatSchemeOperatorName(organisation),
    organisationNumber,
    organisationAddress: formatOrganisationAddress(organisation?.address),
    declarationText,
    nameOnAccount: formatNameOnAccount(user),
    fullNameInput: fullNameInput ?? '',
    regulation43Input: regulation43Input ?? '',
    regulation43Url: regulation43Url ?? '',
    formErrors: formErrors ?? null
  }
}
