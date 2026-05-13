import { getRegulatorDetails } from '../_shared/regulator.js'
import { complianceRouteOptions } from '../_shared/compliance-route-options.js'
import * as middlewares from '../_middlewares/index.js'

export const certificateController = {
  method: 'GET',
  path: '/compliance/{organisationId}/certificate',
  options: {
    ...complianceRouteOptions,
    pre: [middlewares.organisation]
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const { year } = request.query
    const { email: regulatorEmail } = getRegulatorDetails(
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

export const certificateRoutes = [certificateController]
