import { getRegulatorDetails } from '../_shared/regulator.js'
import { PUBLIC_REGISTER_URL } from '#/config/constants.js'

function getApprovedUserEmail(request) {
  return request?.query?.email ?? ''
}

function formatObligationStatus(status) {
  if (!status) {
    return ''
  }
  if (status === 'met') {
    return 'Met'
  }
  if (status === 'not_met') {
    return 'Not met'
  }
  return status
}

export const certificateSuccessController = {
  async handler(request, h) {
    const { year, status } = request.query
    const { organisationId } = request.params
    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/certificate-success/index', {
      pageTitle: 'Certificate success',
      organisationId,
      year,
      obligationStatus: formatObligationStatus(status),
      approvedUserEmail: getApprovedUserEmail(request),
      regulatorName: regulator.name,
      regulatorEmail: regulator.email,
      publicRegisterUrl: PUBLIC_REGISTER_URL,
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}
