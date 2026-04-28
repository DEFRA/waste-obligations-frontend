import { getReportingYear } from '../_shared/year.js'
import { getRegulatorEmail } from '../_shared/regulator-email.js'

export const certificateController = {
  handler(request, h) {
    const year = getReportingYear(request)
    const regulatorEmail = getRegulatorEmail('england')
    const { organisationId } = request.params

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
