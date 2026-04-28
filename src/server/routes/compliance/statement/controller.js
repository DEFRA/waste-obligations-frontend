import { getObligationYear } from '../_shared/year.js'
import { getRegulatorEmail } from '../_shared/regulator-email.js'

export const statementController = {
  handler(request, h) {
    const year = getObligationYear(request)
    const regulatorEmail = getRegulatorEmail('england')
    const { organisationId } = request.params

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
