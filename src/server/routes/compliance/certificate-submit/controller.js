import { getRegulatorDetails } from '../_shared/regulator.js'
import { getMockObligations } from './mock-obligations.js'

function formatOrganisationAddress(org) {
  const address =
    org?.address ??
    org?.registeredAddress ??
    org?.businessAddress ??
    org?.primaryAddress ??
    null

  if (!address) {
    return ''
  }

  if (typeof address === 'string') {
    return address
  }

  const parts = [
    address?.buildingName,
    address?.buildingNumber,
    address?.street,
    address?.locality,
    address?.town,
    address?.county,
    address?.postcode
  ]
    .filter(Boolean)
    .map((p) => p.toString().trim())
    .filter(Boolean)

  return parts.join(', ')
}

function getOrganisationDisplayModel({ organisationId, organisation }) {
  const organisationName =
    organisation?.name ??
    organisation?.organisationName ??
    organisation?.companyName ??
    ''

  const organisationIdentifier =
    organisation?.organisationId ??
    organisation?.reference ??
    organisation?.id ??
    organisationId

  return {
    organisationName,
    organisationIdentifier,
    organisationAddress: formatOrganisationAddress(organisation)
  }
}

export const certificateSubmitController = {
  async handler(request, h) {
    const { organisationId } = request.params
    const { year, mock } = request.query
    const organisation = request.pre?.organisation
    const regulator = getRegulatorDetails(organisation?.businessCountry)

    const mockOverall = mock === 'not_met' ? 'not_met' : 'met'
    const { overallStatus, obligationsRows, glassRows } = getMockObligations({
      overall: mockOverall
    })

    const orgModel = getOrganisationDisplayModel({
      organisationId,
      organisation
    })

    return h.view('compliance/certificate-submit/index', {
      pageTitle: 'Check and submit your certificate of compliance',
      heading: `Check and submit your ${year} certificate of compliance`,
      organisationId,
      year,
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      overallStatus,
      obligationsRows,
      glassRows,
      ...orgModel,
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}

export const certificateSubmitPostController = {
  async handler(request, h) {
    const { organisationId } = request.params
    const { year, mock } = request.query

    // API integration will replace this (MO-117 / MO-147).
    const mockOverall = mock === 'not_met' ? 'not_met' : 'met'
    const { overallStatus } = getMockObligations({ overall: mockOverall })

    return h.redirect(
      `/compliance/${organisationId}/certificate/success?year=${encodeURIComponent(
        year
      )}&status=${encodeURIComponent(overallStatus)}`
    )
  }
}
