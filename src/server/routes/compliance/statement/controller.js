import { REGULATION_43_URL } from '#/config/constants.js'
import { getRegulatorDetails } from '../_shared/regulator.js'
import { complianceRouteOptions } from '../_shared/compliance-route-options.js'
import * as middlewares from '../_middlewares/index.js'

export const statementController = {
  method: 'GET',
  path: '/compliance/{organisationId}/statement',
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

    return h.view('compliance/statement/index', {
      organisationId,
      year,
      regulatorEmail,
      regulation43Url: REGULATION_43_URL
    })
  }
}

export const statementRoutes = [statementController]
