import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import {
  buildOrganisationAddress,
  buildSubmitObligationTables,
  buildSubmitPageTitle
} from '#/server/routes/compliance/_shared/compliance-submit/view-model-base.js'
import {
  formatOrganisationName,
  formatSchemeOperatorName
} from '#/server/routes/compliance/_shared/compliance-submit/organisation-formatters.js'

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

  const complianceSchemeName = formatOrganisationName(organisation, year)
  const obligationTables = buildSubmitObligationTables(obligations, locale)

  return {
    locale,
    year,
    localeBase: 'compliance.statementSubmit',
    pageTitle: buildSubmitPageTitle(
      locale,
      'compliance.statementSubmit.pageTitle',
      formErrors
    ),
    regulatorName,
    regulatorEmail,
    overallStatus,
    ...obligationTables,
    complianceSchemeName,
    schemeOperatorName: formatSchemeOperatorName(organisation),
    organisationNumber,
    organisationAddress: buildOrganisationAddress(organisation),
    nameOnAccount: formatNameOnAccount(user),
    fullNameInput: fullNameInput ?? '',
    regulation43Input: regulation43Input ?? '',
    regulation43Url: regulation43Url ?? '',
    formErrors: formErrors ?? null,
    showRecyclingObligationsHeading: true
  }
}
