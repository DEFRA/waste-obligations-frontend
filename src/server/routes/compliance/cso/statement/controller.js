import { REGULATION_43_URL } from '#/config/constants.js'
import { getRegulatorDetails } from '../../_shared/regulator.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '../../_shared/compliance-route-options.js'
import * as middlewares from '../../_middlewares/index.js'

export const statementController = {
  method: 'GET',
  // schemeId and organisationId are interchangeable in this context
  path: '/compliance/cso/{schemeId}/statement',
  options: {
    ...csoComplianceRouteOptions,
    pre: csoCompliancePre(middlewares.organisation)
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const { year } = request.query
    const { name: regulatorName, email: regulatorEmail } = getRegulatorDetails(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/cso/statement/index', {
      schemeId,
      year,
      regulatorName,
      regulatorEmail,
      regulation43Url: REGULATION_43_URL
    })
  }
}

export const statementRoutes = [statementController]
