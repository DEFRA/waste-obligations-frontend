import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { formatNameOnAccount } from '#/server/routes/_shared/compliance/name-on-account.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  buildOrganisationAddress,
  buildSubmitObligationTables,
  buildSubmitPageTitle
} from '#/server/routes/_shared/compliance/compliance-submit/view-model-base.js'
import {
  formatOrganisationName,
  formatSchemeOperatorName
} from '#/server/routes/_shared/compliance/compliance-submit/organisation-formatters.js'

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
    regulatorName,
    regulatorEmail,
    organisationNumber
  } = cachedPayload
  const { nameWithArticle } = getRegulatorDetails(
    organisation?.businessCountry,
    locale
  )

  const complianceSchemeName = formatOrganisationName(organisation, year)
  const obligationTables = buildSubmitObligationTables(
    obligations,
    locale,
    'compliance.statementSubmit'
  )

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
    regulatorNameWithArticle: nameWithArticle,
    regulatorEmail,
    ...obligationTables,
    complianceSchemeName,
    schemeOperatorName: formatSchemeOperatorName(organisation),
    organisationNumber,
    organisationAddress: buildOrganisationAddress(organisation),
    nameOnAccount: formatNameOnAccount(user),
    fullNameInput: fullNameInput ?? '',
    regulation43Input: regulation43Input ?? '',
    regulation43Url: regulation43Url ?? '',
    formErrors: formErrors ?? null
  }
}
