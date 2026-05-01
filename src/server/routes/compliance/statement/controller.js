import { getRegulatorEmail } from '../_shared/regulator-email.js'

export const statementController = {
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const regulatorEmail = getRegulatorEmail(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/statement/index', {
      pageTitle: 'About your statement of compliance',
      heading: 'About your statement of compliance',
      organisationId,
      year,
      regulatorEmail,
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
  }
}
