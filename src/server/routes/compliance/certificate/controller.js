import { getRegulatorEmail } from '../_shared/regulator-email.js'

export const certificateController = {
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const regulatorEmail = getRegulatorEmail(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/certificate/index', {
      pageTitle: 'About your certificate of compliance',
      heading: 'About your certificate of compliance',
      organisationId,
      year,
      regulatorEmail,
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}
