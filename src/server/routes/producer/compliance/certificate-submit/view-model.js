import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { formatNameOnAccount } from '#/server/routes/_shared/compliance/name-on-account.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  buildOrganisationAddress,
  buildSubmitObligationTables,
  buildSubmitPageTitle
} from '#/server/routes/_shared/compliance/compliance-submit/view-model-base.js'
import { formatOrganisationName } from '#/server/routes/_shared/compliance/compliance-submit/organisation-formatters.js'

export function buildCertificateSubmitViewModel(
  request,
  cachedPayload,
  options = {}
) {
  const { formErrors, fullNameInput } = options
  const locale = getLocale(request)
  const { year } = request.query
  const user = request.yar.get('user')
  const { organisation, obligations, regulatorName, regulatorEmail } =
    cachedPayload
  const { nameWithArticle } = getRegulatorDetails(
    organisation?.businessCountry,
    locale
  )

  const organisationName = formatOrganisationName(organisation, year)
  const obligationTables = buildSubmitObligationTables(
    obligations,
    locale,
    'compliance.certificateSubmit'
  )

  return {
    locale,
    year,
    localeBase: 'compliance.certificateSubmit',
    pageTitle: buildSubmitPageTitle(
      locale,
      'compliance.certificateSubmit.pageTitle',
      formErrors
    ),
    regulatorName,
    regulatorNameWithArticle: nameWithArticle,
    regulatorEmail,
    ...obligationTables,
    organisationName,
    organisationNumber: request.pre.currentOrganisation.organisationNumber,
    organisationAddress: buildOrganisationAddress(organisation),
    nameOnAccount: formatNameOnAccount(user),
    fullNameInput: fullNameInput ?? '',
    formErrors: formErrors ?? null
  }
}
