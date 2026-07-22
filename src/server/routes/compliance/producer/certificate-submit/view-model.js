import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import { getRegulatorDetailsByName } from '#/server/routes/compliance/_shared/regulator.js'
import {
  buildOrganisationAddress,
  buildSubmitObligationTables,
  buildSubmitPageTitle
} from '#/server/routes/compliance/_shared/compliance-submit/view-model-base.js'
import { formatOrganisationName } from '#/server/routes/compliance/_shared/compliance-submit/organisation-formatters.js'

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
  const { the } = getRegulatorDetailsByName(regulatorName, locale)

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
    the,
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
